#!/usr/bin/env python3
"""
Private Ticketing Demo Script

This script demon        # Load the contract ABI and bytecode - using Minimal version for testing
        contract_path = './out/PrivateTicketingMinimal.sol/PrivateTicketingMinimal.json'rates how to deploy and interact with the PrivateTicketing.sol contract
using the COTI privacy framework. It shows encrypted ticket operations including:
- Creating events with encrypted pricing
- Purchasing tickets with private transactions
- Proving ownership without revealing price
- Transferring tickets between users

Based on the data_on_chain.py example from the COTI SDK.
"""

import sys
import warnings
from pathlib import Path

# Suppress ABI mismatch warnings for debug events
warnings.filterwarnings("ignore", message=".*MismatchedABI.*")

# Add the examples directory to the Python path
sys.path.append(str(Path(__file__).parent.parent / "coti-python-examples" / "coti-web3" / "examples"))

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
from native_transfer import transfer_native


class PrivateTicketingDemo:
    """
    Demo class for interacting with the PrivateTicketing contract.
    """
    
    def __init__(self):
        load_dotenv()
        self.web3 = None
        self.eoa = None
        self.contract = None
        self.gas_limit = 10000000
        self.gas_price_gwei = 30
        self.tx_params = {
            'gas_limit': self.gas_limit,
            'gas_price_gwei': self.gas_price_gwei
        }
        
    def init_connection(self):
        """Initialize connection to COTI network and setup account."""
        print("🔗 Initializing connection to COTI network...")
        
        # Get account credentials
        eoa_private_key = get_account_private_key()
        account_encryption_key = get_account_encryption_key()
        
        # Create account with encryption key
        self.eoa = Account.from_key(eoa_private_key, {'aes_key': account_encryption_key})
        
        # Initialize Web3 connection
        self.web3 = init_web3(CotiNetwork.TESTNET)
        
        # Validate minimum balance
        validate_minimum_balance(self.web3, self.eoa.address)
        
        print(f"✅ Connected! Account: {self.eoa.address}")
        
    def deploy_contract(self):
        """Deploy the PrivateTicketing contract."""
        print("\n🚀 Deploying PrivateTicketing contract...")
        
        # Load contract ABI and bytecode - using Debug version to understand the issue
        contract_path = './out/PrivateTicketingDebug.sol/PrivateTicketingDebug.json'
        
        with open(contract_path, 'r') as file:
            contract_data = json.load(file)
        
        # Create contract instance
        contract_factory = self.web3.eth.contract(
            abi=contract_data['abi'],
            bytecode=contract_data['bytecode']['object']
        )
        
        # Build deployment transaction
        constructor_tx = contract_factory.constructor().build_transaction({
            'from': self.eoa.address,
            'nonce': self.web3.eth.get_transaction_count(self.eoa.address),
            'gas': self.gas_limit,
            'gasPrice': self.web3.to_wei(self.gas_price_gwei, 'gwei')
        })
        
        # Sign and send transaction
        signed_tx = self.web3.eth.account.sign_transaction(constructor_tx, self.eoa.key)
        tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
        
        # Wait for confirmation
        print("⏳ Waiting for deployment confirmation...")
        tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
        make_sure_tx_didnt_fail(tx_receipt)
        
        # Create contract instance
        self.contract = self.web3.eth.contract(
            address=tx_receipt.contractAddress,
            abi=contract_data['abi']
        )
        
        print(f"✅ Contract deployed at: {tx_receipt.contractAddress}")
        return tx_receipt.contractAddress
        
    def create_event(self, name, price, total_supply, resale_allowed=False, resale_markup=0):
        """
        Create a new event with encrypted pricing.
        
        Args:
            name (str): Event name
            price (int): Ticket price (will be encrypted)
            total_supply (int): Total tickets available (will be encrypted)
            resale_allowed (bool): Whether resale is allowed
            resale_markup (int): Markup for resale (will be encrypted)
        """
        print(f"\n🎫 Creating event: {name}")
        print(f"💰 Price: {price} (encrypted)")
        print(f"📊 Total Supply: {total_supply} (encrypted)")
        
        # Event date (1 week from now)
        event_date = int((datetime.now() + timedelta(weeks=1)).timestamp())
        
        # Encrypt the values using the contract's createEvent function selector
        func_selector = self.contract.functions.createEvent(
            name, event_date, (0, b''), (0, b''), resale_allowed, (0, b'')
        ).selector
        
        # Encrypt price
        encrypted_price = self.eoa.encrypt_value(price, self.contract.address, func_selector)
        
        # Encrypt total supply
        encrypted_total_supply = self.eoa.encrypt_value(total_supply, self.contract.address, func_selector)
        
        # Encrypt resale markup
        encrypted_resale_markup = self.eoa.encrypt_value(resale_markup, self.contract.address, func_selector)
        
        # Execute transaction
        func = self.contract.functions.createEvent(
            name,
            event_date,
            encrypted_price,
            encrypted_total_supply,
            resale_allowed,
            encrypted_resale_markup
        )
        
        tx_receipt = exec_func_via_transaction(self.web3, self.eoa, func, self.tx_params)
        make_sure_tx_didnt_fail(tx_receipt)
        
        # Get event ID from logs
        event_created_logs = self.contract.events.EventCreated().process_receipt(tx_receipt)
        event_id = event_created_logs[0]['args']['eventId']
        
        print(f"✅ Event created with ID: {event_id}")
        
        # IMPORTANT: After creating the event, we need to explicitly grant permission
        # to specific users to purchase tickets.
        print(f"🔑 Setting up purchase permissions...")
        try:
            # Grant permission to the current user to purchase tickets for this event
            permission_func = self.contract.functions.setPermission((
                self.eoa.address,  # caller
                "op_purchase_ticket",  # operation
                True,  # active
                0,  # timestampBefore
                0,  # timestampAfter
                False,  # falseKey
                False,  # trueKey
                event_id,  # uintParameter (event ID)
                "0x0000000000000000000000000000000000000000",  # addressParameter
                ""  # stringParameter
            ))
            
            perm_tx_receipt = exec_func_via_transaction(self.web3, self.eoa, permission_func, self.tx_params)
            make_sure_tx_didnt_fail(perm_tx_receipt)
            print(f"✅ Purchase permission granted to {self.eoa.address}")
            
        except Exception as perm_error:
            print(f"⚠️ Failed to set purchase permission: {perm_error}")
            print("   This might still work if the contract's default permission setup is correct")
        
        return event_id
        
    def purchase_ticket(self, event_id):
        """
        Purchase a ticket for an event using the fixed contract.
        
        Args:
            event_id (int): The event ID to purchase a ticket for
        """
        print(f"\n🎟️ Purchasing ticket for event {event_id}...")
        
        # First, let's try to call the function to see if it would work
        try:
            print("🧪 Testing simple purchase with call() first...")
            result = self.contract.functions.purchaseTicketSimple(event_id).call({'from': self.eoa.address})
            print(f"✅ Test call succeeded: {result}")
        except Exception as call_error:
            print(f"❌ Test call failed: {call_error}")
            print("This indicates the transaction would fail. Possible causes:")
            print("   1. No permission to purchase tickets")
            print("   2. Event doesn't exist")
            print("   3. All tickets are sold out")
            print("   4. MPC operations failing")
            return None
        
        # If test call succeeds, estimate gas
        try:
            gas_estimate = self.contract.functions.purchaseTicketSimple(event_id).estimate_gas({'from': self.eoa.address})
            print(f"⛽ Gas estimate: {gas_estimate}")
        except Exception as gas_error:
            print(f"❌ Gas estimation failed: {gas_error}")
            return None
            
        # Now try the actual transaction
        func = self.contract.functions.purchaseTicketSimple(event_id)
        
        # Use manual transaction building for better error handling
        try:
            tx = func.build_transaction({
                'from': self.eoa.address,
                'nonce': self.web3.eth.get_transaction_count(self.eoa.address),
                'gas': min(gas_estimate + 100000, self.gas_limit),  # Add buffer
                'gasPrice': self.web3.to_wei(self.gas_price_gwei, 'gwei')
            })
            
            print(f"📦 Built transaction: Gas={tx['gas']}, GasPrice={tx['gasPrice']}")
            
            # Sign and send
            signed_tx = self.web3.eth.account.sign_transaction(tx, self.eoa.key)
            tx_hash = self.web3.eth.send_raw_transaction(signed_tx.raw_transaction)
            
            print(f"📤 Transaction sent: {tx_hash.hex()}")
            print("⏳ Waiting for confirmation...")
            
            tx_receipt = self.web3.eth.wait_for_transaction_receipt(tx_hash)
            
            print(f"📥 Receipt received:")
            print(f"   Status: {tx_receipt.status}")
            print(f"   Gas Used: {tx_receipt.gasUsed}")
            print(f"   Block: {tx_receipt.blockNumber}")
            
            if tx_receipt.status == 0:
                print("❌ Transaction was mined but failed (reverted)")
                print("   This means the contract conditions were not met during execution")
                return None
            
        except Exception as tx_error:
            print(f"❌ Transaction execution failed: {tx_error}")
            return None

        # Get ticket ID from logs
        try:
            ticket_purchased_logs = self.contract.events.TicketPurchased().process_receipt(tx_receipt)
            if not ticket_purchased_logs:
                print("⚠️ No TicketPurchased event found in logs")
                return None
                
            ticket_id = ticket_purchased_logs[0]['args']['ticketId']
            print(f"✅ Ticket purchased! Ticket ID: {ticket_id}")
            return ticket_id
            
        except Exception as log_error:
            print(f"❌ Failed to parse ticket purchase logs: {log_error}")
            return None
        
    def prove_ownership(self, ticket_id):
        """
        Prove ownership of a ticket without revealing the price.
        
        Args:
            ticket_id (int): The ticket ID to prove ownership of
        """
        print(f"\n🔐 Proving ownership of ticket {ticket_id}...")
        
        func = self.contract.functions.proveOwnership(ticket_id)
        tx_receipt = exec_func_via_transaction(self.web3, self.eoa, func, self.tx_params)
        make_sure_tx_didnt_fail(tx_receipt)
        
        # Get proof from logs
        ownership_proof_logs = self.contract.events.OwnershipProof().process_receipt(tx_receipt)
        encrypted_proof = ownership_proof_logs[0]['args']['encryptedProof']
        
        # Decrypt the proof (only the owner can do this)
        decrypted_proof = self.eoa.decrypt_value(encrypted_proof)
        
        print(f"✅ Ownership proved! Encrypted proof: {encrypted_proof}")
        print(f"🔓 Decrypted proof: {decrypted_proof}")
        return decrypted_proof
        
    def get_my_ticket_price(self, ticket_id):
        """
        Get the encrypted price of a ticket (only owner can decrypt).
        
        Args:
            ticket_id (int): The ticket ID to get the price for
        """
        print(f"\n💰 Getting price for ticket {ticket_id}...")
        
        func = self.contract.functions.getMyTicketPrice(ticket_id)
        tx_receipt = exec_func_via_transaction(self.web3, self.eoa, func, self.tx_params)
        make_sure_tx_didnt_fail(tx_receipt)
        
        # Get encrypted value from logs
        encrypted_value_logs = self.contract.events.EncryptedValueForUser().process_receipt(tx_receipt)
        encrypted_price = encrypted_value_logs[0]['args']['value']
        
        # Decrypt the price (only the owner can do this)
        decrypted_price = self.eoa.decrypt_value(encrypted_price)
        
        print(f"✅ Encrypted price: {encrypted_price}")
        print(f"🔓 Decrypted price: {decrypted_price}")
        return decrypted_price
        
    def transfer_ticket(self, ticket_id, to_address):
        """
        Transfer a ticket to another address.
        
        Args:
            ticket_id (int): The ticket ID to transfer
            to_address (str): The address to transfer to
        """
        print(f"\n📤 Transferring ticket {ticket_id} to {to_address}...")
        
        func = self.contract.functions.transferTicket(ticket_id, to_address)
        tx_receipt = exec_func_via_transaction(self.web3, self.eoa, func, self.tx_params)
        make_sure_tx_didnt_fail(tx_receipt)
        
        print(f"✅ Ticket transferred successfully!")
        return tx_receipt
        
    def get_my_tickets(self):
        """Get all ticket IDs owned by the current account."""
        print(f"\n📋 Getting tickets for {self.eoa.address}...")
        
        ticket_ids = self.contract.functions.getMyTicketIds().call({'from': self.eoa.address})
        
        print(f"✅ Found {len(ticket_ids)} tickets: {ticket_ids}")
        return ticket_ids
        
    def get_event_info(self, event_id):
        """
        Get basic information about an event (non-encrypted fields only).
        
        Args:
            event_id (int): The event ID to get info for
        """
        print(f"\n📅 Getting info for event {event_id}...")
        
        event_info = self.contract.functions.events(event_id).call({'from': self.eoa.address})
        
        event_data = {
            'eventId': event_info[0],
            'organizer': event_info[1],
            'name': event_info[2],
            'eventDate': datetime.fromtimestamp(event_info[3]),
            'encryptedPrice': event_info[4],
            'encryptedTotalSupply': event_info[5],
            'encryptedTicketsSold': event_info[6],
            'resaleAllowed': event_info[7],
            'encryptedResaleMarkup': event_info[8]
        }
        
        print(f"✅ Event Info:")
        print(f"   📛 Name: {event_data['name']}")
        print(f"   👤 Organizer: {event_data['organizer']}")
        print(f"   📅 Date: {event_data['eventDate']}")
        print(f"   🔒 Encrypted Price: {event_data['encryptedPrice']}")
        print(f"   🔒 Encrypted Supply: {event_data['encryptedTotalSupply']}")
        print(f"   🔒 Encrypted Sold: {event_data['encryptedTicketsSold']}")
        print(f"   🔄 Resale Allowed: {event_data['resaleAllowed']}")
        
        return event_data
        
    def create_second_account(self):
        """Create and fund a second account for testing transfers."""
        print("\n👥 Creating second account for testing...")
        
        # Create new account
        alice_account = Account.create()
        
        # Fund the account
        print("💸 Funding second account...")
        tx_receipt = transfer_native(self.web3, self.eoa, alice_account.address, 0.5, self.gas_limit)
        make_sure_tx_didnt_fail(tx_receipt)
        
        # Generate encryption key
        generate_or_recover_aes(self.web3, alice_account)
        
        print(f"✅ Second account created: {alice_account.address}")
        return alice_account
        
    def debug_event_state(self, event_id):
        """
        Debug the state of an event to understand potential issues.
        
        Args:
            event_id (int): The event ID to debug
        """
        print(f"\n🔍 Debugging event {event_id} state...")
        
        try:
            # Get event info
            event_info = self.contract.functions.events(event_id).call({'from': self.eoa.address})
            
            print(f"📊 Event State:")
            print(f"   Event ID: {event_info[0]}")
            print(f"   Organizer: {event_info[1]}")
            print(f"   Name: {event_info[2]}")
            print(f"   Event Date: {datetime.fromtimestamp(event_info[3])}")
            print(f"   Encrypted Price: {event_info[4]}")
            print(f"   Encrypted Total Supply: {event_info[5]}")
            print(f"   Encrypted Tickets Sold: {event_info[6]}")
            print(f"   Resale Allowed: {event_info[7]}")
            print(f"   Encrypted Resale Markup: {event_info[8]}")
            
            # Check if event exists (non-zero eventId)
            if event_info[0] == 0:
                print("❌ Event does not exist (eventId is 0)")
                return False
            
            # Try to decrypt some values if we're the organizer
            if event_info[1].lower() == self.eoa.address.lower():
                print(f"🔓 You are the organizer, attempting to decrypt values...")
                try:
                    # The organizer should be able to decrypt their own event data
                    # However, this might not work with the current permission setup
                    print("   (Decryption would require specific permission setup)")
                except Exception as decrypt_error:
                    print(f"   Decryption failed: {decrypt_error}")
            
            print("✅ Event appears to be valid")
            return True
            
        except Exception as e:
            print(f"❌ Failed to get event state: {e}")
            return False
            
    def grant_purchase_permission(self, event_id, user_address):
        """
        Grant purchase permission to a specific user for an event.
        This is a workaround for the permission issue.
        
        Args:
            event_id (int): The event ID
            user_address (str): The address to grant permission to
        """
        print(f"\n🔑 Granting purchase permission to {user_address} for event {event_id}...")
        
        try:
            # We need to call setPermission directly on the contract
            # This requires the organizer to grant permissions
            func = self.contract.functions.setPermission((
                user_address,  # caller
                "op_purchase_ticket",  # operation
                True,  # active
                0,  # timestampBefore
                0,  # timestampAfter
                False,  # falseKey
                False,  # trueKey
                event_id,  # uintParameter
                "0x0000000000000000000000000000000000000000",  # addressParameter
                ""  # stringParameter
            ))
            
            tx_receipt = exec_func_via_transaction(self.web3, self.eoa, func, self.tx_params)
            make_sure_tx_didnt_fail(tx_receipt)
            
            print(f"✅ Permission granted successfully!")
            return True
            
        except Exception as e:
            print(f"❌ Failed to grant permission: {e}")
            return False
            
    def run_demo(self):
        """Run the complete demo."""
        print("🎭 Private Ticketing Demo Starting...")
        print("=" * 50)
        
        try:
            # 1. Initialize connection
            self.init_connection()
            
            # 2. Deploy contract
            contract_address = self.deploy_contract()
            
            # 3. Create an event
            event_id = self.create_event(
                name="COTI Privacy Concert",
                price=100,  # 100 tokens
                total_supply=1000,  # 1000 tickets
                resale_allowed=True,
                resale_markup=20  # 20% markup
            )
            
            # 4. Get event info
            self.get_event_info(event_id)
            
            # 4.5. Debug event state before purchase
            if not self.debug_event_state(event_id):
                print("❌ Event state check failed, aborting demo")
                return
            
            # 5. Purchase a ticket (permission should be set during event creation)
            ticket_id = self.purchase_ticket(event_id)
            
            if ticket_id is None:
                print("❌ Ticket purchase failed, aborting demo")
                return
            
            # 6. Check my tickets
            self.get_my_tickets()
            
            # 7. Prove ownership
            self.prove_ownership(ticket_id)
            
            # 8. Get ticket price (encrypted)
            self.get_my_ticket_price(ticket_id)
            
            # 9. Create second account and transfer ticket
            alice_account = self.create_second_account()
            self.transfer_ticket(ticket_id, alice_account.address)
            
            # 10. Verify transfer
            print("\n🔍 Verifying transfer...")
            remaining_tickets = self.get_my_tickets()
            assert ticket_id not in remaining_tickets, "Ticket should have been transferred"
            
            print("\n" + "=" * 50)
            print("🎉 Demo completed successfully!")
            print("📝 Summary:")
            print(f"   - Contract deployed at: {contract_address}")
            print(f"   - Event created with ID: {event_id}")
            print(f"   - Ticket purchased with ID: {ticket_id}")
            print(f"   - Ticket transferred to: {alice_account.address}")
            print("   - All operations used encrypted values for privacy!")
            
        except Exception as e:
            print(f"\n❌ Demo failed: {str(e)}")
            raise


def main():
    """Main entry point."""
    demo = PrivateTicketingDemo()
    demo.run_demo()


if __name__ == "__main__":
    main()
