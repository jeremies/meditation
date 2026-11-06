import React, { useEffect, useRef, useState, useCallback } from 'react';
import { audioPlayer } from '../audioPlayer';
import {
  ENDING_NOTIFICATION_ID,
  INTERVAL_NOTIFICATION_ID,
  STARTING_NOTIFICATION_ID,
  notificationService,
} from '../notificationService';
import { settingsService } from '../settingsService';
import { StatsService } from '../statsService';
import {
  MAX_MEDITATION_TIME,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  SURFACE_COLOR,
  timeInputValidatorConstructor,
  timeLeftString,
  timeLeftTo,
} from '../utils';
import { wakeLockService } from '../wakeLockService';
import { ScheduleIcon } from './Icons';

export type TimerState = 'stopped' | 'delaying' | 'meditating';

const TIME_CHOICES = [5, 10, 15, 20, 25, 30, 45, 60];

interface TimerScreenProps {
  onShowSnackbar: (message: string) => void;
  onClearSnackbar: () => void;
}

export const TimerScreen: React.FC<TimerScreenProps> = ({
  onShowSnackbar,
  onClearSnackbar,
}) => {
  const [timerState, setTimerState] = useState<TimerState>('stopped');
  const [timerMinutes, setTimerMinutes] = useState<number>(() =>
    settingsService.getValue('timer-minutes')
  );
  const [showCountdown, setShowCountdown] = useState<boolean>(() =>
    settingsService.getValue('show-countdown')
  );
  const [timerButtonText, setTimerButtonText] = useState<string>('begin');
  const [timeLeftMs, setTimeLeftMs] = useState<number>(0);
  const [timerProgress, setTimerProgress] = useState<number>(0);

  // Dialog states
  const [showTimeSelectModal, setShowTimeSelectModal] = useState<boolean>(false);
  const [showCustomTimeModal, setShowCustomTimeModal] = useState<boolean>(false);
  const [customTimeInput, setCustomTimeInput] = useState<string>('');
  const [customTimeError, setCustomTimeError] = useState<string | null>(null);
  const [customTimeTouched, setCustomTimeTouched] = useState<boolean>(false);

  // Refs for accurate mutable timer loop access
  const timerStateRef = useRef<TimerState>('stopped');
  const timerMinutesRef = useRef<number>(timerMinutes);
  const timerDelaySecondsRef = useRef<number>(0);
  const delayStartTimeMsRef = useRef<number>(0);
  const startTimeMsRef = useRef<number>(0);
  const endTimeMsRef = useRef<number>(0);
  const intervalNotificationIDsRef = useRef<number[]>([]);
  const rafIdRef = useRef<number | null>(null);

  useEffect(() => {
    timerMinutesRef.current = timerMinutes;
  }, [timerMinutes]);

  useEffect(() => {
    const handleSettingsChange = () => {
      setShowCountdown(settingsService.getValue('show-countdown'));
      setTimerMinutes(settingsService.getValue('timer-minutes'));
    };
    settingsService.addListener(handleSettingsChange);
    return () => {
      settingsService.removeListener(handleSettingsChange);
    };
  }, []);

  const stopTicker = useCallback(() => {
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
  }, []);

  const onTimerEnd = useCallback(
    async ({
      playAudio = true,
      completed = false,
    }: {
      playAudio?: boolean;
      completed?: boolean;
    } = {}) => {
      if (timerStateRef.current === 'stopped') {
        return;
      }

      const wasMeditating = timerStateRef.current === 'meditating';
      const currentMinutes = timerMinutesRef.current;

      timerStateRef.current = 'stopped';
      setTimerState('stopped');
      stopTicker();

      if (completed && currentMinutes > 0) {
        await StatsService.instance.recordSession(currentMinutes);
      }

      if (wasMeditating) {
        setTimeLeftMs(timeLeftTo(endTimeMsRef.current, { roundToZero: true }));
      }
      setTimerProgress(0);
      setTimerButtonText('begin');

      onClearSnackbar();
      audioPlayer.stopBackgroundKeepAlive();
      await wakeLockService.disable();

      await notificationService.cancelNotifications([
        ENDING_NOTIFICATION_ID,
        STARTING_NOTIFICATION_ID,
        ...intervalNotificationIDsRef.current,
      ]);
      intervalNotificationIDsRef.current = [];

      if (playAudio) {
        await audioPlayer.playSound('end-sound');
      } else {
        await audioPlayer.stopPrevious();
      }
    },
    [onClearSnackbar, stopTicker]
  );

  const onTimerInterval = useCallback(async () => {
    if (timerStateRef.current !== 'meditating') {
      return;
    }
    await audioPlayer.playSound('interval-sound');
  }, []);

  const onMeditationStart = useCallback(async () => {
    const currentMinutes = timerMinutesRef.current;
    const durationMs =
      currentMinutes === 0 ? 10 * 1000 : currentMinutes * 60 * 1000;
    const durationSeconds = Math.round(durationMs / 1000);

    const now = Date.now();
    startTimeMsRef.current = now;
    endTimeMsRef.current = now + durationMs;

    setTimeLeftMs(timeLeftTo(endTimeMsRef.current, { nowMs: now }));
    setTimerProgress(0);

    if (settingsService.getValue('screen-wakelock')) {
      await wakeLockService.enable();
    } else {
      await wakeLockService.disable();
    }

    timerStateRef.current = 'meditating';
    setTimerState('meditating');
    setTimerButtonText('end');

    await notificationService.scheduleEndingNotification(durationSeconds);

    const intervalsEnabled = settingsService.getValue('intervals-enabled');
    intervalNotificationIDsRef.current = [];

    if (intervalsEnabled) {
      const intervalMinutes = parseInt(
        settingsService.getValue('interval-time') || '0',
        10
      );
      if (intervalMinutes >= 1 && currentMinutes > 0) {
        let count = Math.floor(currentMinutes / intervalMinutes);
        if (currentMinutes % intervalMinutes === 0) {
          // Remove last interval so it doesn't coincide with the end bell
          count -= 1;
        }
        for (let i = 1; i <= count; i++) {
          const id = INTERVAL_NOTIFICATION_ID + i;
          await notificationService.scheduleIntervalNotification(
            i * intervalMinutes * 60,
            id
          );
          intervalNotificationIDsRef.current.push(id);
        }
      }
    }

    await audioPlayer.playSound('start-sound');
    onShowSnackbar('Meditation started');
  }, [onShowSnackbar]);

  const startTicker = useCallback(() => {
    stopTicker();

    const tick = () => {
      const state = timerStateRef.current;
      if (state === 'stopped') {
        return;
      }

      const now = Date.now();

      if (state === 'delaying') {
        const elapsedSeconds = Math.floor(
          (now - delayStartTimeMsRef.current) / 1000
        );
        const countdown = Math.max(
          0,
          timerDelaySecondsRef.current - elapsedSeconds
        );
        setTimerButtonText(String(countdown));
      } else if (state === 'meditating') {
        const remaining = timeLeftTo(endTimeMsRef.current, { nowMs: now });
        if (remaining <= 200) {
          void onTimerEnd({ playAudio: true, completed: true });
          return;
        }

        const totalDuration = endTimeMsRef.current - startTimeMsRef.current;
        const elapsed = now - startTimeMsRef.current;
        const progress =
          totalDuration > 0
            ? Math.max(0, Math.min(1, elapsed / totalDuration))
            : 0;

        setTimerProgress(progress);
        setTimeLeftMs(remaining);
      }

      rafIdRef.current = requestAnimationFrame(tick);
    };

    rafIdRef.current = requestAnimationFrame(tick);
  }, [onTimerEnd, stopTicker]);

  useEffect(() => {
    void notificationService.initNotifications();

    const unsubscribe = notificationService.onNotificationDisplayed((id) => {
      if (id === ENDING_NOTIFICATION_ID) {
        if (timerStateRef.current === 'meditating') {
          void onTimerEnd({ playAudio: true, completed: true });
        }
      } else if (intervalNotificationIDsRef.current.includes(id)) {
        if (timerStateRef.current === 'meditating') {
          void onTimerInterval();
          void notificationService.dismissNotification(id);
        }
      } else if (id === STARTING_NOTIFICATION_ID) {
        if (timerStateRef.current === 'delaying') {
          void onMeditationStart();
          setTimeout(() => {
            void notificationService.dismissNotification(
              STARTING_NOTIFICATION_ID
            );
          }, 4000);
        }
      }
    });

    return () => {
      unsubscribe();
      stopTicker();
      void notificationService.cancelAll();
    };
  }, [onMeditationStart, onTimerEnd, onTimerInterval, stopTicker]);

  const onTimerStart = async () => {
    await notificationService.dismissNotification(ENDING_NOTIFICATION_ID);
    audioPlayer.startBackgroundKeepAlive();

    const delayEnabled = settingsService.getValue('delay-enabled');
    if (delayEnabled) {
      const parsedDelay = parseInt(
        settingsService.getValue('delay-time') || '5',
        10
      );
      const delaySec = Number.isNaN(parsedDelay) ? 5 : parsedDelay;
      timerDelaySecondsRef.current = delaySec;
      delayStartTimeMsRef.current = Date.now();

      await wakeLockService.enable();
      await notificationService.scheduleStartingNotification(delaySec);

      timerStateRef.current = 'delaying';
      setTimerState('delaying');
      setTimerButtonText(String(delaySec));
    } else {
      timerDelaySecondsRef.current = 0;
      await onMeditationStart();
    }

    startTicker();
  };

  const onTimerButtonPress = async () => {
    if (timerStateRef.current === 'stopped') {
      const permissionsOkay =
        await notificationService.checkAndRequestPermissions();
      if (permissionsOkay) {
        await onTimerStart();
      }
    } else {
      // Prevent accidental double tap within 500ms if not coming from delayed start
      if (
        timerDelaySecondsRef.current === 0 &&
        Date.now() - startTimeMsRef.current < 500
      ) {
        return;
      }
      await onTimerEnd({ playAudio: false, completed: false });
    }
  };

  const handleTimePresetSelect = (selected: number) => {
    setShowTimeSelectModal(false);
    if (selected >= 0) {
      setTimerMinutes(selected);
      settingsService.setValue('timer-minutes', selected);
    } else if (selected === -1) {
      setCustomTimeInput('');
      setCustomTimeError(null);
      setCustomTimeTouched(false);
      setShowCustomTimeModal(true);
    }
  };

  const validateCustomTime = timeInputValidatorConstructor({
    minTimerTime: 1,
    maxTimerTime: MAX_MEDITATION_TIME,
  });

  const handleCustomTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // FilteringTextInputFormatter.digitsOnly & deny("^0")
    const digitsOnly = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    setCustomTimeInput(digitsOnly);
    setCustomTimeTouched(true);
    setCustomTimeError(validateCustomTime(digitsOnly));
  };

  const handleCustomTimeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCustomTimeTouched(true);
    const error = validateCustomTime(customTimeInput);
    setCustomTimeError(error);
    if (!error) {
      const minutes = parseInt(customTimeInput, 10);
      setTimerMinutes(minutes);
      settingsService.setValue('timer-minutes', minutes);
      setShowCustomTimeModal(false);
    }
  };

  // SVG Circular Progress Indicator calculations
  const circleSize = 260;
  const strokeWidth = 10;
  const radius = (circleSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const activeProgress = timerState === 'meditating' ? timerProgress : 0;
  const strokeDashoffset = circumference * (1 - activeProgress);

  return (
    <div className="timer-screen">
      {showCountdown && (
        <div className="timer-countdown" data-testid="timer-countdown">
          {timeLeftString(timeLeftMs)}
        </div>
      )}

      <div className="timer-circle-container">
        <svg
          className="timer-progress-svg"
          width={circleSize}
          height={circleSize}
          viewBox={`0 0 ${circleSize} ${circleSize}`}
        >
          {/* Track */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke={SURFACE_COLOR}
            strokeWidth={strokeWidth}
          />
          {/* Progress indicator */}
          <circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            fill="none"
            stroke={PRIMARY_COLOR}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="butt"
            transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
          />
        </svg>

        <button
          type="button"
          className="timer-main-button"
          onClick={() => void onTimerButtonPress()}
        >
          {timerButtonText.toUpperCase()}
        </button>
      </div>

      <div className="timer-duration-container">
        <button
          type="button"
          className="timer-duration-button"
          onClick={() => setShowTimeSelectModal(true)}
        >
          <ScheduleIcon size={30} />
          <span>&nbsp;{timerMinutes}m</span>
        </button>
      </div>

      {/* Time Choice SimpleDialog */}
      {showTimeSelectModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowTimeSelectModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Select time"
        >
          <div
            className="modal-dialog simple-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Select time</h2>
            <div className="simple-dialog-options">
              {import.meta.env.DEV && (
                <button
                  type="button"
                  className="simple-dialog-option"
                  onClick={() => handleTimePresetSelect(0)}
                >
                  0 - 10s
                </button>
              )}
              <button
                type="button"
                className="simple-dialog-option"
                onClick={() => handleTimePresetSelect(1)}
              >
                1 minute
              </button>
              {TIME_CHOICES.map((t) => (
                <button
                  key={t}
                  type="button"
                  className="simple-dialog-option"
                  onClick={() => handleTimePresetSelect(t)}
                >
                  {t} minutes
                </button>
              ))}
              <button
                type="button"
                className="simple-dialog-option"
                onClick={() => handleTimePresetSelect(-1)}
              >
                custom...
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Time Input SimpleDialog */}
      {showCustomTimeModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowCustomTimeModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Input time"
        >
          <div
            className="modal-dialog simple-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Input time</h2>
            <form onSubmit={handleCustomTimeSubmit}>
              <div className="custom-time-input-wrapper">
                <input
                  type="text"
                  inputMode="numeric"
                  autoFocus
                  value={customTimeInput}
                  onChange={handleCustomTimeChange}
                  className="outlined-text-input"
                  style={{
                    borderColor:
                      customTimeTouched && customTimeError
                        ? SECONDARY_COLOR
                        : PRIMARY_COLOR,
                  }}
                  aria-label="Custom meditation time in minutes"
                />
                {customTimeTouched && customTimeError ? (
                  <div
                    className="input-helper-text"
                    style={{ color: SECONDARY_COLOR }}
                  >
                    {customTimeError}
                  </div>
                ) : (
                  <div className="input-helper-text">
                    Input time in minutes, between 1 and {MAX_MEDITATION_TIME}.
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="modal-text-button"
                  onClick={() => setShowCustomTimeModal(false)}
                >
                  CANCEL
                </button>
                <button type="submit" className="modal-text-button">
                  OK
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
