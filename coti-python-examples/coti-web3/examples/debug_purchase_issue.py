#!/usr/bin/env python3
"""
Debug script to isolate the ticket purchase issue
"""

from datetime import datetime, timedelta
import json
from dotenv import load_dotenv
from eth_account import Account
from web3.utils.coti import CotiNetwork, init_web3, generate_or_recover_aes
from utils import (
    get_account_private_key, 
    get_account_encryption_key, 
    validate_minimum_balance, 
    exec_func_via_transaction, 
    make_sure_tx_didnt_fail
)

def debug_purchase():
    """Debug the purchase issue with deployed contract."""
    load_dotenv()
    
    # Initialize connection
    print("🔗 Connecting to COTI...")
    eoa_private_key = get_account_private_key()
    account_encryption_key = get_account_encryption_key()
    eoa = Account.from_key(eoa_private_key, {'aes_key': account_encryption_key})
    web3 = init_web3(CotiNetwork.TESTNET)
    validate_minimum_balance(web3, eoa.address)
    print(f"✅ Connected! Account: {eoa.address}")
    
    # Connect to deployed contract
    contract_address = "0xB873b7a21974C83b65EF46C4350f317f09d72DA6"  # From the log
    contract_path = '../../../solidity/out/PrivateTicketing.sol/PrivateTicketing.json'
    
    with open(contract_path, 'r') as file:
        contract_data = json.load(file)
    
    contract = web3.eth.contract(
        address=contract_address,
        abi=contract_data['abi']
    )
    
    print(f"🔗 Connected to contract at: {contract_address}")
    
    # Check event 1 details
    event_id = 1
    print(f"\n🔍 Checking event {event_id}...")
    
    try:
        event_info = contract.functions.events(event_id).call({'from': eoa.address})
        print(f"📊 Event exists: {event_info[2]} (ID: {event_info[0]})")
        print(f"👤 Organizer: {event_info[1]}")
        print(f"📅 Date: {datetime.fromtimestamp(event_info[3])}")
        print(f"🔄 Resale allowed: {event_info[7]}")
    except Exception as e:
        print(f"❌ Failed to get event info: {e}")
        return
    
    # Test different approaches to purchase
    print(f"\n🧪 Testing purchase approaches...")
    
    # 1. Simple call test
    try:
        print("1. Testing simple call...")
        result = contract.functions.purchaseTicket(event_id).call({'from': eoa.address})
        print(f"   ✅ Call succeeded: {result}")
    except Exception as e:
        print(f"   ❌ Call failed: {e}")
    
    # 2. Gas estimation
    try:
        print("2. Testing gas estimation...")
        gas_estimate = contract.functions.purchaseTicket(event_id).estimate_gas({'from': eoa.address})
        print(f"   ✅ Gas estimate: {gas_estimate}")
    except Exception as e:
        print(f"   ❌ Gas estimation failed: {e}")
    
    # 3. Check permissions manually
    print("3. Checking permissions...")
    try:
        # Try to check if we have permission (this might not be directly accessible)
        print("   Permission checking not directly available in contract ABI")
    except Exception as e:
        print(f"   ❌ Permission check failed: {e}")
    
    # 4. Try to purchase with a manual transaction
    print("4. Attempting manual transaction...")
    try:
        # Build transaction manually with very high gas
        tx = contract.functions.purchaseTicket(event_id).build_transaction({
            'from': eoa.address,
            'nonce': web3.eth.get_transaction_count(eoa.address),
            'gas': 5000000,  # Very high gas limit
            'gasPrice': web3.to_wei(30, 'gwei')
        })
        
        # Don't send it, just see if we can build it
        print(f"   ✅ Transaction built successfully")
        print(f"      Gas: {tx['gas']}")
        print(f"      Gas Price: {tx['gasPrice']}")
        print(f"      To: {tx['to']}")
        print(f"      Data length: {len(tx['data'])} bytes")
        
        # Simulate the transaction
        print("   🔍 Simulating transaction...")
        try:
            result = web3.eth.call(tx)
            print(f"   ✅ Simulation succeeded: {result.hex()}")
        except Exception as sim_error:
            print(f"   ❌ Simulation failed: {sim_error}")
            
            # Try to decode the error
            if hasattr(sim_error, 'args') and len(sim_error.args) > 0:
                error_data = str(sim_error.args[0])
                print(f"      Error details: {error_data}")
                
                # Check for common error patterns
                if "revert" in error_data.lower():
                    print("      This appears to be a contract revert")
                if "ticketsnotavailable" in error_data.lower():
                    print("      Possible cause: Tickets not available")
                if "notowner" in error_data.lower():
                    print("      Possible cause: Permission denied")
                if "purchasecheckfailed" in error_data.lower():
                    print("      Possible cause: Purchase check failed")
        
    except Exception as e:
        print(f"   ❌ Failed to build transaction: {e}")

if __name__ == "__main__":
    debug_purchase()
