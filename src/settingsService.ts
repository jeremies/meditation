import { AUDIO_FILE_NAMES } from './utils';

export interface AppSettings {
  volume: number;
  'start-sound': number;
  'end-sound': number;
  'interval-sound': number;
  'interval-time': string;
  'intervals-enabled': boolean;
  'show-countdown': boolean;
  'delay-enabled': boolean;
  'delay-time': string;
  'screen-wakelock': boolean;
  'timer-minutes': number;
}

const STORAGE_KEY = 'meditation_app_settings';

export function getDefaultSettings(): AppSettings {
  const startSoundId = Math.max(0, AUDIO_FILE_NAMES.indexOf('Singing Bowl'));
  const endSoundId = Math.max(0, AUDIO_FILE_NAMES.indexOf('Burma Bell'));
  const intervalSoundId = Math.max(0, AUDIO_FILE_NAMES.indexOf('Meditation Bell'));

  return {
    volume: 6,
    'start-sound': startSoundId,
    'end-sound': endSoundId,
    'interval-sound': intervalSoundId,
    'interval-time': '5',
    'intervals-enabled': false,
    'show-countdown': true,
    'delay-enabled': false,
    'delay-time': '5',
    'screen-wakelock': false,
    'timer-minutes': 15,
  };
}

type SettingsListener = () => void;

class SettingsService {
  private settings: AppSettings;
  private listeners: Set<SettingsListener> = new Set();

  constructor() {
    this.settings = this.loadFromStorage();
  }

  private loadFromStorage(): AppSettings {
    const defaults = getDefaultSettings();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.saveToStorage(defaults);
        return defaults;
      }
      const parsed = JSON.parse(raw) as Partial<AppSettings>;
      const merged: AppSettings = {
        ...defaults,
        ...parsed,
      };
      return merged;
    } catch {
      return defaults;
    }
  }

  private saveToStorage(settings: AppSettings): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // Ignore storage quota errors in restricted environments
    }
  }

  public getAll(): AppSettings {
    return { ...this.settings };
  }

  public getValue<K extends keyof AppSettings>(key: K): AppSettings[K] {
    return this.settings[key];
  }

  public setValue<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
    this.settings = {
      ...this.settings,
      [key]: value,
    };
    this.saveToStorage(this.settings);
    this.notifyListeners();
  }

  public resetToDefaults(): void {
    this.settings = getDefaultSettings();
    this.saveToStorage(this.settings);
    this.notifyListeners();
  }

  public addListener(listener: SettingsListener): void {
    this.listeners.add(listener);
  }

  public removeListener(listener: SettingsListener): void {
    this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const settingsService = new SettingsService();
