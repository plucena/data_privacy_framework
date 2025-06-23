import { PrivateTicketingClient } from "../../attached_assets/PrivateTicketingClient_1750448708013";
import * as dotenv from 'dotenv';

dotenv.config();

let clientInstance: PrivateTicketingClient | null = null;

export function getCotiClient(): PrivateTicketingClient {
  if (!clientInstance) {
    const privateKey = process.env.PRIVATE_KEY || process.env.PRIVATE_KEY_1;
    if (!privateKey) {
      throw new Error("PRIVATE_KEY environment variable not set");
    }
    
    const rpcUrl = process.env.COTI_RPC_URL || "https://testnet.coti.io/rpc";
    clientInstance = new PrivateTicketingClient(privateKey, rpcUrl);
  }
  
  return clientInstance;
}

export async function initializeCotiClient(): Promise<void> {
  const client = getCotiClient();
  await client.initConnection();
  
  // Connect to existing contract or deploy new one
  const contractAddress = process.env.CONTRACT_ADDRESS;
  if (contractAddress) {
    await client.connectToContract(contractAddress);
  } else {
    await client.deployContract();
  }
}
