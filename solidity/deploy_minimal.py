#!/usr/bin/env python3
"""
Simple deployment script for the optimized PrivateTicketing contracts
"""

import json
import os
from web3 import Web3

def deploy_contract(w3, contract_name, contract_abi, contract_bytecode, constructor_args=None):
    """Deploy a contract and return the transaction receipt"""
    
    # Get the default account
    account = w3.eth.accounts[0] if w3.eth.accounts else None
    if not account:
        raise Exception("No accounts available for deployment")
    
    # Create contract instance
    contract = w3.eth.contract(abi=contract_abi, bytecode=contract_bytecode)
    
    # Build constructor transaction
    if constructor_args:
        constructor_txn = contract.constructor(*constructor_args)
    else:
        constructor_txn = contract.constructor()
    
    # Estimate gas
    gas_estimate = constructor_txn.estimate_gas({'from': account})
    print(f"Estimated gas for {contract_name}: {gas_estimate:,}")
    
    # Deploy contract
    print(f"Deploying {contract_name}...")
    tx_hash = constructor_txn.transact({'from': account, 'gas': gas_estimate})
    
    # Wait for transaction receipt
    tx_receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    
    print(f"✅ {contract_name} deployed at: {tx_receipt.contractAddress}")
    print(f"   Gas used: {tx_receipt.gasUsed:,}")
    print(f"   Block number: {tx_receipt.blockNumber}")
    
    return tx_receipt

def load_contract_artifact(artifact_path):
    """Load contract ABI and bytecode from forge artifact"""
    with open(artifact_path, 'r') as f:
        artifact = json.load(f)
    
    return artifact['abi'], artifact['bytecode']['object']

def main():
    # This is a template - replace with actual network configuration
    print("🚀 Private Ticketing Contract Deployment Script")
    print("=" * 50)
    
    # Example configuration (replace with actual values)
    # w3 = Web3(Web3.HTTPProvider('http://localhost:8545'))  # Local node
    # w3 = Web3(Web3.HTTPProvider('https://mainnet.infura.io/v3/YOUR_PROJECT_ID'))  # Mainnet
    
    print("⚠️  This is a template deployment script.")
    print("📝 To use this script:")
    print("   1. Replace the Web3 provider with your actual network")
    print("   2. Configure your account/private key for deployment") 
    print("   3. Ensure the network has sufficient funds for deployment")
    print("   4. Run the script with your network configuration")
    print()
    
    # Available contracts
    contracts = {
        'PrivateTicketing': 'out/PrivateTicketing.sol/PrivateTicketing.json',
        'PrivateTicketingUltraMinimal': 'out/PrivateTicketingUltraMinimal.sol/PrivateTicketingUltraMinimal.json'
    }
    
    print("📊 Available optimized contracts:")
    for name, path in contracts.items():
        if os.path.exists(path):
            abi, bytecode = load_contract_artifact(path)
            bytecode_size = len(bytecode[2:]) // 2 if bytecode.startswith('0x') else len(bytecode) // 2
            print(f"   ✅ {name}: {bytecode_size:,} bytes ({(bytecode_size/24576)*100:.1f}% of limit)")
        else:
            print(f"   ❌ {name}: Not compiled")
    
    print()
    print("💡 To deploy:")
    print("   1. Compile contracts: forge build --skip node_modules")
    print("   2. Configure this script with your network details")
    print("   3. Run: python3 deploy_minimal.py")

if __name__ == "__main__":
    main()
