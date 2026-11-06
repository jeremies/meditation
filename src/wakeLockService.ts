class WakeLockService {
  private sentinel: WakeLockSentinel | null = null;
  private shouldHoldLock = false;

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (this.shouldHoldLock && document.visibilityState === 'visible') {
          void this.acquireLock();
        }
      });
    }
  }

  public get enabled(): boolean {
    return this.shouldHoldLock && this.sentinel !== null && !this.sentinel.released;
  }

  public async enable(): Promise<void> {
    this.shouldHoldLock = true;
    await this.acquireLock();
  }

  public async disable(): Promise<void> {
    this.shouldHoldLock = false;
    if (this.sentinel) {
      try {
        await this.sentinel.release();
      } catch {
        // Ignore release errors
      }
      this.sentinel = null;
    }
  }

  private async acquireLock(): Promise<void> {
    if (typeof navigator === 'undefined' || !('wakeLock' in navigator)) {
      return;
    }
    try {
      if (this.sentinel && !this.sentinel.released) {
        return;
      }
      this.sentinel = await navigator.wakeLock.request('screen');
    } catch {
      // WakeLock request can fail if battery saver is active or page is hidden
    }
  }
}

export const wakeLockService = new WakeLockService();
