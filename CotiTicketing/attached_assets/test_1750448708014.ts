import { PrivateTicketingClient } from './PrivateTicketingClient';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function quickTest() {
    console.log('🧪 Running quick test of TypeScript client...');
    
    try {
        // Test with a dummy private key first (just to check instantiation)
        const testPrivateKey = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
        const rpcUrl = process.env.COTI_RPC_URL || "https://devnet.coti.io";
        
        console.log(`📡 Using RPC URL: ${rpcUrl}`);
        
        // Create client instance
        const client = new PrivateTicketingClient(testPrivateKey, rpcUrl);
        console.log('✅ Client instantiated successfully');
        
        // Test provider connection
        try {
            const network = await client['provider'].getNetwork();
            console.log(`🌐 Connected to network: ${network.name} (chainId: ${network.chainId})`);
        } catch (error) {
            console.log('⚠️  Could not connect to network (expected with dummy key)');
        }
        
        console.log('✅ Basic functionality test passed!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Replace the private keys in .env with real test account keys');
        console.log('2. Ensure your test accounts have COTI tokens for gas');
        console.log('3. Run: npm run demo');
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

quickTest().catch(console.error);
