// WebRTC streaming with WebSocket signaling for cross-browser support
export class WebRTCStreamer {
  private peerConnection: RTCPeerConnection | null = null;
  private ws: WebSocket | null = null;
  private streamId: string;
  private onStreamCallback?: (stream: MediaStream) => void;
  private localStream?: MediaStream;
  private role: 'broadcaster' | 'viewer' | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: NodeJS.Timeout | null = null;

  // Signaling server URL - use environment variable or default to localhost
  private signalingUrl: string;

  constructor(streamId: string) {
    this.streamId = streamId;
    this.signalingUrl = process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://localhost:8080';
  }

  private connectWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`[${this.streamId}] Connecting to signaling server: ${this.signalingUrl}`);
        this.ws = new WebSocket(this.signalingUrl);

        this.ws.onopen = () => {
          console.log(`[${this.streamId}] Connected to signaling server`);
          this.reconnectAttempts = 0;
          resolve();
        };

        this.ws.onclose = () => {
          console.log(`[${this.streamId}] Disconnected from signaling server`);
          this.handleDisconnect();
        };

        this.ws.onerror = (error) => {
          console.error(`[${this.streamId}] WebSocket error:`, error);
          reject(error);
        };

        this.ws.onmessage = (event) => {
          this.handleSignalingMessage(JSON.parse(event.data));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private handleDisconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts && this.role) {
      this.reconnectAttempts++;
      console.log(`[${this.streamId}] Attempting reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);

      this.reconnectTimeout = setTimeout(async () => {
        try {
          await this.connectWebSocket();
          // Re-join with same role
          if (this.role === 'broadcaster' && this.localStream) {
            this.sendMessage({ type: 'join-as-broadcaster', streamId: this.streamId });
          } else if (this.role === 'viewer') {
            this.sendMessage({ type: 'join-as-viewer', streamId: this.streamId });
          }
        } catch (error) {
          console.error(`[${this.streamId}] Reconnect failed:`, error);
        }
      }, 2000 * this.reconnectAttempts);
    }
  }

  private sendMessage(message: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ ...message, streamId: this.streamId }));
    } else {
      console.warn(`[${this.streamId}] WebSocket not open, cannot send message`);
    }
  }

  private async handleSignalingMessage(message: { type: string; data?: any; viewerId?: string }) {
    console.log(`[${this.streamId}] Received signaling message:`, message.type);

    switch (message.type) {
      case 'broadcaster-available':
        // Broadcaster is ready, request the stream
        console.log(`[${this.streamId}] Broadcaster available, requesting stream`);
        this.sendMessage({ type: 'request-stream' });
        break;

      case 'broadcaster-left':
        console.log(`[${this.streamId}] Broadcaster left`);
        if (this.peerConnection) {
          this.peerConnection.close();
          this.peerConnection = null;
        }
        break;

      case 'viewer-request':
        // A viewer wants the stream
        if (this.role === 'broadcaster' && this.localStream) {
          console.log(`[${this.streamId}] Viewer requested stream, creating offer`);
          await this.createOfferForViewer(message.viewerId);
        }
        break;

      case 'offer':
        await this.handleOffer(message.data);
        break;

      case 'answer':
        await this.handleAnswer(message.data);
        break;

      case 'ice-candidate':
        await this.handleIceCandidate(message.data);
        break;
    }
  }

  private createPeerConnection() {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onconnectionstatechange = () => {
      console.log(`[${this.streamId}] Connection state:`, this.peerConnection?.connectionState);
    };

    this.peerConnection.oniceconnectionstatechange = () => {
      console.log(`[${this.streamId}] ICE connection state:`, this.peerConnection?.iceConnectionState);
    };

    this.peerConnection.onicegatheringstatechange = () => {
      console.log(`[${this.streamId}] ICE gathering state:`, this.peerConnection?.iceGatheringState);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[${this.streamId}] Sending ICE candidate`);
        this.sendMessage({
          type: 'ice-candidate',
          data: event.candidate.toJSON()
        });
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log(`[${this.streamId}] Received remote track:`, event.track.kind);
      if (this.onStreamCallback && event.streams[0]) {
        this.onStreamCallback(event.streams[0]);
      }
    };

    return this.peerConnection;
  }

  async startBroadcast(stream: MediaStream) {
    console.log(`[${this.streamId}] Starting broadcast...`);
    console.log(`[${this.streamId}] Stream tracks:`, stream.getTracks().map(t => `${t.kind} (${t.readyState})`));

    this.localStream = stream;
    this.role = 'broadcaster';

    if (stream.getTracks().length === 0) {
      console.error(`[${this.streamId}] No tracks in stream!`);
      return;
    }

    try {
      await this.connectWebSocket();
      this.sendMessage({ type: 'join-as-broadcaster', streamId: this.streamId });
      console.log(`[${this.streamId}] Broadcast ready, waiting for viewers`);
    } catch (error) {
      console.error(`[${this.streamId}] Failed to connect to signaling server:`, error);
    }
  }

  private async createOfferForViewer(viewerId?: string) {
    if (!this.localStream) {
      console.error(`[${this.streamId}] No local stream for offer`);
      return;
    }

    // Close existing connection
    if (this.peerConnection) {
      this.peerConnection.close();
    }

    const pc = this.createPeerConnection();

    // Add all tracks
    this.localStream.getTracks().forEach(track => {
      console.log(`[${this.streamId}] Adding track:`, track.kind, track.readyState);
      pc.addTrack(track, this.localStream!);
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log(`[${this.streamId}] Offer created, sending to viewer`);
      this.sendMessage({
        type: 'offer',
        data: offer,
        targetViewerId: viewerId
      });
    } catch (error) {
      console.error(`[${this.streamId}] Error creating offer:`, error);
    }
  }

  async startViewing(onStream: (stream: MediaStream) => void) {
    console.log(`[${this.streamId}] Starting viewing...`);
    this.onStreamCallback = onStream;
    this.role = 'viewer';

    try {
      await this.connectWebSocket();
      this.createPeerConnection();
      this.sendMessage({ type: 'join-as-viewer', streamId: this.streamId });
      console.log(`[${this.streamId}] Joined as viewer, waiting for broadcaster`);
    } catch (error) {
      console.error(`[${this.streamId}] Failed to connect to signaling server:`, error);
    }
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    console.log(`[${this.streamId}] Handling offer...`);
    if (!this.peerConnection) {
      this.createPeerConnection();
    }

    try {
      await this.peerConnection!.setRemoteDescription(offer);
      console.log(`[${this.streamId}] Remote description set`);

      const answer = await this.peerConnection!.createAnswer();
      await this.peerConnection!.setLocalDescription(answer);

      this.sendMessage({
        type: 'answer',
        data: answer
      });
      console.log(`[${this.streamId}] Answer sent`);
    } catch (error) {
      console.error(`[${this.streamId}] Error handling offer:`, error);
    }
  }

  private async handleAnswer(answer: RTCSessionDescriptionInit) {
    console.log(`[${this.streamId}] Handling answer...`);
    if (!this.peerConnection) {
      console.error(`[${this.streamId}] No peer connection for answer`);
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(answer);
      console.log(`[${this.streamId}] Remote description set from answer`);
    } catch (error) {
      console.error(`[${this.streamId}] Error handling answer:`, error);
    }
  }

  private async handleIceCandidate(candidate: RTCIceCandidateInit) {
    console.log(`[${this.streamId}] Handling ICE candidate...`);
    if (!this.peerConnection) {
      console.error(`[${this.streamId}] No peer connection for ICE candidate`);
      return;
    }

    try {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      console.log(`[${this.streamId}] ICE candidate added`);
    } catch (error) {
      console.error(`[${this.streamId}] Error adding ICE candidate:`, error);
    }
  }

  stopBroadcast() {
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }

  close() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }
    this.stopBroadcast();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.role = null;
  }
}
