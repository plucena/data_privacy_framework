import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { TransactionState } from '@/lib/types';
import { Loader2, Check, X } from 'lucide-react';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  state: TransactionState;
  onViewTickets?: () => void;
}

export function TransactionModal({ isOpen, onClose, state, onViewTickets }: TransactionModalProps) {
  const handleClose = () => {
    if (state.isSuccess && onViewTickets) {
      onViewTickets();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <div className="text-center py-6">
          {state.isLoading && (
            <div>
              <Loader2 className="w-16 h-16 text-coti-secondary mx-auto mb-4 animate-spin" />
              <h3 className="text-xl font-bold text-gray-900 mb-2">Processing Transaction</h3>
              <p className="text-gray-600 mb-4">
                Please wait while your transaction is confirmed on the COTI network...
              </p>
              {state.transactionHash && (
                <div className="text-sm text-gray-500">
                  Transaction ID: <span className="font-mono">{state.transactionHash.slice(0, 8)}...{state.transactionHash.slice(-8)}</span>
                </div>
              )}
            </div>
          )}

          {state.isSuccess && (
            <div>
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transaction Successful!</h3>
              <p className="text-gray-600 mb-4">
                Your ticket has been purchased and added to your collection.
              </p>
              <Button
                onClick={handleClose}
                className="bg-coti-secondary hover:bg-coti-secondary/90 text-white py-3 px-6 rounded-lg font-medium transition duration-200"
              >
                View My Tickets
              </Button>
            </div>
          )}

          {state.isError && (
            <div>
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <X className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Transaction Failed</h3>
              <p className="text-gray-600 mb-4">
                {state.error || 'There was an error processing your transaction. Please try again.'}
              </p>
              <Button
                onClick={onClose}
                variant="outline"
                className="py-3 px-6 rounded-lg font-medium transition duration-200"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
