import { Agent, AgentConfig, AgentStatus, AgentType } from './types';

export abstract class BaseAgent implements Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus = AgentStatus.IDLE;
  protected config: AgentConfig;
  protected intervalId?: NodeJS.Timeout;

  constructor(id: string, name: string, type: AgentType, config: AgentConfig = {}) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.config = {
      pollingInterval: 60000, // Default 1 minute
      maxRetries: 3,
      ...config,
    };
  }

  async execute(): Promise<void> {
    if (this.status === AgentStatus.RUNNING) {
      throw new Error(`Agent ${this.name} is already running`);
    }

    this.status = AgentStatus.RUNNING;
    console.log(`Starting agent: ${this.name}`);

    try {
      await this.initialize();
      
      if (this.config.pollingInterval) {
        this.intervalId = setInterval(async () => {
          try {
            await this.run();
          } catch (error) {
            this.handleError(error as Error);
          }
        }, this.config.pollingInterval);
        
        await this.run();
      }
    } catch (error) {
      this.handleError(error as Error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    console.log(`Stopping agent: ${this.name}`);
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }
    
    await this.cleanup();
    this.status = AgentStatus.STOPPED;
  }

  protected handleError(error: Error): void {
    console.error(`Error in agent ${this.name}:`, error);
    this.status = AgentStatus.ERROR;
    
    if (this.config.onError) {
      this.config.onError(error);
    }
  }

  protected abstract initialize(): Promise<void>;
  protected abstract run(): Promise<void>;
  protected abstract cleanup(): Promise<void>;
}