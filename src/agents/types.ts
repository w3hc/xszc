export interface Agent {
  id: string
  name: string
  type: AgentType
  status: AgentStatus
  execute(): Promise<void>
  stop(): Promise<void>
}

export enum AgentType {
  CONTRACT_MONITOR = 'CONTRACT_MONITOR',
  GRID_ANALYZER = 'GRID_ANALYZER',
  AUTOMATION = 'AUTOMATION',
}

export enum AgentStatus {
  IDLE = 'IDLE',
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  ERROR = 'ERROR',
}

export interface AgentConfig {
  pollingInterval?: number
  maxRetries?: number
  onError?: (error: Error) => void
}
