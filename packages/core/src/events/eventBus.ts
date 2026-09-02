type EventHandler<T = unknown> = (payload: T) => void | Promise<void>

export class EventBus {
  private readonly _listeners = new Map<string, Set<EventHandler>>()

  on<T = unknown>(event: string, handler: EventHandler<T>): () => void {
    if (!this._listeners.has(event)) {
      this._listeners.set(event, new Set())
    }
    this._listeners.get(event)!.add(handler as EventHandler)
    return () => this.off(event, handler)
  }

  once<T = unknown>(event: string, handler: EventHandler<T>): void {
    const wrapper: EventHandler = (payload) => {
      void (handler as EventHandler)(payload)
      this.off(event, wrapper)
    }
    this.on(event, wrapper)
  }

  off<T = unknown>(event: string, handler: EventHandler<T>): void {
    this._listeners.get(event)?.delete(handler as EventHandler)
  }

  emit<T = unknown>(event: string, payload?: T): void {
    this._listeners.get(event)?.forEach(handler => void handler(payload))
  }

  clear(event?: string): void {
    if (event) {
      this._listeners.delete(event)
    } else {
      this._listeners.clear()
    }
  }
}
