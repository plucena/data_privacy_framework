import { useState, useEffect } from 'react';
import { WalletState } from '@/lib/types';

// Extend Window interface for MetaMask
declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useCotiWallet() {
  const [wallet, setWallet] = useState<WalletState>({
    isConnected: false,
    address: null,
    balance: null,
    network: null,
  });

  const [isConnecting, setIsConnecting] = useState(false);

  // Auto-connect on mount to check if wallet is available
  useEffect(() => {
    checkWalletConnection();
    
    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on('accountsChanged', handleAccountsChanged);
      window.ethereum.on('chainChanged', handleChainChanged);
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, []);

  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setWallet(prev => ({ ...prev, address: accounts[0] }));
      updateBalance(accounts[0]);
    }
  };

  const handleChainChanged = () => {
    // Reload the page when chain changes
    window.location.reload();
  };

  const checkWalletConnection = async () => {
    if (!window.ethereum) return;

    try {
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      if (accounts.length > 0) {
        setWallet(prev => ({ ...prev, isConnected: true, address: accounts[0] }));
        await updateBalance(accounts[0]);
        await checkNetwork();
      }
    } catch (error) {
      console.error('Failed to check wallet connection:', error);
    }
  };

  const updateBalance = async (address: string) => {
    try {
      const response = await fetch(`/api/wallet/balance/${address}`);
      if (response.ok) {
        const { balance } = await response.json();
        setWallet(prev => ({ ...prev, balance }));
      }
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  };

  const checkNetwork = async () => {
    try {
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      const cotiTestnetChainId = '0x6c11a0'; // 7082400 in hex
      
      if (chainId === cotiTestnetChainId) {
        setWallet(prev => ({ ...prev, network: 'COTI Testnet' }));
      } else {
        setWallet(prev => ({ ...prev, network: `Unknown (${chainId})` }));
      }
    } catch (error) {
      console.error('Failed to check network:', error);
    }
  };

  const connectWallet = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    setIsConnecting(true);
    try {
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        
        // Try to switch to COTI testnet
        await switchToCotiNetwork();
        
        // Update wallet state
        setWallet({
          isConnected: true,
          address,
          balance: null,
          network: 'COTI Testnet',
        });

        // Update balance
        await updateBalance(address);
        
        // Initialize COTI connection with this address
        await fetch('/api/wallet/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });
      }
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      throw new Error(error.message || 'Failed to connect to MetaMask');
    } finally {
      setIsConnecting(false);
    }
  };

  const switchToCotiNetwork = async () => {
    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x6c11a0' }], // 7082400 in hex
      });
    } catch (switchError: any) {
      // If the chain doesn't exist, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x6c11a0',
              chainName: 'COTI Testnet',
              nativeCurrency: {
                name: 'COTI',
                symbol: 'COTI',
                decimals: 18,
              },
              rpcUrls: ['https://testnet.coti.io/rpc'],
              blockExplorerUrls: ['https://testnet.cotiscan.io/'],
            }],
          });
        } catch (addError) {
          console.error('Failed to add COTI network:', addError);
        }
      }
    }
  };

  const disconnectWallet = () => {
    setWallet({
      isConnected: false,
      address: null,
      balance: null,
      network: null,
    });
  };

  return {
    wallet,
    isConnecting,
    connectWallet,
    disconnectWallet,
  };
}
