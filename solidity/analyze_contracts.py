#!/usr/bin/env python3
"""
Script to analyze Solidity contract bytecode sizes
"""
import json
import os
import sys

def analyze_contract_size(contract_path):
    """Analyze the bytecode size of a compiled contract"""
    try:
        with open(contract_path, 'r') as f:
            contract_data = json.load(f)
        
        bytecode = contract_data.get('bytecode', {}).get('object', '')
        if bytecode.startswith('0x'):
            bytecode = bytecode[2:]
        
        size_bytes = len(bytecode) // 2
        size_limit = 24576  # Spurious Dragon limit
        
        print(f"Contract: {os.path.basename(contract_path)}")
        print(f"Bytecode size: {size_bytes} bytes")
        print(f"Size limit: {size_limit} bytes")
        print(f"Remaining: {size_limit - size_bytes} bytes")
        print(f"Over limit: {'YES' if size_bytes > size_limit else 'NO'}")
        print(f"Percentage of limit: {(size_bytes / size_limit) * 100:.1f}%")
        print("-" * 50)
        
        return size_bytes <= size_limit
        
    except Exception as e:
        print(f"Error analyzing {contract_path}: {e}")
        return False

def main():
    contract_dir = "out"
    if not os.path.exists(contract_dir):
        print("No compiled contracts found. Run 'forge build' first.")
        return
    
    all_within_limit = True
    
    for root, dirs, files in os.walk(contract_dir):
        for file in files:
            if file.endswith('.json') and not file.startswith('.'):
                contract_path = os.path.join(root, file)
                if 'Ticketing' in file:  # Only analyze ticketing contracts
                    within_limit = analyze_contract_size(contract_path)
                    all_within_limit = all_within_limit and within_limit
    
    if all_within_limit:
        print("✅ All contracts are within the size limit!")
    else:
        print("❌ Some contracts exceed the size limit!")
        sys.exit(1)

if __name__ == "__main__":
    main()
