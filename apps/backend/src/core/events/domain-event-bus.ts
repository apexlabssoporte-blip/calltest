export interface DomainEvent<T = unknown> {
  id: string;
  type: string;
  occurredAt: Date;
  payload: T;
}

export type EventHandler<T = unknown> = (
  event: DomainEvent<T>,
) => Promise<void> | void;

export class DomainEventBus {
  private handlers = new Map<string, Set<EventHandler<any>>>();

  public subscribe<T>(eventType: string, handler: EventHandler<T>): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    const handlerSet = this.handlers.get(eventType)!;
    handlerSet.add(handler);

    return () => {
      handlerSet.delete(handler);
      if (handlerSet.size === 0) {
        this.handlers.delete(eventType);
      }
    };
  }

  public async publish<T>(event: DomainEvent<T>): Promise<void> {
    const handlerSet = this.handlers.get(event.type);
    if (!handlerSet || handlerSet.size === 0) {
      return;
    }

    const promises = Array.from(handlerSet).map(async (handler) => {
      try {
        await handler(event);
      } catch (error) {
        console.error(
          `[DomainEventBus] Error handling event ${event.type}:`,
          error,
        );
      }
    });

    await Promise.allSettled(promises);
  }

  public clear(): void {
    this.handlers.clear();
  }
}

export const eventBus = new DomainEventBus();
