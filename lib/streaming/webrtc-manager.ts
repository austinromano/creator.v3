import { StreamConfig, StreamDestination } from '../types';

/**
 * WebRTC Streaming Manager
 * Handles peer-to-peer streaming with adaptive bitrate and multi-streaming
 */

export interface RTCConfig {
  iceServers: RTCIceServer[];
  encodings?: RTCRtpEncodingParameters[];
}

export class WebRTCStreamManager {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private config: StreamConfig;
  private dataChannel: RTCDataChannel | null = null;

  constructor(config: StreamConfig) {
    this.config = config;
  }

  /**
   * Initialize WebRTC with adaptive bitrate support
   */
  async initializeStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
    try {
      // Get user media with specified constraints
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);

      // Create peer connection
      const rtcConfig: RTCConfig = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      };

      this.peerConnection = new RTCPeerConnection(rtcConfig);

      // Add local stream tracks to peer connection
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          const sender = this.peerConnection.addTrack(track, this.localStream);

          // Enable adaptive bitrate if configured
          if (this.config.enableAdaptiveBitrate) {
            this.enableAdaptiveBitrate(sender);
          }
        }
      });

      // Set up data channel for chat/metadata
      this.dataChannel = this.peerConnection.createDataChannel('metadata');
      this.setupDataChannel();

      return this.localStream;
    } catch (error) {
      console.error('Failed to initialize stream:', error);
      throw error;
    }
  }

  /**
   * Enable adaptive bitrate streaming (simulcast)
   */
  private async enableAdaptiveBitrate(sender: RTCRtpSender) {
    const parameters = sender.getParameters();

    // Configure multiple encodings for different quality levels
    if (!parameters.encodings || parameters.encodings.length === 0) {
      parameters.encodings = [
        {
          rid: 'h',
          maxBitrate: 2500000, // 2.5 Mbps - 1080p
          scaleResolutionDownBy: 1,
        },
        {
          rid: 'm',
          maxBitrate: 1200000, // 1.2 Mbps - 720p
          scaleResolutionDownBy: 2,
        },
        {
          rid: 'l',
          maxBitrate: 500000, // 500 Kbps - 480p
          scaleResolutionDownBy: 4,
        },
      ];
    }

    await sender.setParameters(parameters);
  }

  /**
   * Set up data channel for real-time metadata
   */
  private setupDataChannel() {
    if (!this.dataChannel) return;

    this.dataChannel.onopen = () => {
      console.log('Data channel opened');
    };

    this.dataChannel.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.handleDataChannelMessage(data);
    };

    this.dataChannel.onerror = (error) => {
      console.error('Data channel error:', error);
    };
  }

  /**
   * Handle incoming data channel messages
   */
  private handleDataChannelMessage(data: any) {
    switch (data.type) {
      case 'viewer_joined':
        console.log('New viewer joined:', data.viewerId);
        break;
      case 'trade_alert':
        console.log('Trade executed:', data.trade);
        break;
      case 'chat_message':
        console.log('Chat message:', data.message);
        break;
    }
  }

  /**
   * Send metadata through data channel
   */
  sendMetadata(type: string, payload: any) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      this.dataChannel.send(JSON.stringify({ type, payload, timestamp: Date.now() }));
    }
  }

  /**
   * Create offer for WebRTC connection
   */
  async createOffer(): Promise<RTCSessionDescriptionInit> {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    const offer = await this.peerConnection.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    });

    await this.peerConnection.setLocalDescription(offer);
    return offer;
  }

  /**
   * Handle answer from viewer
   */
  async handleAnswer(answer: RTCSessionDescriptionInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }

  /**
   * Add ICE candidate
   */
  async addIceCandidate(candidate: RTCIceCandidateInit) {
    if (!this.peerConnection) {
      throw new Error('Peer connection not initialized');
    }

    await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
  }

  /**
   * Get stream statistics
   */
  async getStats(): Promise<RTCStatsReport | null> {
    if (!this.peerConnection) return null;
    return await this.peerConnection.getStats();
  }

  /**
   * Stop streaming
   */
  stopStream() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    if (this.dataChannel) {
      this.dataChannel.close();
      this.dataChannel = null;
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

/**
 * Multi-stream destination manager
 * Streams simultaneously to multiple platforms
 */
export class MultiStreamManager {
  private streams: Map<string, MediaStream> = new Map();
  private rtmpEndpoints: Map<string, string> = new Map();

  constructor(private destinations: StreamDestination[]) {
    this.initializeDestinations();
  }

  /**
   * Initialize streaming destinations
   */
  private initializeDestinations() {
    this.destinations.forEach((dest) => {
      if (dest.enabled) {
        const rtmpUrl = this.getRTMPUrl(dest.platform, dest.streamKey);
        this.rtmpEndpoints.set(dest.platform, rtmpUrl);
      }
    });
  }

  /**
   * Get RTMP URL for platform
   */
  private getRTMPUrl(platform: string, streamKey: string): string {
    const urls: Record<string, string> = {
      youtube: `rtmp://a.rtmp.youtube.com/live2/${streamKey}`,
      twitch: `rtmp://live.twitch.tv/app/${streamKey}`,
      twitter: `rtmp://fa.periscope.tv:80/live/${streamKey}`,
    };

    return urls[platform] || `rtmp://custom/${streamKey}`;
  }

  /**
   * Start streaming to all destinations
   */
  async startMultiStream(localStream: MediaStream) {
    const promises = Array.from(this.rtmpEndpoints.entries()).map(
      async ([platform, rtmpUrl]) => {
        try {
          // Clone stream for each destination
          const clonedStream = localStream.clone();
          this.streams.set(platform, clonedStream);

          // In a real implementation, you'd use a media server
          // to convert WebRTC to RTMP and forward to platforms
          console.log(`Starting stream to ${platform}: ${rtmpUrl}`);

          return { platform, success: true };
        } catch (error) {
          console.error(`Failed to stream to ${platform}:`, error);
          return { platform, success: false, error };
        }
      }
    );

    return await Promise.all(promises);
  }

  /**
   * Stop streaming to all destinations
   */
  stopAllStreams() {
    this.streams.forEach((stream, platform) => {
      stream.getTracks().forEach((track) => track.stop());
      console.log(`Stopped stream to ${platform}`);
    });

    this.streams.clear();
  }

  /**
   * Stop streaming to specific platform
   */
  stopStream(platform: string) {
    const stream = this.streams.get(platform);
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      this.streams.delete(platform);
      console.log(`Stopped stream to ${platform}`);
    }
  }

  /**
   * Get stream health for all platforms
   */
  getStreamHealth(): Record<string, { active: boolean; platform: string }> {
    const health: Record<string, { active: boolean; platform: string }> = {};

    this.rtmpEndpoints.forEach((_, platform) => {
      const stream = this.streams.get(platform);
      health[platform] = {
        platform,
        active: stream !== undefined && stream.active,
      };
    });

    return health;
  }
}

/**
 * Adaptive bitrate controller
 * Automatically adjusts quality based on network conditions
 */
export class AdaptiveBitrateController {
  private currentQuality: number = 1; // 0 = low, 1 = medium, 2 = high
  private lastAdjustment: number = Date.now();
  private readonly adjustmentThreshold = 5000; // 5 seconds

  constructor(private sender: RTCRtpSender) {}

  /**
   * Monitor connection and adjust bitrate
   */
  async monitorAndAdjust(stats: RTCStatsReport) {
    const now = Date.now();

    if (now - this.lastAdjustment < this.adjustmentThreshold) {
      return;
    }

    // Analyze stats
    const metrics = this.analyzeStats(stats);

    // Adjust quality based on metrics
    if (metrics.packetLoss > 5 || metrics.rtt > 200) {
      // Network issues - decrease quality
      await this.decreaseQuality();
    } else if (metrics.packetLoss < 1 && metrics.rtt < 50 && metrics.bandwidth > 2000000) {
      // Good network - increase quality
      await this.increaseQuality();
    }

    this.lastAdjustment = now;
  }

  /**
   * Analyze RTC stats
   */
  private analyzeStats(stats: RTCStatsReport): {
    packetLoss: number;
    rtt: number;
    bandwidth: number;
  } {
    let packetLoss = 0;
    let rtt = 0;
    let bandwidth = 0;

    stats.forEach((report) => {
      if (report.type === 'outbound-rtp') {
        packetLoss = (report.packetsLost / report.packetsSent) * 100 || 0;
      }

      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        rtt = report.currentRoundTripTime * 1000 || 0;
      }

      if (report.type === 'outbound-rtp') {
        bandwidth = report.bytesSent || 0;
      }
    });

    return { packetLoss, rtt, bandwidth };
  }

  /**
   * Decrease stream quality
   */
  private async decreaseQuality() {
    if (this.currentQuality === 0) return;

    this.currentQuality--;
    await this.applyQualitySettings();
    console.log(`Quality decreased to: ${this.getQualityLabel()}`);
  }

  /**
   * Increase stream quality
   */
  private async increaseQuality() {
    if (this.currentQuality === 2) return;

    this.currentQuality++;
    await this.applyQualitySettings();
    console.log(`Quality increased to: ${this.getQualityLabel()}`);
  }

  /**
   * Apply quality settings to sender
   */
  private async applyQualitySettings() {
    const parameters = this.sender.getParameters();

    if (parameters.encodings && parameters.encodings.length > 0) {
      // Disable all encodings first
      parameters.encodings.forEach((encoding) => {
        encoding.active = false;
      });

      // Enable only the target quality
      if (parameters.encodings[this.currentQuality]) {
        parameters.encodings[this.currentQuality].active = true;
      }

      await this.sender.setParameters(parameters);
    }
  }

  /**
   * Get quality label
   */
  private getQualityLabel(): string {
    const labels = ['480p', '720p', '1080p'];
    return labels[this.currentQuality] || 'unknown';
  }

  /**
   * Get current quality level
   */
  getCurrentQuality(): { level: number; label: string } {
    return {
      level: this.currentQuality,
      label: this.getQualityLabel(),
    };
  }
}

export default WebRTCStreamManager;
