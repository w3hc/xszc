import { ethers } from 'ethers'
import { CONTRACT_ADDRESS, CONTRACT_ABI, RPC_URL, COLOR_NAMES } from '@/config/contract'

// Create a provider for reading from the contract
export function getProvider() {
  return new ethers.JsonRpcProvider(RPC_URL)
}

// Create a contract instance for reading
export function getContract() {
  const provider = getProvider()
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
}

// Create a contract instance with signer for writing
export function getContractWithSigner(signer: ethers.Signer) {
  return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer)
}

// Read the current grid state
export async function getGridState() {
  const contract = getContract()
  const [maxValue, pixels] = await Promise.all([contract.max(), contract.getAllPixels()])

  return {
    max: Number(maxValue),
    pixels: pixels as number[][],
  }
}

// Get a single pixel color
export async function getPixelColor(x: number, y: number): Promise<number> {
  const contract = getContract()
  const colorIndex = await contract.getPixel(x, y)
  return Number(colorIndex)
}

// Get pixel author
export async function getPixelAuthor(x: number, y: number): Promise<string> {
  const contract = getContract()
  return await contract.getPixelAuthor(x, y)
}

// Check if a user can set a pixel (cooldown check)
export async function canUserSetPixel(address: string): Promise<boolean> {
  const contract = getContract()
  return await contract.canSetPixel(address)
}

// Get remaining cooldown for a user
export async function getRemainingCooldown(address: string): Promise<number> {
  const contract = getContract()
  const cooldown = await contract.getRemainingCooldown(address)
  return Number(cooldown)
}

// Check if grid should expand
export async function shouldGridExpand(): Promise<boolean> {
  const contract = getContract()
  return await contract.shouldExpandGrid()
}

// Set a pixel (requires signer)
export async function setPixel(signer: ethers.Signer, x: number, y: number, colorIndex: number) {
  const contract = getContractWithSigner(signer)
  const tx = await contract.setPixel(x, y, colorIndex)
  return await tx.wait()
}

// Set a pixel with signature (gasless, requires relayer)
export async function setPixelWithSignature(
  author: string,
  x: number,
  y: number,
  colorIndex: number,
  deadline: number,
  v: number,
  r: string,
  s: string
) {
  const provider = getProvider()
  const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider)
  const tx = await contract.setPixelWithSignature(author, x, y, colorIndex, deadline, v, r, s)
  return await tx.wait()
}

// Expand grid (requires signer)
export async function expandGrid(signer: ethers.Signer) {
  const contract = getContractWithSigner(signer)
  const tx = await contract.expandGrid()
  return await tx.wait()
}

// Convert grid pixels to a format suitable for rendering
export function convertGridToSquares(pixels: number[][], max: number) {
  const squares: Array<{
    id: string
    gridX: number
    gridY: number
    color: 'purple' | 'blue' | 'white' | 'black'
  }> = []

  // pixels is a 2D array where:
  // - first index is row (y-axis from max to -max)
  // - second index is column (x-axis from -max to max)
  for (let rowIndex = 0; rowIndex < pixels.length; rowIndex++) {
    const y = max - rowIndex // Convert row index to y coordinate
    for (let colIndex = 0; colIndex < pixels[rowIndex].length; colIndex++) {
      const x = -max + colIndex // Convert column index to x coordinate
      const colorIndex = pixels[rowIndex][colIndex]

      // Only add non-black pixels
      if (colorIndex !== 0) {
        const colorName = COLOR_NAMES[colorIndex as keyof typeof COLOR_NAMES]
        squares.push({
          id: `${x}-${y}`,
          gridX: x,
          gridY: y,
          color: colorName as 'purple' | 'blue' | 'white' | 'black',
        })
      }
    }
  }

  return squares
}

// No-op function for backward compatibility
// Real-time event listening removed - just poll when needed
export function subscribeToEvents(
  _onPixelSet?: (author: string, x: number, y: number, colorIndex: number) => void,
  _onGridExpanded?: (newMax: number) => void
) {
  // Return no-op cleanup function
  return () => {
    // No cleanup needed
  }
}

// Get stats from the contract
export async function getContractStats() {
  const contract = getContract()
  const provider = getProvider()

  // Get current grid size
  const maxValue = await contract.max()
  const max = Number(maxValue)

  // Get current block timestamp for calculations
  const currentBlock = await provider.getBlock('latest')
  const currentTimestamp = currentBlock?.timestamp || 0

  return {
    gridSize: max,
    totalPixelsSet: 0,
    totalMoves: 0,
    totalCoAuthors: 0,
    currentTimestamp,
  }
}
