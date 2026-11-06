import { settingsService } from './settingsService';
import { AUDIO_FILE_KEYS } from './utils';

// Minimal valid 44-byte 1-sample 8kHz mono PCM silent WAV data URI for background keep-alive
const SILENT_WAV_DATA_URI =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';

export type SoundSettingKey = 'start-sound' | 'end-sound' | 'interval-sound';

export class NAudioPlayer {
  private static _instance: NAudioPlayer | null = null;

  public static get instance(): NAudioPlayer {
    if (!NAudioPlayer._instance) {
      NAudioPlayer._instance = new NAudioPlayer();
    }
    return NAudioPlayer._instance;
  }

  private currentAudio: HTMLAudioElement | null = null;
  private keepAliveAudio: HTMLAudioElement | null = null;

  private constructor() {}

  public async play(audioFile: string): Promise<void> {
    await this.stopPrevious();

    const rawVolume = settingsService.getValue('volume') ?? 6;
    const normalizedVolume = Math.max(0, Math.min(1, rawVolume / 10));

    if (normalizedVolume === 0) {
      return;
    }

    try {
      const audio = new Audio(`/sounds/${audioFile}`);
      audio.volume = normalizedVolume;
      this.currentAudio = audio;
      await audio.play();
    } catch {
      // Ignore autoplay errors in headless/test environments
    }
  }

  public async stopPrevious(): Promise<number> {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch {
        // Ignore errors
      }
      this.currentAudio = null;
    }
    return 0;
  }

  public async playSound(soundKey: SoundSettingKey): Promise<void> {
    const audioIndex = settingsService.getValue(soundKey) ?? 0;
    const audioFile = AUDIO_FILE_KEYS[audioIndex] ?? AUDIO_FILE_KEYS[0];
    await this.play(audioFile);
  }

  public startBackgroundKeepAlive(): void {
    if (this.keepAliveAudio) return;
    try {
      const audio = new Audio(SILENT_WAV_DATA_URI);
      audio.loop = true;
      audio.volume = 0.001;
      this.keepAliveAudio = audio;
      void audio.play().catch(() => {
        // Ignore if blocked in test environment
      });
    } catch {
      // Ignore in test environment
    }
  }

  public stopBackgroundKeepAlive(): void {
    if (this.keepAliveAudio) {
      try {
        this.keepAliveAudio.pause();
        this.keepAliveAudio.currentTime = 0;
      } catch {
        // Ignore
      }
      this.keepAliveAudio = null;
    }
  }
}

export const audioPlayer = NAudioPlayer.instance;
