import React, { useEffect, useState } from 'react';
import { audioPlayer } from '../audioPlayer';
import { AppSettings, settingsService } from '../settingsService';
import { StatsService } from '../statsService';
import {
  AUDIO_FILE_KEYS,
  AUDIO_FILE_NAMES,
  MAX_MEDITATION_TIME,
  PRIMARY_COLOR,
  SECONDARY_COLOR,
  timeInputValidatorConstructor,
} from '../utils';
import { ArrowBackIcon, DeleteForeverIcon, VolumeUpIcon } from './Icons';

interface SettingsScreenProps {
  onBack?: () => void;
  onShowSnackbar?: (message: string) => void;
}

type SoundModalTarget = 'start-sound' | 'end-sound' | 'interval-sound' | null;

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onShowSnackbar,
}) => {
  const [settings, setSettings] = useState<AppSettings>(() =>
    settingsService.getAll()
  );

  // Expandable text inputs state
  const [delayInput, setDelayInput] = useState<string>(() =>
    settingsService.getValue('delay-time')
  );
  const [delayError, setDelayError] = useState<string | null>(null);

  const [intervalInput, setIntervalInput] = useState<string>(() =>
    settingsService.getValue('interval-time')
  );
  const [intervalError, setIntervalError] = useState<string | null>(null);

  // Modals
  const [soundModalTarget, setSoundModalTarget] =
    useState<SoundModalTarget>(null);
  const [showAboutModal, setShowAboutModal] = useState<boolean>(false);
  const [showClearConfirmModal, setShowClearConfirmModal] =
    useState<boolean>(false);

  useEffect(() => {
    const onSettingsChanged = () => {
      setSettings(settingsService.getAll());
    };
    settingsService.addListener(onSettingsChanged);
    return () => {
      settingsService.removeListener(onSettingsChanged);
    };
  }, []);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = Number(e.target.value);
    if (newVol !== settings.volume) {
      settingsService.setValue('volume', newVol);
      void audioPlayer.playSound('end-sound');
    }
  };

  const validateDelay = timeInputValidatorConstructor({
    minTimerTime: 5,
    maxTimerTime: 60,
  });

  const handleDelayTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    setDelayInput(digits);
    const err = validateDelay(digits);
    setDelayError(err);
    if (!err) {
      settingsService.setValue('delay-time', digits);
    }
  };

  const validateInterval = timeInputValidatorConstructor({
    minTimerTime: 1,
    maxTimerTime: MAX_MEDITATION_TIME,
  });

  const handleIntervalTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '').replace(/^0+/, '');
    setIntervalInput(digits);
    const err = validateInterval(digits);
    setIntervalError(err);
    if (!err) {
      settingsService.setValue('interval-time', digits);
    }
  };

  const handleSoundSelect = (index: number) => {
    if (!soundModalTarget) return;
    const currentVal = settings[soundModalTarget];
    settingsService.setValue(soundModalTarget, index);
    if (index !== currentVal) {
      void audioPlayer.play(AUDIO_FILE_KEYS[index]);
    }
    setSoundModalTarget(null);
  };

  const handleConfirmClearHistory = async () => {
    setShowClearConfirmModal(false);
    await StatsService.instance.clearAllSessions();
    if (onShowSnackbar) {
      onShowSnackbar('All meditation history has been cleared');
    }
  };

  const getSoundTitle = (target: SoundModalTarget): string => {
    if (target === 'start-sound') return 'Start sound';
    if (target === 'end-sound') return 'End sound';
    if (target === 'interval-sound') return 'Interval sound';
    return '';
  };

  return (
    <div className="settings-screen">
      <header className="app-bar">
        {onBack && (
          <button
            type="button"
            className="icon-button"
            onClick={onBack}
            aria-label="Back"
          >
            <ArrowBackIcon size={24} />
          </button>
        )}
        <h1 className="app-bar-title">Settings</h1>
      </header>

      <div className="settings-list">
        {/* VOLUME */}
        <section className="settings-group">
          <div className="settings-group-title">VOLUME</div>
          <div className="settings-tile slider-tile">
            <div className="slider-tile-top">
              <div className="slider-tile-icon">
                <VolumeUpIcon size={24} />
              </div>
              <div className="slider-tile-info">
                <div className="settings-tile-title">Bells volume</div>
                <div className="settings-tile-subtitle">
                  {settings.volume.toFixed(2)}
                </div>
              </div>
            </div>
            <div className="slider-wrapper">
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={settings.volume}
                onChange={handleVolumeChange}
                className="volume-slider"
                aria-label="Bells volume"
              />
            </div>
          </div>
        </section>

        {/* OPTIONS */}
        <section className="settings-group">
          <div className="settings-group-title">OPTIONS</div>

          <label className="settings-tile checkbox-tile">
            <div className="settings-tile-text">
              <div className="settings-tile-title">Keep screen on</div>
              <div className="settings-tile-subtitle">
                Enable this to keep the screen on as you meditate
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings['screen-wakelock']}
              onChange={(e) =>
                settingsService.setValue('screen-wakelock', e.target.checked)
              }
              className="settings-checkbox"
            />
          </label>

          <label className="settings-tile checkbox-tile">
            <div className="settings-tile-text">
              <div className="settings-tile-title">Show countdown</div>
              <div className="settings-tile-subtitle">
                Show the remaining meditation time
              </div>
            </div>
            <input
              type="checkbox"
              checked={settings['show-countdown']}
              onChange={(e) =>
                settingsService.setValue('show-countdown', e.target.checked)
              }
              className="settings-checkbox"
            />
          </label>

          <div className="settings-tile-expandable">
            <label className="settings-tile checkbox-tile">
              <div className="settings-tile-text">
                <div className="settings-tile-title">Pre-meditation delay</div>
                <div className="settings-tile-subtitle">
                  Add an initial delay before the meditation starts
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings['delay-enabled']}
                onChange={(e) =>
                  settingsService.setValue('delay-enabled', e.target.checked)
                }
                className="settings-checkbox"
              />
            </label>

            {settings['delay-enabled'] && (
              <div className="settings-subtile-container">
                <div className="settings-subtile">
                  <div className="settings-tile-title">
                    Delay duration (seconds)
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={delayInput}
                    onChange={handleDelayTimeChange}
                    onFocus={(e) => e.target.select()}
                    className="outlined-text-input settings-inline-input"
                    style={{
                      borderColor: delayError ? SECONDARY_COLOR : PRIMARY_COLOR,
                    }}
                    aria-label="Delay duration (seconds)"
                  />
                  {delayError ? (
                    <div
                      className="input-helper-text"
                      style={{ color: SECONDARY_COLOR }}
                    >
                      {delayError}
                    </div>
                  ) : (
                    <div className="input-helper-text">
                      Delay time in seconds, between 5 and 60.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* SOUNDS */}
        <section className="settings-group">
          <div className="settings-group-title">SOUNDS</div>

          <button
            type="button"
            className="settings-tile action-tile"
            onClick={() => setSoundModalTarget('start-sound')}
          >
            <div className="settings-tile-text">
              <div className="settings-tile-title">Start sound</div>
              <div className="settings-tile-subtitle">
                {AUDIO_FILE_NAMES[settings['start-sound']] ??
                  AUDIO_FILE_NAMES[0]}
              </div>
            </div>
          </button>

          <button
            type="button"
            className="settings-tile action-tile"
            onClick={() => setSoundModalTarget('end-sound')}
          >
            <div className="settings-tile-text">
              <div className="settings-tile-title">End sound</div>
              <div className="settings-tile-subtitle">
                {AUDIO_FILE_NAMES[settings['end-sound']] ?? AUDIO_FILE_NAMES[0]}
              </div>
            </div>
          </button>
        </section>

        {/* INTERVALS */}
        <section className="settings-group">
          <div className="settings-group-title">INTERVALS</div>

          <div className="settings-tile-expandable">
            <label className="settings-tile checkbox-tile">
              <div className="settings-tile-text">
                <div className="settings-tile-title">Enable intervals</div>
                <div className="settings-tile-subtitle">
                  Intermediate bells during your meditation
                </div>
              </div>
              <input
                type="checkbox"
                checked={settings['intervals-enabled']}
                onChange={(e) =>
                  settingsService.setValue(
                    'intervals-enabled',
                    e.target.checked
                  )
                }
                className="settings-checkbox"
              />
            </label>

            {settings['intervals-enabled'] && (
              <div className="settings-subtile-container">
                <div className="settings-subtile">
                  <div className="settings-tile-title">
                    Interval duration (minutes)
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={intervalInput}
                    onChange={handleIntervalTimeChange}
                    onFocus={(e) => e.target.select()}
                    className="outlined-text-input settings-inline-input"
                    style={{
                      borderColor: intervalError
                        ? SECONDARY_COLOR
                        : PRIMARY_COLOR,
                    }}
                    aria-label="Interval duration (minutes)"
                  />
                  {intervalError ? (
                    <div
                      className="input-helper-text"
                      style={{ color: SECONDARY_COLOR }}
                    >
                      {intervalError}
                    </div>
                  ) : (
                    <div className="input-helper-text">
                      Interval time in minutes, between 1 and{' '}
                      {MAX_MEDITATION_TIME}.
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  className="settings-tile action-tile settings-nested-action-tile"
                  onClick={() => setSoundModalTarget('interval-sound')}
                >
                  <div className="settings-tile-text">
                    <div className="settings-tile-title">Interval sound</div>
                    <div className="settings-tile-subtitle">
                      {AUDIO_FILE_NAMES[settings['interval-sound']] ??
                        AUDIO_FILE_NAMES[0]}
                    </div>
                  </div>
                </button>
              </div>
            )}
          </div>
        </section>

        {/* INFO */}
        <section className="settings-group">
          <div className="settings-group-title">INFO</div>

          <button
            type="button"
            className="settings-tile action-tile"
            onClick={() => setShowAboutModal(true)}
          >
            <div className="settings-tile-text">
              <div className="settings-tile-title">About</div>
              <div className="settings-tile-subtitle">
                Licences and other information
              </div>
            </div>
          </button>
        </section>

        {/* DANGER ZONE */}
        <section className="settings-group">
          <div className="settings-group-title">DANGER ZONE</div>

          <button
            type="button"
            className="settings-tile action-tile"
            onClick={() => setShowClearConfirmModal(true)}
          >
            <div className="settings-tile-leading">
              <DeleteForeverIcon size={24} color="#FF5252" />
            </div>
            <div className="settings-tile-text">
              <div className="settings-tile-title">
                Clear meditation history
              </div>
              <div className="settings-tile-subtitle">
                Permanently delete all session logs and stats
              </div>
            </div>
          </button>
        </section>
      </div>

      {/* Sound Radio Modal */}
      {soundModalTarget && (
        <div
          className="modal-backdrop"
          onClick={() => setSoundModalTarget(null)}
          role="dialog"
          aria-modal="true"
          aria-label={getSoundTitle(soundModalTarget)}
        >
          <div
            className="modal-dialog simple-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">{getSoundTitle(soundModalTarget)}</h2>
            <div className="radio-dialog-options">
              {AUDIO_FILE_NAMES.map((name, index) => {
                const isSelected = settings[soundModalTarget] === index;
                return (
                  <label key={name} className="radio-dialog-option">
                    <input
                      type="radio"
                      name={soundModalTarget}
                      checked={isSelected}
                      onChange={() => handleSoundSelect(index)}
                      className="settings-radio"
                    />
                    <span>{name}</span>
                  </label>
                );
              })}
            </div>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-text-button"
                onClick={() => setSoundModalTarget(null)}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Meditation History AlertDialog */}
      {showClearConfirmModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowClearConfirmModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Clear meditation history?"
        >
          <div
            className="modal-dialog alert-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="modal-title">Clear meditation history?</h2>
            <p className="modal-body-text">
              Are you sure you want to delete all session logs? This action
              cannot be undone and will reset your streaks and statistics.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-text-button"
                onClick={() => setShowClearConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="modal-text-button"
                style={{ color: '#FF5252' }}
                onClick={() => void handleConfirmClearHistory()}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* About Dialog */}
      {showAboutModal && (
        <div
          className="modal-backdrop"
          onClick={() => setShowAboutModal(false)}
          role="dialog"
          aria-modal="true"
          aria-label="About Meditation"
        >
          <div
            className="modal-dialog alert-dialog"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="about-header">
              <img
                src="/icons/icon-material-192px.png"
                alt="Meditation icon"
                className="about-app-icon"
              />
              <div>
                <h2 className="modal-title" style={{ marginBottom: '4px' }}>
                  Meditation
                </h2>
                <div className="about-version">1.5.0 (17)</div>
              </div>
            </div>
            <p className="modal-body-text">
              com.nyxkn.meditation
              <br />
              <br />A meditation timer made with React, Capacitor, and PWA.
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="modal-text-button"
                onClick={() => setShowAboutModal(false)}
              >
                CLOSE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
