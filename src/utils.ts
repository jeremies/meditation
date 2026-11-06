export const MAX_MEDITATION_TIME = 300;

export const BACKGROUND_COLOR = '#121212';
export const SURFACE_COLOR = '#212121';
export const PRIMARY_COLOR = '#8C9EFF';
export const SECONDARY_COLOR = '#FF8A80';

export const AUDIO_FILES: Record<string, string> = {
  'bell_burma.ogg': 'Burma Bell',
  'bell_burma_three.ogg': 'Three Burma Bells',
  'bell_indian.ogg': 'Indian Bell',
  'bell_meditation.ogg': 'Meditation Bell',
  'bell_singing.ogg': 'Singing Bell',
  'bowl_singing.ogg': 'Singing Bowl',
  'bowl_singing_big.ogg': 'Big Singing Bowl',
  'gong_bodhi.ogg': 'Gong',
  'gong_generated.ogg': 'Generated Gong',
  'gong_watts.ogg': 'Alan Watts Gong',
};

export const AUDIO_FILE_KEYS = Object.keys(AUDIO_FILES);
export const AUDIO_FILE_NAMES = Object.values(AUDIO_FILES);

export function timeInputValidatorConstructor({
  minTimerTime = 1,
  maxTimerTime = 60,
}: {
  minTimerTime?: number;
  maxTimerTime?: number;
} = {}): (input: string) => string | null {
  return (input: string): string | null => {
    if (input !== null && input !== undefined && input.trim() !== '') {
      const parsed = Number(input);
      if (Number.isInteger(parsed) && parsed >= minTimerTime && parsed <= maxTimerTime) {
        return null;
      }
    }
    return `Interval time should be a number between ${minTimerTime} and ${maxTimerTime}.`;
  };
}

export function timeLeftTo(
  endTimeMs: number,
  options: { roundToZero?: boolean; nowMs?: number } = {}
): number {
  const { roundToZero = false, nowMs = Date.now() } = options;
  let timeLeftMs = endTimeMs - nowMs;
  if (roundToZero && Math.abs(timeLeftMs) < 1000) {
    timeLeftMs = 0;
  }
  return timeLeftMs;
}

export function formatDurationMs(durationMs: number): string {
  const isNegative = durationMs < 0;
  const totalSeconds = Math.floor(Math.abs(durationMs) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  let formatted = hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
  if (isNegative && totalSeconds > 0) {
    formatted = `-${formatted}`;
  }
  return formatted;
}

export function timeLeftString(durationMs: number): number | string {
  let adjustedMs = durationMs;
  if (adjustedMs > 0) {
    // Add 1 second because otherwise the range 9.9 - 9.0 is all called 9,
    // matching Flutter's timeLeftString(Duration d)
    adjustedMs += 1000;
  }
  return formatDurationMs(adjustedMs);
}
