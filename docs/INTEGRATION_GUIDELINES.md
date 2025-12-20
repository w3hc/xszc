# XiangsuZhongchuang Contract Integration Guidelines

This guide explains how to integrate the XiangsuZhongchuang pixel canvas contract with signature-based (meta-transaction) support.

## Overview

The XiangsuZhongchuang contract supports two ways to set pixels:

1. **Direct**: Users call `setPixel()` directly, paying gas themselves
2. **Signature-based**: Users sign a message off-chain, and a relayer submits it on-chain via `setPixelWithSignature()`

The signature-based approach enables **gasless transactions** for end users, where a relayer pays the gas fees while the pixel is still attributed to the original author.

## Contract Details

### Deployment Information

- **Network**: OP Mainnet (Optimism)
- **Contract Address**: `0x3BAe986D2C3c90CdDF9eCCa81CbFF4f463991f6c`
- **Source Code**: [src/XiangsuZhongchuang.sol](src/XiangsuZhongchuang.sol)
- **Chain ID**: 10

### Key Functions

```solidity
// Direct pixel setting (user pays gas)
function setPixel(int256 x, int256 y, uint8 colorIndex) public

// Signature-based pixel setting (relayer pays gas)
function setPixelWithSignature(
    address author,
    int256 x,
    int256 y,
    uint8 colorIndex,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) public
```

### Important Constants

- **Color Indices**: `0` = black, `1` = purple (#8c1c84), `2` = blue (#45a2f8), `3` = white (#FFFFFF)
- **Cooldown Period**: 24 hours per address
- **EIP-712 Domain Name**: "XiangsuZhongchuang"
- **EIP-712 Domain Version**: "1"

### EIP-712 Signature Structure

```solidity
struct SetPixel {
    address author;   // Address of the pixel author
    int256 x;         // X coordinate
    int256 y;         // Y coordinate
    uint8 colorIndex; // Color index (0-3)
    uint256 deadline; // Unix timestamp when signature expires
}
```

## Integration Examples

### Example 1: TypeScript with Ethers.js v6

#### User Side (Creating Signature)

```typescript
import { ethers } from 'ethers'

// EIP-712 Domain
const domain = {
  name: 'XiangsuZhongchuang',
  version: '1',
  chainId: 10, // OP Mainnet
  verifyingContract: '0x3BAe986D2C3c90CdDF9eCCa81CbFF4f463991f6c',
}

// EIP-712 Types
const types = {
  SetPixel: [
    { name: 'author', type: 'address' },
    { name: 'x', type: 'int256' },
    { name: 'y', type: 'int256' },
    { name: 'colorIndex', type: 'uint8' },
    { name: 'deadline', type: 'uint256' },
  ],
}

// Connect to user's wallet (e.g., MetaMask)
const provider = new ethers.BrowserProvider(window.ethereum)
const signer = await provider.getSigner()
const userAddress = await signer.getAddress()

// Pixel parameters
const x = 5
const y = -3
const colorIndex = 1 // Purple
const deadline = Math.floor(Date.now() / 1000) + 3600 // 1 hour from now

// Create the message
const message = {
  author: userAddress,
  x: x,
  y: y,
  colorIndex: colorIndex,
  deadline: deadline,
}

// Sign the typed data (EIP-712)
const signature = await signer.signTypedData(domain, types, message)

// Send to your backend relayer service
const response = await fetch('/api/relay-pixel', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    author: userAddress,
    x,
    y,
    colorIndex,
    deadline,
    signature,
  }),
})

console.log('Signature submitted to relayer:', await response.json())
```

#### Relayer Side (Submitting Transaction)

```typescript
import { ethers } from 'ethers'

// Backend relayer setup
const provider = new ethers.JsonRpcProvider(process.env.RPC_URL)
const relayerWallet = new ethers.Wallet(process.env.RELAYER_PRIVATE_KEY, provider)

const UNDERGROUND_ABI = [
  'function setPixelWithSignature(address author, int256 x, int256 y, uint8 colorIndex, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
]

const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, UNDERGROUND_ABI, relayerWallet)

// API endpoint handler
app.post('/api/relay-pixel', async (req, res) => {
  const { author, x, y, colorIndex, deadline, signature } = req.body

  // Validate deadline hasn't expired
  if (Math.floor(Date.now() / 1000) > deadline) {
    return res.status(400).json({ error: 'Signature expired' })
  }

  // Split signature into v, r, s components
  const sig = ethers.Signature.from(signature)
  const v = sig.v
  const r = sig.r
  const s = sig.s

  try {
    // Submit transaction on-chain
    const tx = await contract.setPixelWithSignature(author, x, y, colorIndex, deadline, v, r, s)

    console.log(`Transaction submitted: ${tx.hash}`)
    const receipt = await tx.wait()

    res.json({
      success: true,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    })
  } catch (error) {
    console.error('Relayer error:', error)
    res.status(500).json({ error: error.message })
  }
})
```

### Example 2: React Component

```typescript
import { useState } from "react";
import { ethers } from "ethers";

function PixelCanvas() {
  const [status, setStatus] = useState("");

  const setPixelWithSignature = async (x: number, y: number, colorIndex: number) => {
    try {
      setStatus("Connecting to wallet...");

      // Connect to MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();

      // Get chain ID for domain
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      setStatus("Please sign the message in your wallet...");

      // EIP-712 domain and types
      const domain = {
        name: "XiangsuZhongchuang",
        version: "1",
        chainId: chainId,
        verifyingContract: process.env.REACT_APP_CONTRACT_ADDRESS!,
      };

      const types = {
        SetPixel: [
          { name: "author", type: "address" },
          { name: "x", type: "int256" },
          { name: "y", type: "int256" },
          { name: "colorIndex", type: "uint8" },
          { name: "deadline", type: "uint256" },
        ],
      };

      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

      const message = {
        author: userAddress,
        x,
        y,
        colorIndex,
        deadline,
      };

      // Sign the message
      const signature = await signer.signTypedData(domain, types, message);

      setStatus("Submitting to relayer...");

      // Send to relayer
      const response = await fetch("/api/relay-pixel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          author: userAddress,
          x,
          y,
          colorIndex,
          deadline,
          signature,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setStatus(`Success! Tx: ${result.txHash}`);
      } else {
        setStatus(`Error: ${result.error}`);
      }
    } catch (error: any) {
      setStatus(`Error: ${error.message}`);
    }
  };

  return (
    <div>
      <h2>Set a Pixel</h2>
      <button onClick={() => setPixelWithSignature(0, 0, 1)}>
        Set Purple Pixel at (0,0)
      </button>
      <p>Status: {status}</p>
    </div>
  );
}

export default PixelCanvas;
```

## Important Considerations

### Security

1. **Signature Expiration**: Always set a reasonable `deadline` (e.g., 1 hour from now) to prevent replay attacks after long periods.

2. **Validate Before Relaying**: The relayer should validate:
   - Deadline hasn't expired
   - Coordinates are valid
   - Color index is valid (0-3)
   - User isn't on cooldown (optional pre-check to save gas)

3. **Rate Limiting**: Implement rate limiting on your relayer API to prevent abuse.

### Cost Optimization

1. **Batch Relaying**: If multiple users submit signatures simultaneously, consider batching them into a single transaction (requires a batch function - not currently implemented).

2. **Gas Price Strategy**: Use dynamic gas pricing to optimize relayer costs during network congestion.

3. **Fee Mechanism**: Consider implementing a fee mechanism where users pay the relayer in tokens or off-chain.

### User Experience

1. **Cooldown Display**: Show users when they can set their next pixel:

   ```typescript
   const canSetPixel = await contract.canSetPixel(userAddress)
   const cooldown = await contract.getRemainingCooldown(userAddress)
   ```

2. **Transaction Status**: Provide real-time updates on transaction status via websockets or polling.

3. **Error Handling**: Display user-friendly error messages for common errors:
   - `SignatureExpired`: "Your signature has expired, please try again"
   - `CooldownNotElapsed`: "Please wait 24 hours between pixel updates"
   - `InvalidSignature`: "Signature verification failed"
   - `CoordinatesOutOfBounds`: "Coordinates are outside the canvas"

## Testing

### Local Testing with Foundry

```bash
# Run all tests
forge test

# Run signature-specific tests
forge test --match-test "SetPixelWithSignature"

# Run with verbosity
forge test -vvv
```

### Test Signature Generation

```typescript
// Quick test to verify signature format
const testSignature = async () => {
  const provider = new ethers.BrowserProvider(window.ethereum)
  const signer = await provider.getSigner()

  const domain = {
    /* ... */
  }
  const types = {
    /* ... */
  }
  const message = {
    /* ... */
  }

  const signature = await signer.signTypedData(domain, types, message)
  const sig = ethers.Signature.from(signature)

  console.log('v:', sig.v)
  console.log('r:', sig.r)
  console.log('s:', sig.s)
}
```

## Contract Deployment

When deploying the XiangsuZhongchuang contract:

1. The `DOMAIN_SEPARATOR` is computed in the constructor using the deployment chain ID
2. If you redeploy to a different chain, the domain separator will be different
3. Make sure your frontend uses the correct chain ID in the EIP-712 domain

## Contract ABI

The complete ABI for the XiangsuZhongchuang contract:

```json
[
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "_max",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "COOLDOWN_PERIOD",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "DOMAIN_SEPARATOR",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "SETPIXEL_TYPEHASH",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "canSetPixel",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "colors",
    "inputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "coordToKey",
    "inputs": [
      {
        "name": "x",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "type": "function",
    "name": "expandGrid",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getAllPixels",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8[][]",
        "internalType": "uint8[][]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getAllPixelsWithCoords",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string[]",
        "internalType": "string[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPixel",
    "inputs": [
      {
        "name": "x",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPixelAuthor",
    "inputs": [
      {
        "name": "x",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getPixelCount",
    "inputs": [
      {
        "name": "author",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getRemainingCooldown",
    "inputs": [
      {
        "name": "user",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "grid",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "isValidCoord",
    "inputs": [
      {
        "name": "x",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "lastPixelTime",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "max",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "int256",
        "internalType": "int256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "nonces",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pixelAuthors",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "pixelCount",
    "inputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setPixel",
    "inputs": [
      {
        "name": "x",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "colorIndex",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "setPixelWithSignature",
    "inputs": [
      {
        "name": "author",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "x",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "internalType": "int256"
      },
      {
        "name": "colorIndex",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "deadline",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "v",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "r",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "s",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "shouldExpandGrid",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "GridExpanded",
    "inputs": [
      {
        "name": "newMax",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PixelCleared",
    "inputs": [
      {
        "name": "author",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "x",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "previousColor",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PixelOverwritten",
    "inputs": [
      {
        "name": "author",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "x",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "newColor",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "previousColor",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "PixelSet",
    "inputs": [
      {
        "name": "author",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "x",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "y",
        "type": "int256",
        "indexed": false,
        "internalType": "int256"
      },
      {
        "name": "colorIndex",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "previousColor",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "BackToBlack",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CooldownNotElapsed",
    "inputs": []
  },
  {
    "type": "error",
    "name": "CoordinatesOutOfBounds",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidColorIndex",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidSignature",
    "inputs": []
  },
  {
    "type": "error",
    "name": "MaxMustBePositive",
    "inputs": []
  },
  {
    "type": "error",
    "name": "SignatureExpired",
    "inputs": []
  }
]
```

## Additional Resources

- [EIP-712 Specification](https://eips.ethereum.org/EIPS/eip-712)
- [Ethers.js Documentation](https://docs.ethers.org/)
- [MetaMask Documentation](https://docs.metamask.io/)

## Support

For issues or questions, please refer to the contract source code at [src/XiangsuZhongchuang.sol](src/XiangsuZhongchuang.sol) and tests at [test/XiangsuZhongchuang.t.sol](test/XiangsuZhongchuang.t.sol).
