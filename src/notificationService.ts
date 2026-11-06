import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { settingsService } from './settingsService';
import { AUDIO_FILE_KEYS, SECONDARY_COLOR } from './utils';

export const ENDING_NOTIFICATION_ID = 100;
export const STARTING_NOTIFICATION_ID = 101;
// intervalNotification uses 200-299
export const INTERVAL_NOTIFICATION_ID = 200;

export type NotificationDisplayedCallback = (id: number) => void;

class NotificationService {
  private initialized = false;
  private listeners: Set<NotificationDisplayedCallback> = new Set();
  private webTimers: Map<number, ReturnType<typeof setTimeout>> = new Map();

  public onNotificationDisplayed(callback: NotificationDisplayedCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  private emitDisplayed(id: number): void {
    for (const listener of this.listeners) {
      listener(id);
    }
  }

  public async initNotifications(): Promise<void> {
    if (this.initialized) return;
    this.initialized = true;

    try {
      if (Capacitor.isNativePlatform()) {
        await LocalNotifications.createChannel({
          id: 'timer-main',
          name: 'Timer notifications',
          description: 'Critical notifications displayed during meditation',
          importance: 5,
          visibility: 1,
          lights: true,
          lightColor: SECONDARY_COLOR,
          vibration: false,
        });

        await LocalNotifications.createChannel({
          id: 'timer-support',
          name: 'Timer (support)',
          description: 'Support notifications. Not visible but must stay enabled',
          importance: 3,
          visibility: 1,
          lights: true,
          lightColor: SECONDARY_COLOR,
          vibration: false,
        });
      }

      await LocalNotifications.addListener('localNotificationReceived', (notification) => {
        this.emitDisplayed(notification.id);
      });
    } catch {
      // Fallback when running in plain browser or test environment
    }
  }

  public async checkAndRequestPermissions(): Promise<boolean> {
    try {
      const status = await LocalNotifications.checkPermissions();
      if (status.display === 'granted') {
        return true;
      }
      const requested = await LocalNotifications.requestPermissions();
      return requested.display === 'granted';
    } catch {
      // Allow timer to function even if notifications permission API is unavailable in test/browser
      return true;
    }
  }

  private getSoundFileForSetting(key: 'start-sound' | 'end-sound' | 'interval-sound'): string {
    const idx = settingsService.getValue(key) ?? 0;
    return AUDIO_FILE_KEYS[idx] ?? AUDIO_FILE_KEYS[0];
  }

  public async scheduleEndingNotification(intervalSeconds: number): Promise<void> {
    const triggerDate = new Date(Date.now() + intervalSeconds * 1000);
    const soundFile = this.getSoundFileForSetting('end-sound');

    this.scheduleWebTimerFallback(ENDING_NOTIFICATION_ID, intervalSeconds);

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: ENDING_NOTIFICATION_ID,
            channelId: 'timer-main',
            group: 'timer-end',
            title: 'Meditation ended',
            body: 'Swipe to dismiss',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            autoCancel: true,
            sound: soundFile,
            schedule: {
              at: triggerDate,
              allowWhileIdle: true,
            },
          },
        ],
      });
    } catch {
      // Fallback timer already scheduled
    }
  }

  public async scheduleStartingNotification(intervalSeconds: number): Promise<void> {
    const triggerDate = new Date(Date.now() + intervalSeconds * 1000);
    const soundFile = this.getSoundFileForSetting('start-sound');

    this.scheduleWebTimerFallback(STARTING_NOTIFICATION_ID, intervalSeconds);

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: STARTING_NOTIFICATION_ID,
            channelId: 'timer-support',
            group: 'timer-start',
            title: 'Meditation started',
            body: 'Tap to return to app',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            autoCancel: true,
            sound: soundFile,
            schedule: {
              at: triggerDate,
              allowWhileIdle: true,
            },
          },
        ],
      });
    } catch {
      // Fallback timer already scheduled
    }
  }

  public async scheduleIntervalNotification(
    intervalSeconds: number,
    id: number = INTERVAL_NOTIFICATION_ID
  ): Promise<void> {
    const triggerDate = new Date(Date.now() + intervalSeconds * 1000);
    const soundFile = this.getSoundFileForSetting('interval-sound');

    this.scheduleWebTimerFallback(id, intervalSeconds);

    try {
      await LocalNotifications.schedule({
        notifications: [
          {
            id,
            channelId: 'timer-support',
            group: 'timer-interval',
            title: 'Meditation interval',
            body: 'Tap to return to app',
            smallIcon: 'ic_notification',
            largeIcon: 'ic_launcher',
            autoCancel: true,
            sound: soundFile,
            schedule: {
              at: triggerDate,
              allowWhileIdle: true,
            },
          },
        ],
      });
    } catch {
      // Fallback timer already scheduled
    }
  }

  private scheduleWebTimerFallback(id: number, intervalSeconds: number): void {
    this.clearWebTimerFallback(id);
    if (!Capacitor.isNativePlatform()) {
      const timer = setTimeout(() => {
        this.webTimers.delete(id);
        this.emitDisplayed(id);
      }, intervalSeconds * 1000);
      this.webTimers.set(id, timer);
    }
  }

  private clearWebTimerFallback(id: number): void {
    const existing = this.webTimers.get(id);
    if (existing) {
      clearTimeout(existing);
      this.webTimers.delete(id);
    }
  }

  public async cancelNotifications(ids: number[]): Promise<void> {
    for (const id of ids) {
      this.clearWebTimerFallback(id);
    }
    if (ids.length === 0) return;
    try {
      await LocalNotifications.cancel({
        notifications: ids.map((id) => ({ id })),
      });
    } catch {
      // Ignore in test/browser fallback
    }
  }

  public async dismissNotification(id: number): Promise<void> {
    this.clearWebTimerFallback(id);
    try {
      await LocalNotifications.removeDeliveredNotifications({
        notifications: [{ id, title: '', body: '' }],
      });
    } catch {
      // Ignore if not supported on web
    }
  }

  public async cancelAll(): Promise<void> {
    for (const timer of this.webTimers.values()) {
      clearTimeout(timer);
    }
    this.webTimers.clear();
    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map((n) => ({ id: n.id })),
        });
      }
    } catch {
      // Ignore in test/browser fallback
    }
  }
}

export const notificationService = new NotificationService();
