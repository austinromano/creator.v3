'use client';
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useTokenStore } from '@/stores/tokenStore';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Wallet,
  Trophy,
  Users,
  TrendingUp,
  Settings,
  Mail,
  Radio,
  DollarSign,
  Eye,
  Loader2,
  Clock,
  Edit3,
  Star,
  MessageSquare,
  ChevronDown,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Monitor,
  Square,
} from 'lucide-react';
import { LiveStreamBroadcast } from '@/components/streaming/LiveStreamBroadcast';
import { WebRTCStreamer } from '@/lib/webrtc-stream';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { getTokenByCreator, getTokenBySymbol, updateToken } = useTokenStore();
  const [isLive, setIsLive] = useState(false);
  const [sessionTime, setSessionTime] = useState(0);
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const webrtcStreamerRef = React.useRef<WebRTCStreamer | null>(null);
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [microphoneEnabled, setMicrophoneEnabled] = useState(true);
  const [streamReady, setStreamReady] = useState(false);

  const user = session?.user as any;
  const userId = user?.id;
  const username = user?.name || 'User';

  // Check if user has a token
  let userToken = userId ? getTokenByCreator(userId) : null;

  // For testing: If no user token found, use GOTH token
  if (!userToken) {
    userToken = getTokenBySymbol('GOTH');
  }

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
    }
  }, [status, router]);

  useEffect(() => {
    if (userToken) {
      setIsLive(userToken.isLive || false);
    }
  }, [userToken]);

  // Session timer - must be before any returns
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLive) {
      interval = setInterval(() => {
        setSessionTime((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isLive]);

  // Assign stream to video element when both are available
  useEffect(() => {
    if (streamReady && streamRef.current && videoRef.current && isLive) {
      console.log('Assigning stream to video element');
      console.log('videoRef.current:', videoRef.current);
      console.log('streamRef.current:', streamRef.current);
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(err => console.error('Error playing video:', err));
    }
  }, [isLive, streamReady]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500 mx-auto" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return null;
  }

  const initials = username
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const startCamera = async () => {
    try {
      console.log('Starting camera...');
      const stream = await navigator.mediaDevices.getUserMedia({
        video: cameraEnabled,
        audio: microphoneEnabled
      });
      console.log('Stream obtained:', stream);
      streamRef.current = stream;
      setStreamReady(true);
    } catch (error) {
      console.error('Error accessing camera:', error);
      alert('Unable to access camera/microphone. Error: ' + error);
    }
  };

  const stopCamera = () => {
    console.log('Stopping camera...');
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamReady(false);
  };

  const handleGoLive = async () => {
    if (userToken) {
      await startCamera();
      setIsLive(true);
      updateToken(userToken.symbol, { isLive: true });

      // Start WebRTC broadcast
      if (streamRef.current) {
        webrtcStreamerRef.current = new WebRTCStreamer(userToken.symbol);
        await webrtcStreamerRef.current.startBroadcast(streamRef.current);
        console.log('WebRTC broadcast started for:', userToken.symbol);
      }
    }
  };

  const handleEndStream = () => {
    if (userToken) {
      stopCamera();
      setIsLive(false);
      updateToken(userToken.symbol, { isLive: false });
      setSessionTime(0);

      // Stop WebRTC broadcast
      if (webrtcStreamerRef.current) {
        webrtcStreamerRef.current.close();
        webrtcStreamerRef.current = null;
      }
    }
  };

  const toggleCamera = () => {
    if (streamRef.current) {
      const videoTrack = streamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setCameraEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleMicrophone = () => {
    if (streamRef.current) {
      const audioTrack = streamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setMicrophoneEnabled(audioTrack.enabled);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // If user has a token, show the Twitch-style stream manager
  if (userToken) {
    return (
      <div className="min-h-screen bg-[#0e0e10] text-white">
        {/* Top Stats Bar */}
        <div className="bg-[#18181b] border-b border-gray-800 px-4 py-2">
          <div className="flex items-center justify-between max-w-[1920px] mx-auto">
            <div className="flex items-center space-x-8 text-sm">
              <div className="flex items-center space-x-2">
                <Clock className="h-5 w-5 text-blue-400" />
                <div>
                  <div className="text-xl font-bold">{formatTime(sessionTime)}</div>
                  <div className="text-xs text-gray-400">Session</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Eye className="h-5 w-5 text-yellow-400" />
                <div>
                  <div className="text-xl font-bold">{userToken.viewers || 0}</div>
                  <div className="text-xs text-gray-400">Viewers</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-purple-400" />
                <div>
                  <div className="text-xl font-bold">{userToken.holders}</div>
                  <div className="text-xs text-gray-400">Followers</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <DollarSign className="h-5 w-5 text-green-400" />
                <div>
                  <div className="text-xl font-bold">${userToken.marketCap.toLocaleString()}</div>
                  <div className="text-xs text-gray-400">Market Cap</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Wallet className="h-5 w-5 text-orange-400" />
                <div>
                  <div className="text-xl font-bold">0.00 SOL</div>
                  <div className="text-xs text-gray-400">SOL Received</div>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                <div>
                  <div className="text-xl font-bold">-</div>
                  <div className="text-xs text-gray-400">Ranking</div>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
            </div>
          </div>
        </div>

        {/* Main 2-Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 max-w-[1920px] mx-auto">
          {/* Stream Preview - Left Column (60%) */}
          <div className="lg:col-span-2 bg-[#0e0e10]">
            {/* Video Preview */}
            <div className="relative bg-black aspect-video overflow-hidden">
                {isLive ? (
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl font-bold text-gray-600 mb-4">OFFLINE</div>
                      <Button
                        onClick={handleGoLive}
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <Radio className="h-4 w-4 mr-2" />
                        Go Live
                      </Button>
                    </div>
                  </div>
                )}
            </div>

            {/* Stream Info Below Video */}
            <div className="p-4 bg-[#18181b]">
              {/* Stream Controls */}
              {isLive && (
                <div className="mb-4 flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleCamera}
                    className={`${cameraEnabled ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}
                  >
                    {cameraEnabled ? <Video className="h-4 w-4 mr-1" /> : <VideoOff className="h-4 w-4 mr-1" />}
                    {cameraEnabled ? 'Camera On' : 'Camera Off'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMicrophone}
                    className={`${microphoneEnabled ? 'text-green-400 border-green-400' : 'text-red-400 border-red-400'}`}
                  >
                    {microphoneEnabled ? <Mic className="h-4 w-4 mr-1" /> : <MicOff className="h-4 w-4 mr-1" />}
                    {microphoneEnabled ? 'Mic On' : 'Mic Off'}
                  </Button>

                  <Button
                    onClick={handleEndStream}
                    variant="destructive"
                    size="sm"
                    className="bg-red-600 hover:bg-red-700 ml-auto"
                  >
                    <Square className="h-4 w-4 mr-1" />
                    Stop Stream
                  </Button>
                </div>
              )}

              {/* Stream Info */}
              <div className="flex items-center space-x-3">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={user.image || userToken.avatar} />
                  <AvatarFallback className="bg-purple-600">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold">Live!</div>
                  <Badge className={isLive ? "bg-red-600" : "bg-gray-600"}>
                    {isLive ? "LIVE" : "OFFLINE"}
                  </Badge>
                  {isLive && (
                    <div className="text-xs text-green-400 mt-1">
                      Broadcasting as: {userToken.symbol}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Chat + Activity Feed - Right Column */}
          <div className="bg-[#18181b] border-l border-gray-800 flex flex-col h-[calc(100vh-180px)]">
            {/* My Chat */}
            <div className="border-b border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold">My Chat</h2>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="text-sm text-gray-400 text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-2 text-gray-600" />
                <p>Welcome to the chat room!</p>
                {!isLive && <p className="text-xs mt-2">Chat will be active when streaming</p>}
              </div>
            </div>

            <div className="border-t border-gray-800 p-3">
              <input
                type="text"
                placeholder="Send a message"
                className="w-full bg-[#0e0e10] border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-purple-500"
                disabled={!isLive}
              />
            </div>

            {/* Activity Feed */}
            <div className="border-t border-gray-800 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-semibold">Activity Feed</h2>
                <ChevronDown className="h-4 w-4 text-gray-400" />
              </div>
            </div>

            <div className="p-4 flex-1 overflow-y-auto">
              <div className="text-center py-12">
                <div className="text-2xl font-bold mb-2">It's quiet. Too quiet...</div>
                <p className="text-sm text-gray-400">
                  We'll show your new follows, tips, and activity here.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If user doesn't have a token, show the regular profile page

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 rounded-lg border border-gray-800 p-8 mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <Avatar className="h-24 w-24 border-4 border-purple-500">
              <AvatarImage src={user.image} alt={username} />
              <AvatarFallback className="bg-purple-600 text-white text-2xl">
                {initials}
              </AvatarFallback>
            </Avatar>

            <div>
              <div className="flex items-center space-x-3 mb-2">
                <h1 className="text-3xl font-bold text-white">{username}</h1>
                <Badge className="bg-green-600 text-white">
                  Active
                </Badge>
              </div>

              <div className="flex flex-col space-y-2 text-gray-400">
                {user.email && (
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                )}
                {user.walletAddress && (
                  <div className="flex items-center space-x-2">
                    <Wallet className="h-4 w-4" />
                    <span className="text-sm font-mono">
                      {user.walletAddress.slice(0, 8)}...{user.walletAddress.slice(-6)}
                    </span>
                  </div>
                )}
                {user.provider && (
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-500">
                      Connected via {user.provider === 'phantom' ? 'Phantom Wallet' : user.provider === 'google' ? 'Google' : 'Email'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col space-y-2">
            <Button
              onClick={() => router.push('/create')}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              Create Token
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Reputation</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
            </div>
            <Trophy className="h-12 w-12 text-yellow-500" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">SOL Received</p>
              <p className="text-3xl font-bold text-white mt-1">0.00</p>
              <p className="text-xs text-gray-500 mt-1">SOL</p>
            </div>
            <Wallet className="h-12 w-12 text-purple-500" />
          </div>
        </Card>

        <Card className="bg-gray-900 border-gray-800 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Followers</p>
              <p className="text-3xl font-bold text-white mt-1">0</p>
            </div>
            <Users className="h-12 w-12 text-blue-500" />
          </div>
        </Card>
      </div>

      {/* Activity Section */}
      <Card className="bg-gray-900 border-gray-800 p-6 mb-6">
        <h3 className="text-xl font-bold text-white mb-4">Activity</h3>
        <div className="space-y-4">
          <div className="flex items-center space-x-3 text-gray-400">
            <div className="h-2 w-2 bg-green-500 rounded-full" />
            <p>Welcome to creator.fun! Your profile has been created.</p>
          </div>
          <div className="text-center py-8 border-t border-gray-800 mt-4">
            <TrendingUp className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-4">Start your creator journey!</p>
            <p className="text-sm text-gray-500 mb-4">
              Create your first token, build your community, and unlock achievements.
            </p>
            <Button
              onClick={() => router.push('/create')}
              className="bg-green-600 hover:bg-green-700"
            >
              Create Your First Token
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-gray-800 p-6">
        <h3 className="text-xl font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
            onClick={() => router.push('/create')}
          >
            <Wallet className="h-5 w-5 mr-3 text-purple-500" />
            Create a Token
          </Button>
          <Button
            variant="outline"
            className="border-gray-700 text-gray-300 hover:bg-gray-800 justify-start"
            onClick={() => router.push('/')}
          >
            <TrendingUp className="h-5 w-5 mr-3 text-blue-500" />
            Explore Trending
          </Button>
        </div>
      </Card>
    </div>
  );
}
