type Listener = (...args: unknown[]) => void;

class EventBus {
  private listeners: Map<string, Set<Listener>> = new Map();

  on(event: string, listener: Listener): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(listener);
    return () => this.off(event, listener);
  }

  off(event: string, listener: Listener): void {
    this.listeners.get(event)?.delete(listener);
  }

  emit(event: string, ...args: unknown[]): void {
    this.listeners.get(event)?.forEach((fn) => {
      try {
        fn(...args);
      } catch (e) {
        console.warn(`[EventBus] Error in listener for "${event}":`, e);
      }
    });
  }
}

export const eventBus = new EventBus();

export const Events = {
  HOME_STATE_CHANGED: 'home_state_changed',
  TRIP_SAVED: 'trip_saved',
  LEDGER_UPDATED: 'ledger_updated',
  PET_STATE_CHANGED: 'pet_state_changed',
  INVENTORY_CHANGED: 'inventory_changed',
  SETTINGS_CHANGED: 'settings_changed',
  NAVIGATION_STATE_CHANGED: 'navigation_state_changed',
  REPLAY_ONBOARDING: 'replay_onboarding',
  BADGES_CHANGED: 'badges_changed',
  CHALLENGES_CHANGED: 'challenges_changed',
} as const;
