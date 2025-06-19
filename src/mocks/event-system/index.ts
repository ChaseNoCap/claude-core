import { EventEmitter } from 'events';

export interface IEvent<T = any> {
  type: string;
  sessionId?: string;
  timestamp: Date;
  data: T;
}

export interface IEventBus {
  emit<T>(event: IEvent<T>): Promise<void>;
  on<T>(eventType: string, handler: (event: IEvent<T>) => void): void;
  off<T>(eventType: string, handler: (event: IEvent<T>) => void): void;
}

export class EventBus implements IEventBus {
  private emitter = new EventEmitter();

  async emit<T>(event: IEvent<T>): Promise<void> {
    this.emitter.emit(event.type, event);
  }

  on<T>(eventType: string, handler: (event: IEvent<T>) => void): void {
    this.emitter.on(eventType, handler);
  }

  off<T>(eventType: string, handler: (event: IEvent<T>) => void): void {
    this.emitter.off(eventType, handler);
  }
}
