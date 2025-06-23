import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ticket } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { PurchaseTicketData, TransferTicketData } from '@/lib/types';

export function useTicketsByOwner(address: string | null) {
  return useQuery({
    queryKey: ['/api/tickets/owner', address],
    queryFn: async (): Promise<(Ticket & { event: any })[]> => {
      if (!address) return [];
      const response = await fetch(`/api/tickets/owner/${address}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }
      return response.json();
    },
    enabled: !!address,
  });
}

export function usePurchaseTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: PurchaseTicketData): Promise<Ticket> => {
      // Check if MetaMask is available and connected
      const isMetaMaskAvailable = typeof window !== 'undefined' && window.ethereum;
      
      if (isMetaMaskAvailable) {
        // Use MetaMask for the transaction
        const { useCotiContract } = await import('@/hooks/use-coti-contract');
        const contractHook = useCotiContract();
        
        // Get event details first
        const eventResponse = await fetch('/api/events');
        const events = await eventResponse.json();
        const event = events.find((e: any) => e.id === data.eventId);
        
        if (!event?.blockchainEventId) {
          throw new Error('Event not available on blockchain');
        }
        
        // Execute MetaMask transaction
        const result = await contractHook.purchaseTicket(event.blockchainEventId);
        
        // Record the purchase in backend
        const recordResponse = await apiRequest('POST', '/api/tickets/record-purchase', {
          eventId: data.eventId,
          walletAddress: data.walletAddress,
          blockchainTicketId: result.ticketId,
          transactionHash: result.transactionHash,
        });

        return recordResponse.json();
      } else {
        // Fallback to backend purchase for static wallet
        const response = await apiRequest('POST', '/api/tickets/purchase', data);
        return response.json();
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/owner'] });
      queryClient.invalidateQueries({ queryKey: ['/api/events'] });
    },
  });
}

export function useProveOwnership() {
  return useMutation({
    mutationFn: async (ticketId: number): Promise<{ proof: any; verified: boolean }> => {
      const response = await apiRequest('POST', `/api/tickets/${ticketId}/prove-ownership`);
      return response.json();
    },
  });
}

export function useTransferTicket() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ ticketId, toAddress }: TransferTicketData): Promise<Ticket> => {
      const response = await apiRequest('POST', `/api/tickets/${ticketId}/transfer`, { toAddress });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/tickets/owner'] });
    },
  });
}
