import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Event } from '@shared/schema';
import { usePurchaseTicket } from '@/hooks/use-tickets';
import { useCotiWallet } from '@/hooks/use-coti-wallet';
import { Lock, Ticket, Info } from 'lucide-react';

interface PurchaseModalProps {
  event: Event | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function PurchaseModal({ event, isOpen, onClose, onSuccess }: PurchaseModalProps) {
  const { wallet } = useCotiWallet();
  const purchaseTicketMutation = usePurchaseTicket();

  const handlePurchase = async () => {
    if (!event || !wallet.address) return;

    try {
      await purchaseTicketMutation.mutateAsync({
        eventId: event.id,
        walletAddress: wallet.address,
      });
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Purchase failed:', error);
    }
  };

  if (!event) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="text-center">
            <Ticket className="w-12 h-12 text-coti-secondary mx-auto mb-4" />
            <DialogTitle className="text-xl font-bold text-gray-900 mb-2">
              Purchase Ticket
            </DialogTitle>
            <p className="text-gray-600">{event.name}</p>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <Alert className="bg-purple-50 border-purple-200">
            <Lock className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-purple-800">
              <div className="flex items-center justify-between">
                <span className="font-medium">Ticket Price:</span>
                <span className="flex items-center">
                  <Lock className="w-3 h-3 mr-1" />
                  Encrypted
                </span>
              </div>
            </AlertDescription>
          </Alert>
          
          <div className="flex items-center justify-between py-2 border-t">
            <span className="text-sm text-gray-500">Network Fee:</span>
            <span className="text-sm text-gray-700">~0.001 COTI</span>
          </div>

          {!wallet.isConnected && (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertDescription>
                Please connect your wallet to purchase tickets.
              </AlertDescription>
            </Alert>
          )}
        </div>

        <div className="flex space-x-4 pt-4">
          <Button
            onClick={handlePurchase}
            disabled={!wallet.isConnected || purchaseTicketMutation.isPending}
            className="flex-1 bg-coti-secondary hover:bg-coti-secondary/90 text-white py-3 px-6 rounded-lg font-medium transition duration-200"
          >
            {purchaseTicketMutation.isPending ? 'Processing...' : 'Confirm Purchase'}
          </Button>
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 py-3 px-6 rounded-lg font-medium transition duration-200"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
