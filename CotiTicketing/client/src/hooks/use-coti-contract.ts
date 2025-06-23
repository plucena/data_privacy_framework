import { Contract, JsonRpcProvider, BrowserProvider } from 'ethers';
import { contractABI } from '@/lib/contract-abi';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export function useCotiContract() {
  const CONTRACT_ADDRESS = '0xbdFAb135CAcCF157216d36Bb822aC37419A3387B';

  const getContract = async () => {
    if (!window.ethereum) {
      throw new Error('MetaMask not installed');
    }

    // Use MetaMask provider with ethers v6 syntax
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    
    return new Contract(CONTRACT_ADDRESS, contractABI, signer);
  };

  const purchaseTicket = async (eventId: number) => {
    try {
      console.log('🎫 Starting MetaMask purchase for event:', eventId);
      const contract = await getContract();
      
      console.log('📋 Contract address:', CONTRACT_ADDRESS);
      console.log('🔗 Calling contract.purchaseTicket with eventId:', eventId);
      
      // Call purchaseTicket function on the contract
      const tx = await contract.purchaseTicket(eventId);
      console.log('📤 Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      const receipt = await tx.wait();
      console.log('✅ Transaction confirmed:', receipt);
      
      // Parse the transaction logs to get the actual ticket ID
      let ticketId = Math.floor(Math.random() * 1000000); // Fallback
      
      try {
        if (receipt.logs && receipt.logs.length > 0) {
          for (const log of receipt.logs) {
            try {
              const parsedLog = contract.interface.parseLog(log);
              if (parsedLog && parsedLog.name === 'TicketPurchased') {
                ticketId = Number(parsedLog.args.ticketId);
                console.log('🎟️ Extracted ticket ID from logs:', ticketId);
                break;
              }
            } catch (logError) {
              console.log('Failed to parse log:', logError);
            }
          }
        }
      } catch (parseError) {
        console.log('Failed to parse transaction logs, using fallback ticket ID');
      }
      
      return {
        ticketId,
        transactionHash: receipt.hash,
      };
    } catch (error) {
      console.error('❌ Error purchasing ticket:', error);
      throw new Error(`MetaMask transaction failed: ${error.message || error}`);
    }
  };

  const transferTicket = async (ticketId: number, toAddress: string) => {
    try {
      const contract = await getContract();
      const tx = await contract.transferTicket(ticketId, toAddress);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error transferring ticket:', error);
      throw error;
    }
  };

  const proveOwnership = async (ticketId: number) => {
    try {
      const contract = await getContract();
      const tx = await contract.proveOwnership(ticketId);
      const receipt = await tx.wait();
      return receipt.hash;
    } catch (error) {
      console.error('Error proving ownership:', error);
      throw error;
    }
  };

  return {
    purchaseTicket,
    transferTicket,
    proveOwnership,
  };
}