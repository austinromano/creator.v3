'use client';
import React, { useState } from 'react';
import { useConnection, useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { Creator } from '@/lib/types';
import { sendTip, TIP_AMOUNT_SOL, getExplorerUrl } from '@/lib/solana/tip';
import {
  Heart,
  Zap,
  Wallet,
  Send,
  ExternalLink,
  CheckCircle
} from 'lucide-react';

interface TipButtonProps {
  creator: Creator;
  onTip: (amount: number, message: string) => Promise<void>;
  className?: string;
}

export function TipButton({ creator, onTip, className = '' }: TipButtonProps) {
  const { isConnected, balance, connect } = useWallet();
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useSolanaWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTip = async () => {
    if (!isConnected || !publicKey || !sendTransaction) {
      connect();
      return;
    }

    // Check balance
    if (TIP_AMOUNT_SOL > balance) {
      setError('Insufficient balance. You need at least 0.01 SOL + gas fees.');
      return;
    }

    setIsSending(true);
    setError(null);
    setTxSignature(null);

    try {
      // Send tip transaction
      const signature = await sendTip(
        connection,
        publicKey,
        async (tx) => tx, // signTransaction placeholder
        sendTransaction
      );

      setTxSignature(signature);

      // Call the onTip callback to show in chat
      await onTip(
        TIP_AMOUNT_SOL,
        message || `Tipped ${TIP_AMOUNT_SOL} SOL to ${creator.name}!`
      );

      setMessage('');

      // Close dialog after a delay to show success
      setTimeout(() => {
        setIsOpen(false);
        setTxSignature(null);
      }, 3000);
    } catch (error: any) {
      console.error('Failed to send tip:', error);
      setError(error?.message || 'Failed to send tip. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className={`${className} bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-semibold`}
        >
          <Heart className="h-4 w-4 mr-2" />
          Tip Creator
        </Button>
      </DialogTrigger>
      
      <DialogContent className="bg-gray-900 border-gray-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Heart className="h-5 w-5 text-red-500" />
            <span>Tip {creator.name}</span>
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Show your appreciation with a tip! Tips appear in chat and support the creator.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Creator Info */}
          <Card className="bg-gray-800/50 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {creator.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-white">{creator.name}</h3>
                  <p className="text-purple-400 font-mono text-sm">${creator.symbol}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fixed Tip Amount */}
          <Card className="bg-gray-800/30 border-gray-600">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full flex items-center justify-center">
                    <Heart className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold">{TIP_AMOUNT_SOL} SOL</p>
                    <p className="text-gray-400 text-xs">Fixed tip amount</p>
                  </div>
                </div>
                <Badge className="bg-yellow-600 hover:bg-yellow-700">
                  Devnet
                </Badge>
              </div>
            </CardContent>
          </Card>

          {isConnected && (
            <p className="text-xs text-gray-400 text-center">
              Your balance: {balance.toFixed(4)} SOL (devnet)
            </p>
          )}

          {/* Message */}
          <div className="space-y-2">
            <Label htmlFor="tip-message" className="text-white">Message (Optional)</Label>
            <Textarea
              id="tip-message"
              placeholder="Say something nice..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white resize-none"
              maxLength={200}
              rows={3}
            />
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Add a personal message</span>
              <span className="text-gray-500">{message.length}/200</span>
            </div>
          </div>

          {/* Success State */}
          {txSignature && (
            <Card className="bg-green-900/20 border-green-600">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CheckCircle className="h-5 w-5 text-green-400" />
                  <p className="text-green-400 font-semibold">Tip sent successfully!</p>
                </div>
                <a
                  href={getExplorerUrl(txSignature)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                >
                  <span>View on Solana Explorer</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </CardContent>
            </Card>
          )}

          {/* Error State */}
          {error && (
            <Card className="bg-red-900/20 border-red-600">
              <CardContent className="p-4">
                <p className="text-red-400 text-sm">{error}</p>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter className="space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              setIsOpen(false);
              setError(null);
              setMessage('');
            }}
            disabled={isSending}
            className="border-gray-600 text-gray-300 hover:text-white"
          >
            {txSignature ? 'Close' : 'Cancel'}
          </Button>

          {!txSignature && (
            <Button
              onClick={handleTip}
              disabled={isSending || (isConnected && TIP_AMOUNT_SOL > balance)}
              className="bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700"
            >
              {!isConnected ? (
                <>
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </>
              ) : isSending ? (
                <>
                  <Zap className="h-4 w-4 mr-2 animate-spin" />
                  Sending Transaction...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Send Tip ({TIP_AMOUNT_SOL} SOL)
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}