#!/usr/bin/env python3
"""
Minimal test for ticket purchase issue
"""

import sys
import json
from dotenv import load_dotenv
from eth_account import Account
from web3.utils.coti import CotiNetwork, init_web3
from utils import get_account_private_key, get_account_encryption_key

def main():
    load_dotenv()
    
    print("🔗 Connecting...")
    eoa_private_key = get_account_private_key()
    account_encryption_key = get_account_encryption_key()
    eoa = Account.from_key(eoa_private_key, {'aes_key': account_encryption_key})
    web3 = init_web3(CotiNetwork.TESTNET)
    
    print(f"✅ Account: {eoa.address}")
    print(f"✅ Chain ID: {web3.eth.chain_id}")
    
    # Load contract
    contract_address = "0xB873b7a21974C83b65EF46C4350f317f09d72DA6"
    contract_path = '../../../solidity/out/PrivateTicketing.sol/PrivateTicketing.json'
    
    with open(contract_path, 'r') as file:
        contract_data = json.load(file)
    
    contract = web3.eth.contract(address=contract_address, abi=contract_data['abi'])
    print(f"✅ Contract loaded: {contract_address}")
    
    # Try simple call with very explicit error handling
    event_id = 1
    print(f"\n🎟️ Testing purchase for event {event_id}...")
    
    try:
        # First check if we can call a simple view function
        print("📋 Testing view function call...")
        tickets = contract.functions.getMyTicketIds().call({'from': eoa.address})
        print(f"✅ Current tickets: {tickets}")
        
        # Now try the problematic function
        print("🧪 Testing purchaseTicket call...")
        result = contract.functions.purchaseTicket(event_id).call({'from': eoa.address})
        print(f"✅ Purchase call succeeded: {result}")
        
    except Exception as e:
        print(f"❌ Call failed: {type(e).__name__}: {e}")
        
        # Try to get more detailed error information
        if hasattr(e, 'args') and e.args:
            print(f"   Args: {e.args}")
        
        # Check if it's a specific Web3 exception
        if "execution reverted" in str(e):
            print("   → This is a contract revert")
            if "no data" in str(e):
                print("   → No revert reason provided (likely gas or assertion failure)")
        
        # Try with explicit gas limit
        print("\n🔋 Trying with explicit gas settings...")
        try:
            gas_estimate = contract.functions.purchaseTicket(event_id).estimate_gas({
                'from': eoa.address,
                'gas': 10000000  # Very high gas limit
            })
            print(f"✅ Gas estimate successful: {gas_estimate}")
        except Exception as gas_error:
            print(f"❌ Gas estimation failed: {gas_error}")

if __name__ == "__main__":
    main()
