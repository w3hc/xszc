// Contract configuration for XiangsuZhongchuang
export const CONTRACT_ADDRESS = '0xFDBfA059ed1C7d32eCF2df6BB8b6C46A42a34ABa'
export const RPC_URL = 'https://mainnet.optimism.io'
export const CHAIN_ID = 10 // OP Mainnet

// Contract ABI - only including the functions we need
export const CONTRACT_ABI = [
  // Read functions
  'function max() view returns (int256)',
  'function colors(uint256) view returns (string)',
  'function getPixel(int256 x, int256 y) view returns (uint8)',
  'function getAllPixels() view returns (uint8[][] memory)',
  'function canSetPixel(address user) view returns (bool)',
  'function getRemainingCooldown(address user) view returns (uint256)',
  'function getPixelAuthor(int256 x, int256 y) view returns (address)',
  'function getPixelCount(address author) view returns (uint256)',
  'function shouldExpandGrid() view returns (bool)',

  // Write functions
  'function setPixel(int256 x, int256 y, uint8 colorIndex)',
  'function setPixelWithSignature(address author, int256 x, int256 y, uint8 colorIndex, uint256 deadline, uint8 v, bytes32 r, bytes32 s)',
  'function expandGrid()',

  // Events
  'event PixelSet(address indexed author, int256 x, int256 y, uint8 colorIndex, uint8 previousColor)',
  'event PixelOverwritten(address indexed author, int256 x, int256 y, uint8 newColor, uint8 previousColor)',
  'event PixelCleared(address indexed author, int256 x, int256 y, uint8 previousColor)',
  'event GridExpanded(int256 newMax)',
] as const

// Color mapping (matches contract)
export const COLORS = {
  0: '#000000', // black
  1: '#8c1c84', // purple
  2: '#45a2f8', // blue
  3: '#FFFFFF', // white
} as const

export const COLOR_NAMES = {
  0: 'black',
  1: 'purple',
  2: 'blue',
  3: 'white',
} as const
