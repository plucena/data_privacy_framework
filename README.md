## DATA PRIVACY FRAMEWORK DEMO

DataPrivacyFramework.sol enables building privacy-preserving applications like a  ticketing system, where ticket prices, supplies, and purchase history remain private while still enabling necessary computations and verifications.

### Key Benefits

1. **Privacy**: Values are encrypted end-to-end, never visible on-chain
2. **Computability**: Can perform operations on encrypted data
3. **Access Control**: Built-in permission system controls who can access what
4. **Selective Disclosure**: Results can be encrypted for specific users
5. **Auditability**: Computations are verifiable without revealing inputs

![1750851345677](flow.png)

## How to Use DataPrivacyFrameworkMpc

### 1. Contract Setup

```
import "@coti-io/coti-contracts/contracts/access/DataPrivacyFramework/extensions/DataPrivacyFrameworkMpc.sol";

contract YourContract is DataPrivacyFrameworkMpc {
    constructor() DataPrivacyFrameworkMpc(false, false) {
        // false, false = default permissions for addresses and operations
  
        // Set up permissions
        setPermission(InputData(msg.sender, "admin", true, 0, 0, false, false, 0, address(0), ""));
    }
}
```

### 2. **Storing Encrypted Data**

```
function setItem(string memory name, itUint64 calldata value) 
    external 
    onlyAllowedUserOperation("op_set_item", 0, address(0), "")
{
    // Validate and convert user input to computation-ready format
    gtUint64 gtEncryptedValue = MpcCore.validateCiphertext(value);
  
    // Store as encrypted ciphertext
    encryptedValues[name] = MpcCore.offBoard(gtEncryptedValue);
}
```

### 3. **Retrieving Encrypted Data**

```
function getItem(string memory name) 
    external 
    onlyAllowedUserOperation("op_get_item", 0, address(0), name)
{
    // Convert stored ciphertext to computation format
    gtUint64 gtEncryptedValue = MpcCore.onBoard(encryptedValues[name]);
  
    // Encrypt specifically for the requesting user
    ctUint64 ctEncryptedInput = MpcCore.offBoardToUser(gtEncryptedValue, msg.sender);
  
    // Emit as event (cannot return encrypted values directly)
    emit encryptedUint(msg.sender, ctEncryptedInput);
}
```

### 4. **Computing on Encrypted Data**

```
function getClearOilCotiPrice() 
    external 
    onlyAllowedUserOperation("op_get_clear_oil_usd_price", 0, address(0), "")
    onlyAllowedUserOperation("op_get_clear_coti_usd_price", 0, address(0), "")
{
    // Load encrypted values
    gtUint64 a = MpcCore.onBoard(encryptedValues["oil_usd_price"]);
    gtUint64 b = MpcCore.onBoard(encryptedValues["coti_usd_price"]);
  
    // Perform computation on encrypted data
    gtUint64 c = MpcCore.div(a, b); // Oil/COTI ratio
  
    // Decrypt and emit result
    emit clearUint(msg.sender, MpcCore.decrypt(c));
}
```


```
**PROMPT FOR SMART CONTRACT**`
@Cluade4 @DataPrivacyFramework.sol

A ticketing system that ensures user privacy. 
Users can purchase and store event tickets digitally, 
with each ticket uniquely tied to its owner to prevent counterfeiting and unauthorized resale. Implementing garbled circuits for privacy allows users to prove ticket ownership without revealing personal information. Smart contracts can automate ticket transfers and enforce resale policies, ensuring fair pricing and reducing fraud.
```

RESULT --> solidity/PrivateTicketingDebug.sol


### 5. **Client-Side Usage** (TypeScript/JavaScript)

```
import { Wallet, itUint } from '@coti-io/coti-ethers';

// Initialize wallet and onboard for encryption
const wallet = new Wallet(privateKey, provider);
await wallet.generateOrRecoverAes();

// Encrypt data for contract input
const encryptedPrice: itUint = await wallet.encryptValue(
    100n, // price value
    contractAddress,
    contract.interface.getFunction("setItem").selector
);

// Call contract with encrypted data
await contract.setItem("oil_price", encryptedPrice);

 
```


> ```
> RUN PYTHON DEMO
>
> cd solidity
> python3 -m venv coti
> source coti/bin/activate
> pip install -r requirements.txt
> python private_ticketing_demo_fixed.py 
>
> ```

PROMPTS
