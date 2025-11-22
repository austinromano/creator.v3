// Simple WebRTC streaming using BroadcastChannel for local signaling
export class WebRTCStreamer {
  private peerConnection: RTCPeerConnection | null = null;
  private signalingChannel: BroadcastChannel;
  private streamId: string;
  private onStreamCallback?: (stream: MediaStream) => void;
  private onViewerRequest?: () => Promise<void>;
  private localStream?: MediaStream;

  constructor(streamId: string) {
    this.streamId = streamId;
    this.signalingChannel = new BroadcastChannel(`stream-${streamId}`);
    this.setupSignaling();
  }

  private setupSignaling() {
    this.signalingChannel.onmessage = async (event) => {
      const { type, data } = event.data;
      console.log(`[${this.streamId}] Received signaling message:`, type);

      // Handle viewer request for stream
      if (type === 'request-stream') {
        console.log(`[${this.streamId}] Viewer requesting stream`);
        if (this.onViewerRequest) {
          await this.onViewerRequest();
        }
        return;
      }

      if (!this.peerConnection) {
        console.log(`[${this.streamId}] No peer connection, ignoring message`);
        return;
      }

      switch (type) {
        case 'offer':
          await this.handleOffer(data);
          break;
        case 'answer':
          await this.handleAnswer(data);
          break;
        case 'ice-candidate':
          await this.handleIceCandidate(data);
          break;
      }
    };
  }

  private createPeerConnection() {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peerConnection = new RTCPeerConnection(config);

    // Connection state tracking
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
        this.signalingChannel.postMessage({
          type: 'ice-candidate',
          data: event.candidate.toJSON()
        });
      } else {
        console.log(`[${this.streamId}] ICE gathering complete`);
      }
    };

    this.peerConnection.ontrack = (event) => {
      console.log(`[${this.streamId}] Received remote track:`, event.track.kind);
      console.log(`[${this.streamId}] Stream tracks:`, event.streams[0]?.getTracks().map(t => t.kind));
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

    // Verify stream has tracks
    if (stream.getTracks().length === 0) {
      console.error(`[${this.streamId}] No tracks in stream!`);
      return;
    }

    // Set up handler for viewer requests
    this.onViewerRequest = async () => {
      console.log(`[${this.streamId}] Creating new peer connection for viewer`);

      // Verify stream still has active tracks
      const activeTracks = this.localStream!.getTracks().filter(t => t.readyState === 'live');
      console.log(`[${this.streamId}] Active tracks:`, activeTracks.map(t => t.kind));

      if (activeTracks.length === 0) {
        console.error(`[${this.streamId}] No active tracks available!`);
        return;
      }

      // Close existing connection if any
      if (this.peerConnection) {
        this.peerConnection.close();
      }

      const pc = this.createPeerConnection();

      // Add all tracks from the stream to the peer connection
      this.localStream!.getTracks().forEach(track => {
        console.log(`[${this.streamId}] Adding track:`, track.kind, track.readyState, track.enabled);
        pc.addTrack(track, this.localStream!);
      });

      console.log(`[${this.streamId}] All tracks added, creating offer...`);

      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      console.log(`[${this.streamId}] Offer created, SDP:`, offer.sdp?.substring(0, 100) + '...');

      this.signalingChannel.postMessage({
        type: 'offer',
        data: offer
      });

      console.log(`[${this.streamId}] Offer sent to viewer`);
    };

    console.log(`[${this.streamId}] Broadcast ready, waiting for viewers`);
  }

  async startViewing(onStream: (stream: MediaStream) => void) {
    console.log(`[${this.streamId}] Starting viewing...`);
    this.onStreamCallback = onStream;
    this.createPeerConnection();

    // Request broadcast
    console.log(`[${this.streamId}] Requesting stream from broadcaster...`);
    this.signalingChannel.postMessage({ type: 'request-stream' });
  }

  private async handleOffer(offer: RTCSessionDescriptionInit) {
    console.log(`[${this.streamId}] Handling offer...`);
    if (!this.peerConnection) {
      console.error(`[${this.streamId}] No peer connection for offer`);
      return;
    }

    try {
      await this.peerConnection.setRemoteDescription(offer);
      console.log(`[${this.streamId}] Remote description set`);

      const answer = await this.peerConnection.createAnswer();
      console.log(`[${this.streamId}] Answer created`);

      await this.peerConnection.setLocalDescription(answer);
      console.log(`[${this.streamId}] Local description set`);

      this.signalingChannel.postMessage({
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
    this.stopBroadcast();
    this.signalingChannel.close();
  }
}
