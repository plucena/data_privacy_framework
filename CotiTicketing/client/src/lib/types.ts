export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  network: string | null;
}

export interface CreateEventFormData {
  name: string;
  description: string;
  category: string;
  location: string;
  eventDate: string;
  price: number;
  totalSupply: number;
  resaleAllowed: boolean;
  resaleMarkup?: number;
}

export interface PurchaseTicketData {
  eventId: number;
  walletAddress: string;
}

export interface TransferTicketData {
  ticketId: number;
  toAddress: string;
}

export interface TransactionState {
  isLoading: boolean;
  isSuccess: boolean;
  isError: boolean;
  error: string | null;
  transactionHash: string | null;
}
