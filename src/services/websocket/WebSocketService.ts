import { ethers } from 'ethers';
import { EventEmitter } from 'events';

interface WebSocketConfig {
  url: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface ContractEvent {
  eventName: string;
  args: any[];
  transactionHash: string;
  blockNumber: number;
  timestamp: number;
}

interface GameStartedEvent extends ContractEvent {
  eventName: 'GameStarted';
  args: [string, ethers.BigNumber]; // [player, betAmount]
}

interface GameEndedEvent extends ContractEvent {
  eventName: 'GameEnded';
  args: [string, number, ethers.BigNumber]; // [player, result, payout]
}

interface GameRecoveredEvent extends ContractEvent {
  eventName: 'GameRecovered';
  args: [string, ethers.BigNumber]; // [player, refundAmount]
}

interface BetPlacedEvent extends ContractEvent {
  eventName: 'BetPlaced';
  args: [string, number, ethers.BigNumber]; // [player, selectedNumber, betAmount]
}

type DiceGameEvent =
  | GameStartedEvent
  | GameEndedEvent
  | GameRecoveredEvent
  | BetPlacedEvent;

interface WebSocketMessage {
  type: string;
  data: Record<string, unknown>;
}

interface WebSocketEventMap {
  message: WebSocketMessage;
  error: Error;
  close: CloseEvent;
  open: Event;
}

type WebSocketEventListener<T extends keyof WebSocketEventMap> = (
  event: WebSocketEventMap[T]
) => void;

declare interface WebSocketService {
  on(event: 'GameStarted', listener: (event: GameStartedEvent) => void): this;
  on(event: 'GameEnded', listener: (event: GameEndedEvent) => void): this;
  on(
    event: 'GameRecovered',
    listener: (event: GameRecoveredEvent) => void
  ): this;
  on(event: 'BetPlaced', listener: (event: BetPlacedEvent) => void): this;
  on(
    event: 'connected' | 'disconnected' | 'resubscribing' | 'resubscribed',
    listener: () => void
  ): this;
  on(event: 'error', listener: (error: Error) => void): this;
  on(event: 'maxReconnectAttemptsReached', listener: () => void): this;
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private provider: ethers.providers.WebSocketProvider | null = null;
  private reconnectAttempts = 0;
  private readonly config: Required<WebSocketConfig>;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, ethers.providers.Listener> = new Map();
  private url: string;
  private maxReconnectAttempts: number = 5;
  private listeners: Map<
    keyof WebSocketEventMap,
    Set<WebSocketEventListener<keyof WebSocketEventMap>>
  > = new Map();

  constructor(config: WebSocketConfig) {
    super();
    this.config = {
      reconnectInterval: 1000,
      maxReconnectAttempts: 5,
      ...config,
    };
    this.url = config.url;
  }

  public connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.ws = new WebSocket(this.url);
    this.setupEventHandlers();
  }

  private setupEventHandlers(): void {
    if (!this.ws) return;

    this.ws.onopen = (event: Event) => {
      this.reconnectAttempts = 0;
      this.emit('open', event);
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.emit('message', message);
      } catch (_error) {
        console.error('Failed to parse WebSocket message');
      }
    };

    this.ws.onerror = (event: Event) => {
      this.emit('error', new Error('WebSocket error occurred'));
    };

    this.ws.onclose = (event: CloseEvent) => {
      this.emit('close', event);
      this.handleReconnect();
    };
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    setTimeout(
      () => this.connect(),
      1000 * Math.pow(2, this.reconnectAttempts)
    );
  }

  public on<T extends keyof WebSocketEventMap>(
    event: T,
    listener: WebSocketEventListener<T>
  ): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners
      .get(event)
      ?.add(listener as WebSocketEventListener<keyof WebSocketEventMap>);
  }

  public off<T extends keyof WebSocketEventMap>(
    event: T,
    listener: WebSocketEventListener<T>
  ): void {
    this.listeners
      .get(event)
      ?.delete(listener as WebSocketEventListener<keyof WebSocketEventMap>);
  }

  private emit<T extends keyof WebSocketEventMap>(
    event: T,
    data: WebSocketEventMap[T]
  ): void {
    this.listeners.get(event)?.forEach(listener => {
      listener(data);
    });
  }

  public send(data: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  public close(): void {
    this.ws?.close();
    this.ws = null;
  }

  public async subscribeToContract(
    contractAddress: string,
    abi: ethers.ContractInterface,
    events: string[]
  ): Promise<void> {
    if (!this.provider) {
      throw new Error('WebSocket provider not initialized');
    }

    try {
      const contract = new ethers.Contract(contractAddress, abi, this.provider);

      events.forEach(eventName => {
        const listener = (...args: any[]) => {
          const event = args[args.length - 1];
          this.emit(eventName, {
            eventName,
            args: args.slice(0, -1),
            transactionHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: Date.now(),
          } as DiceGameEvent);
        };

        contract.on(eventName, listener);
        this.subscriptions.set(`${contractAddress}:${eventName}`, listener);
      });

      console.log(
        `Subscribed to events: ${events.join(', ')} for contract: ${contractAddress}`
      );
    } catch (error) {
      console.error('Failed to subscribe to contract events:', error);
      throw error;
    }
  }

  private async resubscribeAll(): Promise<void> {
    this.emit('resubscribing');

    try {
      // Get all unique contract addresses
      const contractAddresses = new Set(
        Array.from(this.subscriptions.keys()).map(key => key.split(':')[0])
      );

      // Resubscribe to each contract's events
      for (const address of contractAddresses) {
        const events = Array.from(this.subscriptions.keys())
          .filter(key => key.startsWith(address))
          .map(key => key.split(':')[1]);

        if (events.length > 0) {
          await this.subscribeToContract(
            address,
            // Note: You'll need to store the ABI somewhere to access it here
            [], // Placeholder for ABI
            events
          );
        }
      }

      this.emit('resubscribed');
    } catch (error) {
      console.error('Error during resubscription:', error);
      this.emit('error', error);
    }
  }

  public async unsubscribeFromContract(
    contractAddress: string,
    eventName?: string
  ): Promise<void> {
    if (!this.provider) {
      return;
    }

    if (eventName) {
      const key = `${contractAddress}:${eventName}`;
      const listener = this.subscriptions.get(key);
      if (listener) {
        this.provider.off(eventName, listener);
        this.subscriptions.delete(key);
      }
    } else {
      // Unsubscribe from all events for this contract
      Array.from(this.subscriptions.entries())
        .filter(([key]) => key.startsWith(contractAddress))
        .forEach(([key, listener]) => {
          const [, eventName] = key.split(':');
          this.provider?.off(eventName, listener);
          this.subscriptions.delete(key);
        });
    }
  }

  public async disconnect(): Promise<void> {
    if (this.provider) {
      // Clear all subscriptions
      this.subscriptions.clear();

      // Close the WebSocket connection
      this.provider._websocket.close();
      this.provider = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }

  public isConnected(): boolean {
    return this.provider?._websocket.readyState === WebSocket.OPEN;
  }

  public getProvider(): ethers.providers.WebSocketProvider | null {
    return this.provider;
  }
}

// Create and export a singleton instance
const wsService = new WebSocketService({
  url: process.env.VITE_WS_RPC_URL || 'wss://ws.xinfin.network',
  reconnectInterval: 1000,
  maxReconnectAttempts: 5,
});

export default wsService;
