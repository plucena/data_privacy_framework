import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCotiWallet } from '@/hooks/use-coti-wallet';
import { useToast } from '@/hooks/use-toast';
import { Shield, Wallet, ExternalLink } from 'lucide-react';

export function WalletConnection() {
  const { wallet, isConnecting, connectWallet, disconnectWallet } = useCotiWallet();
  const { toast } = useToast();

  const handleConnect = async () => {
    try {
      await connectWallet();
      toast({
        title: 'Wallet Connected',
        description: 'Successfully connected to MetaMask and COTI network.',
      });
    } catch (error: any) {
      toast({
        title: 'Connection Failed',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (wallet.isConnected) {
    return (
      <div className="flex items-center space-x-3 bg-green-50 dark:bg-green-900/20 px-4 py-2 rounded-lg border border-green-200 dark:border-green-800">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <span className="text-sm font-medium text-green-800 dark:text-green-200">Connected via MetaMask</span>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {wallet.address?.slice(0, 6)}...{wallet.address?.slice(-4)}
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-300">
          {wallet.balance} COTI
        </div>
        <Badge variant="outline" className="text-xs">
          {wallet.network}
        </Badge>
        <Button
          variant="ghost"
          size="sm"
          onClick={disconnectWallet}
          className="text-green-700 hover:text-green-800 dark:text-green-300 dark:hover:text-green-200"
        >
          Disconnect
        </Button>
      </div>
    );
  }

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && window.ethereum;

  if (!isMetaMaskInstalled) {
    return (
      <div className="flex items-center space-x-3">
        <Button
          asChild
          variant="outline"
          className="flex items-center space-x-2"
        >
          <a
            href="https://metamask.io/download/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Wallet className="w-4 h-4" />
            <span>Install MetaMask</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={handleConnect}
      disabled={isConnecting}
      className="bg-coti-secondary hover:bg-coti-secondary/90 text-white px-6 py-2 rounded-lg font-medium transition duration-200 flex items-center space-x-2"
    >
      <Wallet className="w-4 h-4" />
      <span>{isConnecting ? 'Connecting...' : 'Connect MetaMask'}</span>
    </Button>
  );
}
