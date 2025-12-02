'use client';
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Creator } from '@/lib/types';
import { WebRTCStreamer } from '@/lib/webrtc-stream';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Settings,
  Radio,
  Eye,
  Wifi,
  WifiOff
} from 'lucide-react';

interface StreamPlayerProps {
  creator: Creator;
  isLive: boolean;
  viewers: number;
  className?: string;
}

export function StreamPlayer({ creator, isLive, viewers, className = '' }: StreamPlayerProps) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const webrtcStreamerRef = React.useRef<WebRTCStreamer | null>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'buffering' | 'disconnected'>('disconnected');
  const [streamQuality, setStreamQuality] = useState('1080p');
  const [hasWebRTCStream, setHasWebRTCStream] = useState(false);

  // Demo stream URL - replace with actual stream URL from your backend
  const streamUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

  // Connect to WebRTC stream when live
  useEffect(() => {
    if (!isLive) {
      setConnectionStatus('disconnected');
      setHasWebRTCStream(false);
      if (webrtcStreamerRef.current) {
        webrtcStreamerRef.current.close();
        webrtcStreamerRef.current = null;
      }
      return;
    }

    // Try to connect to WebRTC stream
    console.log('Attempting to connect to WebRTC stream for:', creator.symbol);
    setConnectionStatus('buffering');

    let retryCount = 0;
    const maxRetries = 10;
    let retryTimeout: NodeJS.Timeout | null = null;
    let connected = false;

    const connectToStream = () => {
      if (connected) return; // Stop if already connected

      if (webrtcStreamerRef.current) {
        webrtcStreamerRef.current.close();
      }

      webrtcStreamerRef.current = new WebRTCStreamer(creator.symbol);
      webrtcStreamerRef.current.startViewing((stream) => {
        connected = true; // Mark as connected
        if (retryTimeout) clearTimeout(retryTimeout); // Clear retry timer

        console.log('Received WebRTC stream:', stream);
        console.log('Video element:', videoRef.current);
        console.log('Stream tracks:', stream.getTracks());
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          console.log('Stream assigned to video element');
          videoRef.current.play()
            .then(() => {
              console.log('Video playback started successfully');
              setHasWebRTCStream(true);
              setConnectionStatus('connected');
            })
            .catch(err => {
              console.error('Error playing video:', err);
              // Try to play muted if autoplay is blocked
              videoRef.current!.muted = true;
              return videoRef.current!.play();
            })
            .then(() => {
              console.log('Video playing (muted)');
              setHasWebRTCStream(true);
              setConnectionStatus('connected');
            })
            .catch(err => console.error('Failed to play video even when muted:', err));
        } else {
          console.error('Video element not found!');
        }
      });

      // Retry connection if not connected after 3 seconds
      retryTimeout = setTimeout(() => {
        if (!connected && retryCount < maxRetries) {
          retryCount++;
          console.log(`Retrying WebRTC connection (${retryCount}/${maxRetries})...`);
          connectToStream();
        }
      }, 3000);
    };

    connectToStream();

    return () => {
      connected = true; // Prevent further retries on cleanup
      if (retryTimeout) {
        clearTimeout(retryTimeout);
      }
      if (webrtcStreamerRef.current) {
        webrtcStreamerRef.current.close();
        webrtcStreamerRef.current = null;
      }
    };
  }, [isLive, creator.symbol]);

  // Format viewer count for display
  const formatViewers = (count: number) => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toLocaleString();
  };

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleFullscreen = async () => {
    if (!videoRef.current) return;

    try {
      if (!isFullscreen) {
        if (videoRef.current.requestFullscreen) {
          await videoRef.current.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
      setIsFullscreen(!isFullscreen);
    } catch (error) {
      console.error('Fullscreen error:', error);
    }
  };

  const qualityOptions = ['1080p', '720p', '480p', '360p'];

  return (
    <div className={`${className} bg-black overflow-hidden relative group`}>
      {/* Video Player Area */}
      <div className="w-full h-full bg-black relative">
          {/* Stream Status Overlay */}
          <div className="absolute top-4 left-4 z-20 flex items-center space-x-3">
            <Badge 
              variant={isLive ? "destructive" : "secondary"}
              className={isLive ? "bg-red-600 hover:bg-red-700 animate-pulse" : "bg-gray-600"}
            >
              <Radio className="h-3 w-3 mr-1" />
              {isLive ? 'LIVE' : 'OFFLINE'}
            </Badge>
            
            {isLive && (
              <Badge variant="outline" className="bg-black/50 border-white/20 text-white">
                <Eye className="h-3 w-3 mr-1" />
                {formatViewers(viewers)}
              </Badge>
            )}
            
            <Badge 
              variant="outline" 
              className={`bg-black/50 border-white/20 ${
                connectionStatus === 'connected' ? 'text-green-400' :
                connectionStatus === 'buffering' ? 'text-yellow-400' :
                'text-red-400'
              }`}
            >
              {connectionStatus === 'connected' ? (
                <Wifi className="h-3 w-3 mr-1" />
              ) : (
                <WifiOff className="h-3 w-3 mr-1" />
              )}
              {connectionStatus}
            </Badge>
          </div>

          {/* Stream Content */}
          {isLive ? (
            <div className="relative w-full h-full">
              <video
                ref={videoRef}
                className="w-full h-full object-cover bg-black"
                autoPlay
                muted={isMuted}
                playsInline
                controls={false}
              />
              {!hasWebRTCStream && (
                <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-black">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                    <p className="text-white text-lg">Connecting to live stream...</p>
                    <p className="text-gray-400 text-sm">Waiting for broadcaster</p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-700 rounded-full flex items-center justify-center">
                  <Radio className="h-8 w-8 text-gray-500" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-2">{creator.name} is offline</h3>
                  <p className="text-gray-400">This creator is not currently streaming</p>
                </div>
              </div>
            </div>
          )}

          {/* Player Controls */}
          {isLive && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20"
                  >
                    {isPlaying ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMute}
                    className="text-white hover:bg-white/20"
                  >
                    {isMuted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </Button>

                  <div className="text-white text-sm">
                    {isPlaying ? 'Live' : 'Paused'}
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <select 
                    value={streamQuality}
                    onChange={(e) => setStreamQuality(e.target.value)}
                    className="bg-black/50 text-white text-sm rounded px-2 py-1 border border-white/20"
                  >
                    {qualityOptions.map(quality => (
                      <option key={quality} value={quality}>{quality}</option>
                    ))}
                  </select>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                  >
                    <Settings className="h-5 w-5" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFullscreen}
                    className="text-white hover:bg-white/20"
                  >
                    <Maximize className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Buffering Indicator */}
          {connectionStatus === 'buffering' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50">
              <div className="text-center space-y-2">
                <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                <p className="text-white text-sm">Buffering...</p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}