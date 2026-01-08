import { BaseAgent } from './BaseAgent';
import { AgentConfig, AgentType } from './types';
import { ethers } from 'ethers';

interface ContractMonitorConfig extends AgentConfig {
  contractAddress: string;
  rpcUrl: string;
  events?: string[];
}

export class ContractMonitorAgent extends BaseAgent {
  private provider?: ethers.Provider;
  private contract?: ethers.Contract;
  private contractConfig: ContractMonitorConfig;

  constructor(id: string, name: string, config: ContractMonitorConfig) {
    super(id, name, AgentType.CONTRACT_MONITOR, config);
    this.contractConfig = config;
  }

  protected async initialize(): Promise<void> {
    this.provider = new ethers.JsonRpcProvider(this.contractConfig.rpcUrl);
    
    const abi = [
      "event PixelUpdated(uint256 indexed x, uint256 indexed y, uint256 color, address indexed updater)",
      "event GridExpanded(uint256 newSize)",
      "function getPixel(uint256 x, uint256 y) view returns (uint256)",
      "function gridSize() view returns (uint256)"
    ];
    
    this.contract = new ethers.Contract(
      this.contractConfig.contractAddress,
      abi,
      this.provider
    );

    console.log(`Initialized contract monitor for ${this.contractConfig.contractAddress}`);
  }

  protected async run(): Promise<void> {
    if (!this.contract || !this.provider) {
      throw new Error('Contract not initialized');
    }

    try {
      const currentBlock = await this.provider.getBlockNumber();
      console.log(`Checking contract at block ${currentBlock}`);

      const gridSize = await this.contract.gridSize();
      console.log(`Current grid size: ${gridSize}`);

      const events = await this.contract.queryFilter(
        this.contract.filters.PixelUpdated(),
        currentBlock - 100,
        currentBlock
      );

      if (events.length > 0) {
        console.log(`Found ${events.length} pixel updates in the last 100 blocks`);
        events.forEach((event) => {
          const { x, y, color, updater } = event.args!;
          console.log(`Pixel (${x}, ${y}) updated to color ${color} by ${updater}`);
        });
      }
    } catch (error) {
      console.error('Error monitoring contract:', error);
      throw error;
    }
  }

  protected async cleanup(): Promise<void> {
    this.provider = undefined;
    this.contract = undefined;
    console.log('Contract monitor cleanup completed');
  }
}