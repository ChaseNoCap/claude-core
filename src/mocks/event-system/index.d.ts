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
export declare class EventBus implements IEventBus {
  private emitter;
  emit<T>(event: IEvent<T>): Promise<void>;
  on<T>(eventType: string, handler: (event: IEvent<T>) => void): void;
  off<T>(eventType: string, handler: (event: IEvent<T>) => void): void;
}
//# sourceMappingURL=index.d.ts.map
