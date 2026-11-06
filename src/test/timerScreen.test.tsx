import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocalNotifications } from '@capacitor/local-notifications';
import { App } from '../App';
import {
  ENDING_NOTIFICATION_ID,
  INTERVAL_NOTIFICATION_ID,
  STARTING_NOTIFICATION_ID,
} from '../notificationService';
import { settingsService } from '../settingsService';
import { StatsService } from '../statsService';

let notificationReceivedCallback: ((notification: { id: number }) => void) | null = null;

vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: {
    checkPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    requestPermissions: vi.fn().mockResolvedValue({ display: 'granted' }),
    createChannel: vi.fn().mockResolvedValue(undefined),
    addListener: vi.fn().mockImplementation((event: string, cb: (n: { id: number }) => void) => {
      if (event === 'localNotificationReceived') {
        notificationReceivedCallback = cb;
      }
      return Promise.resolve({ remove: vi.fn() });
    }),
    schedule: vi.fn().mockResolvedValue({ notifications: [] }),
    cancel: vi.fn().mockResolvedValue(undefined),
    removeDeliveredNotifications: vi.fn().mockResolvedValue(undefined),
    getPending: vi.fn().mockResolvedValue({ notifications: [] }),
  },
}));

describe('TimerScreen & LocalNotifications tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    settingsService.resetToDefaults();
    await StatsService.instance.clearAllSessions();
    vi.clearAllMocks();
  });

  it('renders default 15m timer, allows time selection, and schedules Capacitor local notifications on BEGIN', async () => {
    render(<App />);

    expect(screen.getByText('Meditation Timer')).toBeInTheDocument();
    expect(screen.getByText('BEGIN')).toBeInTheDocument();
    expect(screen.getByText(/15m/)).toBeInTheDocument();

    // Change duration to 20 minutes
    fireEvent.click(screen.getByText(/15m/));
    expect(screen.getByText('Select time')).toBeInTheDocument();
    fireEvent.click(screen.getByText('20 minutes'));

    expect(screen.getByText(/20m/)).toBeInTheDocument();
    expect(settingsService.getValue('timer-minutes')).toBe(20);

    // Start meditation
    fireEvent.click(screen.getByText('BEGIN'));

    await waitFor(() => {
      expect(screen.getByText('END')).toBeInTheDocument();
      expect(screen.getByText('Meditation started')).toBeInTheDocument();
    });

    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            id: ENDING_NOTIFICATION_ID,
            channelId: 'timer-main',
            title: 'Meditation ended',
            body: 'Swipe to dismiss',
          }),
        ],
      })
    );
  });

  it('validates custom time input between 1 and 300 minutes', () => {
    render(<App />);

    fireEvent.click(screen.getByText(/15m/));
    fireEvent.click(screen.getByText('custom...'));

    expect(screen.getByText('Input time')).toBeInTheDocument();
    const input = screen.getByLabelText('Custom meditation time in minutes');

    // Invalid > 300
    fireEvent.change(input, { target: { value: '350' } });
    expect(
      screen.getByText('Interval time should be a number between 1 and 300.')
    ).toBeInTheDocument();

    // Valid custom duration
    fireEvent.change(input, { target: { value: '22' } });
    fireEvent.click(screen.getByText('OK'));

    expect(screen.getByText(/22m/)).toBeInTheDocument();
    expect(settingsService.getValue('timer-minutes')).toBe(22);
  });

  it('schedules pre-meditation delay and intervals and records completed session on end notification', async () => {
    settingsService.setValue('timer-minutes', 15);
    settingsService.setValue('delay-enabled', true);
    settingsService.setValue('delay-time', '5');
    settingsService.setValue('intervals-enabled', true);
    settingsService.setValue('interval-time', '5');

    render(<App />);

    fireEvent.click(screen.getByText('BEGIN'));

    // Should enter delaying state and schedule STARTING_NOTIFICATION_ID (101)
    await waitFor(() => {
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            id: STARTING_NOTIFICATION_ID,
            channelId: 'timer-support',
            title: 'Meditation started',
          }),
        ],
      })
    );

    // Simulate starting notification displayed -> starts meditation and schedules 2 intervals (5m, 10m) + end (15m)
    await act(async () => {
      notificationReceivedCallback?.({ id: STARTING_NOTIFICATION_ID });
    });

    await waitFor(() => {
      expect(screen.getByText('END')).toBeInTheDocument();
    });

    // 15m with 5m intervals -> 2 intervals (201, 202)
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            id: INTERVAL_NOTIFICATION_ID + 1,
            channelId: 'timer-support',
            title: 'Meditation interval',
          }),
        ],
      })
    );
    expect(LocalNotifications.schedule).toHaveBeenCalledWith(
      expect.objectContaining({
        notifications: [
          expect.objectContaining({
            id: INTERVAL_NOTIFICATION_ID + 2,
            channelId: 'timer-support',
            title: 'Meditation interval',
          }),
        ],
      })
    );

    // Simulate ending notification displayed -> completes session and records 15m in StatsService
    await act(async () => {
      notificationReceivedCallback?.({ id: ENDING_NOTIFICATION_ID });
    });

    await waitFor(() => {
      expect(screen.getByText('BEGIN')).toBeInTheDocument();
      expect(StatsService.instance.sessions.length).toBe(1);
      expect(StatsService.instance.sessions[0].durationMinutes).toBe(15);
    });
  });
});
