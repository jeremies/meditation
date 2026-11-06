import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BarChartOutlinedIcon,
  BarChartRoundedIcon,
  SettingsOutlinedIcon,
  TimerOutlinedIcon,
  TimerRoundedIcon,
} from './components/Icons';
import { SettingsScreen } from './components/SettingsScreen';
import { StatsScreen } from './components/StatsScreen';
import { TimerScreen } from './components/TimerScreen';
import { PRIMARY_COLOR } from './utils';

export const App: React.FC = () => {
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [snackbarMessage, setSnackbarMessage] = useState<string | null>(null);
  const snackbarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearSnackbar = useCallback(() => {
    if (snackbarTimeoutRef.current) {
      clearTimeout(snackbarTimeoutRef.current);
      snackbarTimeoutRef.current = null;
    }
    setSnackbarMessage(null);
  }, []);

  const showSnackbar = useCallback((message: string) => {
    if (snackbarTimeoutRef.current) {
      clearTimeout(snackbarTimeoutRef.current);
    }
    setSnackbarMessage(message);
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbarMessage(null);
      snackbarTimeoutRef.current = null;
    }, 4000);
  }, []);

  useEffect(() => {
    return () => {
      if (snackbarTimeoutRef.current) {
        clearTimeout(snackbarTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div className="app-scaffold">
      {/* Main Scaffold (kept mounted so Timer state persists when viewing Stats or Settings) */}
      <div
        className="main-view"
        style={{ display: showSettings ? 'none' : 'flex' }}
      >
        <header className="app-bar">
          <h1 className="app-bar-title">
            {selectedIndex === 0 ? 'Meditation Timer' : 'Statistics'}
          </h1>
          <button
            type="button"
            className="icon-button"
            aria-label="Open Settings"
            onClick={() => setShowSettings(true)}
          >
            <SettingsOutlinedIcon size={24} />
          </button>
        </header>

        <main className="app-body">
          {/* IndexedStack equivalent: keep both mounted */}
          <div
            className="tab-pane"
            style={{ display: selectedIndex === 0 ? 'flex' : 'none' }}
          >
            <TimerScreen
              onShowSnackbar={showSnackbar}
              onClearSnackbar={clearSnackbar}
            />
          </div>
          <div
            className="tab-pane"
            style={{ display: selectedIndex === 1 ? 'flex' : 'none' }}
          >
            <StatsScreen />
          </div>
        </main>

        <nav className="bottom-nav" aria-label="Bottom Navigation">
          <button
            type="button"
            className={`bottom-nav-item ${selectedIndex === 0 ? 'active' : ''}`}
            onClick={() => setSelectedIndex(0)}
            style={{
              color: selectedIndex === 0 ? PRIMARY_COLOR : '#9E9E9E',
            }}
          >
            {selectedIndex === 0 ? (
              <TimerRoundedIcon size={24} />
            ) : (
              <TimerOutlinedIcon size={24} />
            )}
            <span className="bottom-nav-label">Timer</span>
          </button>

          <button
            type="button"
            className={`bottom-nav-item ${selectedIndex === 1 ? 'active' : ''}`}
            onClick={() => setSelectedIndex(1)}
            style={{
              color: selectedIndex === 1 ? PRIMARY_COLOR : '#9E9E9E',
            }}
          >
            {selectedIndex === 1 ? (
              <BarChartRoundedIcon size={24} />
            ) : (
              <BarChartOutlinedIcon size={24} />
            )}
            <span className="bottom-nav-label">Stats</span>
          </button>
        </nav>
      </div>

      {/* Settings route overlay */}
      {showSettings && (
        <SettingsScreen
          onBack={() => setShowSettings(false)}
          onShowSnackbar={showSnackbar}
        />
      )}

      {/* Material SnackBar */}
      {snackbarMessage && (
        <div className="snackbar" role="status" aria-live="polite">
          {snackbarMessage}
        </div>
      )}
    </div>
  );
};

export default App;
