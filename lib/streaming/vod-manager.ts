import { VODReplay, ScheduledStream, VideoHighlight } from '../types';

/**
 * VOD (Video on Demand) Manager
 * Handles stream recording, highlights, and replays
 */

export class VODManager {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording: boolean = false;
  private startTime: number = 0;

  /**
   * Start recording stream
   */
  async startRecording(stream: MediaStream, options?: MediaRecorderOptions): Promise<void> {
    try {
      const defaultOptions: MediaRecorderOptions = {
        mimeType: 'video/webm;codecs=vp9,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000, // 128 Kbps
        ...options,
      };

      // Check if mimeType is supported
      if (!MediaRecorder.isTypeSupported(defaultOptions.mimeType!)) {
        // Fallback to VP8
        defaultOptions.mimeType = 'video/webm;codecs=vp8,opus';
      }

      this.mediaRecorder = new MediaRecorder(stream, defaultOptions);
      this.recordedChunks = [];
      this.startTime = Date.now();

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.handleRecordingStopped();
      };

      this.mediaRecorder.onerror = (event: Event) => {
        console.error('MediaRecorder error:', event);
      };

      // Start recording with 10-second chunks
      this.mediaRecorder.start(10000);
      this.isRecording = true;

      console.log('Recording started');
    } catch (error) {
      console.error('Failed to start recording:', error);
      throw error;
    }
  }

  /**
   * Stop recording
   */
  stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || !this.isRecording) {
        reject(new Error('No active recording'));
        return;
      }

      this.mediaRecorder.onstop = () => {
        const blob = this.handleRecordingStopped();
        resolve(blob);
      };

      this.mediaRecorder.stop();
      this.isRecording = false;
    });
  }

  /**
   * Handle recording stopped
   */
  private handleRecordingStopped(): Blob {
    const blob = new Blob(this.recordedChunks, {
      type: 'video/webm',
    });

    console.log('Recording stopped, size:', blob.size);
    return blob;
  }

  /**
   * Create VOD replay from recording
   */
  async createVODReplay(
    blob: Blob,
    title: string,
    thumbnail?: string
  ): Promise<VODReplay> {
    const duration = Math.floor((Date.now() - this.startTime) / 1000);
    const url = URL.createObjectURL(blob);

    const vodReplay: VODReplay = {
      id: `vod_${Date.now()}`,
      title,
      thumbnail: thumbnail || await this.generateThumbnail(blob),
      duration,
      views: 0,
      recorded: new Date().toISOString(),
      url,
      highlights: [],
    };

    return vodReplay;
  }

  /**
   * Generate thumbnail from video blob
   */
  private async generateThumbnail(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');

      video.src = URL.createObjectURL(blob);

      video.addEventListener('loadeddata', () => {
        // Seek to 2 seconds into the video
        video.currentTime = 2;
      });

      video.addEventListener('seeked', () => {
        if (!context) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((thumbnailBlob) => {
          if (thumbnailBlob) {
            const thumbnailUrl = URL.createObjectURL(thumbnailBlob);
            resolve(thumbnailUrl);
          } else {
            reject(new Error('Failed to generate thumbnail'));
          }
        }, 'image/jpeg', 0.8);
      });

      video.addEventListener('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Add highlight to VOD
   */
  addHighlight(
    vod: VODReplay,
    timestamp: number,
    description: string
  ): VODReplay {
    const highlight: VideoHighlight = {
      timestamp,
      description,
      thumbnailUrl: '', // Would generate from specific timestamp
    };

    return {
      ...vod,
      highlights: [...(vod.highlights || []), highlight],
    };
  }

  /**
   * Extract highlights using AI/analysis
   * (Simplified version - in production would use ML)
   */
  async extractHighlights(vod: VODReplay, events: StreamEvent[]): Promise<VideoHighlight[]> {
    const highlights: VideoHighlight[] = [];

    // Look for significant events (big trades, many viewers, etc.)
    events.forEach((event) => {
      if (event.type === 'large_trade' && event.value > 1000) {
        highlights.push({
          timestamp: event.timestamp,
          description: `Large trade: ${event.value} SOL`,
          thumbnailUrl: '',
        });
      }

      if (event.type === 'viewer_milestone' && event.value >= 100) {
        highlights.push({
          timestamp: event.timestamp,
          description: `${event.value} concurrent viewers!`,
          thumbnailUrl: '',
        });
      }
    });

    return highlights;
  }

  /**
   * Upload VOD to storage (would integrate with cloud storage)
   */
  async uploadVOD(blob: Blob, vodId: string): Promise<string> {
    // In production, upload to S3, GCS, or similar
    // For now, return object URL
    return URL.createObjectURL(blob);
  }

  /**
   * Get recording status
   */
  getStatus(): { isRecording: boolean; duration: number } {
    return {
      isRecording: this.isRecording,
      duration: this.isRecording ? Math.floor((Date.now() - this.startTime) / 1000) : 0,
    };
  }
}

/**
 * Stream Scheduler
 * Manages scheduled streams and notifications
 */
export class StreamScheduler {
  private scheduledStreams: Map<string, ScheduledStream> = new Map();
  private notifications: Map<string, Set<string>> = new Map(); // streamId -> Set of subscriber addresses

  /**
   * Schedule a stream
   */
  scheduleStream(stream: Omit<ScheduledStream, 'id' | 'notified'>): ScheduledStream {
    const scheduledStream: ScheduledStream = {
      ...stream,
      id: `scheduled_${Date.now()}`,
      notified: false,
    };

    this.scheduledStreams.set(scheduledStream.id, scheduledStream);

    // Set up notification timer
    this.setupNotificationTimer(scheduledStream);

    return scheduledStream;
  }

  /**
   * Setup notification timer
   */
  private setupNotificationTimer(stream: ScheduledStream) {
    const scheduledTime = new Date(stream.scheduledFor).getTime();
    const notificationTime = scheduledTime - 15 * 60 * 1000; // 15 minutes before
    const now = Date.now();

    if (notificationTime > now) {
      setTimeout(() => {
        this.sendNotifications(stream.id);
      }, notificationTime - now);
    }
  }

  /**
   * Subscribe to stream notifications
   */
  subscribeToStream(streamId: string, userAddress: string) {
    if (!this.notifications.has(streamId)) {
      this.notifications.set(streamId, new Set());
    }

    this.notifications.get(streamId)!.add(userAddress);
  }

  /**
   * Unsubscribe from stream notifications
   */
  unsubscribeFromStream(streamId: string, userAddress: string) {
    const subscribers = this.notifications.get(streamId);
    if (subscribers) {
      subscribers.delete(userAddress);
    }
  }

  /**
   * Send notifications to subscribers
   */
  private async sendNotifications(streamId: string) {
    const stream = this.scheduledStreams.get(streamId);
    const subscribers = this.notifications.get(streamId);

    if (!stream || !subscribers || stream.notified) {
      return;
    }

    console.log(`Sending notifications for stream: ${stream.title}`);

    // In production, integrate with push notification service
    const notifications = Array.from(subscribers).map((address) => ({
      to: address,
      title: 'Stream Starting Soon!',
      body: `${stream.title} is starting in 15 minutes`,
      data: {
        streamId: stream.id,
        scheduledFor: stream.scheduledFor,
      },
    }));

    // Mark as notified
    stream.notified = true;
    this.scheduledStreams.set(streamId, stream);

    return notifications;
  }

  /**
   * Get upcoming streams
   */
  getUpcomingStreams(limit: number = 10): ScheduledStream[] {
    const now = Date.now();

    return Array.from(this.scheduledStreams.values())
      .filter((stream) => new Date(stream.scheduledFor).getTime() > now)
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime())
      .slice(0, limit);
  }

  /**
   * Cancel scheduled stream
   */
  cancelStream(streamId: string): boolean {
    return this.scheduledStreams.delete(streamId);
  }

  /**
   * Update scheduled stream
   */
  updateStream(streamId: string, updates: Partial<ScheduledStream>): ScheduledStream | null {
    const stream = this.scheduledStreams.get(streamId);

    if (!stream) {
      return null;
    }

    const updatedStream = { ...stream, ...updates };
    this.scheduledStreams.set(streamId, updatedStream);

    // Reset notification timer if time changed
    if (updates.scheduledFor) {
      updatedStream.notified = false;
      this.setupNotificationTimer(updatedStream);
    }

    return updatedStream;
  }
}

/**
 * Stream Analytics
 * Track viewer engagement and stream performance
 */
export class StreamAnalytics {
  private viewers: Map<string, ViewerSession> = new Map();
  private events: StreamEvent[] = [];

  /**
   * Track viewer join
   */
  trackViewerJoin(viewerId: string) {
    this.viewers.set(viewerId, {
      viewerId,
      joinedAt: Date.now(),
      lastActivity: Date.now(),
      interactions: 0,
    });

    this.logEvent({
      type: 'viewer_joined',
      timestamp: Date.now(),
      value: this.viewers.size,
    });
  }

  /**
   * Track viewer leave
   */
  trackViewerLeave(viewerId: string) {
    const session = this.viewers.get(viewerId);

    if (session) {
      const watchTime = Date.now() - session.joinedAt;

      this.logEvent({
        type: 'viewer_left',
        timestamp: Date.now(),
        value: Math.floor(watchTime / 1000),
      });

      this.viewers.delete(viewerId);
    }
  }

  /**
   * Track viewer interaction
   */
  trackInteraction(viewerId: string, type: string) {
    const session = this.viewers.get(viewerId);

    if (session) {
      session.interactions++;
      session.lastActivity = Date.now();

      this.logEvent({
        type: `interaction_${type}`,
        timestamp: Date.now(),
        value: 1,
      });
    }
  }

  /**
   * Log stream event
   */
  logEvent(event: StreamEvent) {
    this.events.push(event);

    // Keep only last 1000 events
    if (this.events.length > 1000) {
      this.events.shift();
    }
  }

  /**
   * Get current viewer count
   */
  getCurrentViewers(): number {
    return this.viewers.size;
  }

  /**
   * Get average watch time
   */
  getAverageWatchTime(): number {
    const sessions = Array.from(this.viewers.values());

    if (sessions.length === 0) return 0;

    const totalWatchTime = sessions.reduce((sum, session) => {
      return sum + (Date.now() - session.joinedAt);
    }, 0);

    return Math.floor(totalWatchTime / sessions.length / 1000);
  }

  /**
   * Get engagement rate
   */
  getEngagementRate(): number {
    const sessions = Array.from(this.viewers.values());

    if (sessions.length === 0) return 0;

    const activeViewers = sessions.filter((session) => session.interactions > 0).length;

    return (activeViewers / sessions.length) * 100;
  }

  /**
   * Get analytics summary
   */
  getSummary() {
    return {
      currentViewers: this.getCurrentViewers(),
      averageWatchTime: this.getAverageWatchTime(),
      engagementRate: this.getEngagementRate(),
      totalEvents: this.events.length,
      recentEvents: this.events.slice(-10),
    };
  }
}

// Types
interface ViewerSession {
  viewerId: string;
  joinedAt: number;
  lastActivity: number;
  interactions: number;
}

interface StreamEvent {
  type: string;
  timestamp: number;
  value: number;
}

export default VODManager;
