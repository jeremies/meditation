import { beforeEach, describe, expect, it } from 'vitest';
import { MeditationSession, StatsService } from '../statsService';

describe('StatsService tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await StatsService.instance.clearAllSessions();
  });

  it('MeditationSession serialization', () => {
    const now = new Date(2026, 9, 22, 10, 30); // Oct 22, 2026
    const session = new MeditationSession({
      id: 'test_1',
      timestamp: now,
      durationMinutes: 20,
    });

    const json = session.toJson();
    expect(json.id).toBe('test_1');
    expect(json.durationMinutes).toBe(20);
    expect(json.timestamp).toBe(now.toISOString());

    const deserialized = MeditationSession.fromJson(
      json as unknown as Record<string, unknown>
    );
    expect(deserialized.id).toBe('test_1');
    expect(deserialized.durationMinutes).toBe(20);
    expect(deserialized.timestamp.getTime()).toBe(now.getTime());
  });

  it('formatDuration formats properly', () => {
    expect(StatsService.formatDuration(0)).toBe('0 min');
    expect(StatsService.formatDuration(15)).toBe('15 min');
    expect(StatsService.formatDuration(60)).toBe('1h');
    expect(StatsService.formatDuration(90)).toBe('1h 30m');
    expect(StatsService.formatDuration(125)).toBe('2h 5m');
  });

  it('calculateTotalMinutes calculates sum', () => {
    const sessions = [
      new MeditationSession({
        id: '1',
        timestamp: new Date(2026, 9, 20, 8),
        durationMinutes: 15,
      }),
      new MeditationSession({
        id: '2',
        timestamp: new Date(2026, 9, 21, 9),
        durationMinutes: 30,
      }),
      new MeditationSession({
        id: '3',
        timestamp: new Date(2026, 9, 22, 7),
        durationMinutes: 20,
      }),
    ];

    expect(StatsService.calculateTotalMinutes(sessions)).toBe(65);
  });

  it('getDailyMinutesMap groups minutes by calendar date', () => {
    const d1 = new Date(2026, 9, 20, 8);
    const d2 = new Date(2026, 9, 20, 20); // same day, later
    const d3 = new Date(2026, 9, 21, 12);

    const sessions = [
      new MeditationSession({ id: '1', timestamp: d1, durationMinutes: 15 }),
      new MeditationSession({ id: '2', timestamp: d2, durationMinutes: 20 }),
      new MeditationSession({ id: '3', timestamp: d3, durationMinutes: 25 }),
    ];

    const map = StatsService.getDailyMinutesMap(sessions);
    const key1 = StatsService.dateKey(new Date(2026, 9, 20));
    const key2 = StatsService.dateKey(new Date(2026, 9, 21));

    expect(map.get(key1)).toBe(35);
    expect(map.get(key2)).toBe(25);
  });

  it('calculateCurrentStreak with today meditated', () => {
    const today = new Date(2026, 9, 22);
    const yesterday = new Date(2026, 9, 21);
    const twoDaysAgo = new Date(2026, 9, 20);

    const sessions = [
      new MeditationSession({
        id: '1',
        timestamp: today,
        durationMinutes: 20,
      }),
      new MeditationSession({
        id: '2',
        timestamp: yesterday,
        durationMinutes: 15,
      }),
      new MeditationSession({
        id: '3',
        timestamp: twoDaysAgo,
        durationMinutes: 30,
      }),
    ];

    expect(StatsService.calculateCurrentStreak(sessions, today)).toBe(3);
  });

  it('calculateCurrentStreak with today not yet meditated but yesterday meditated', () => {
    const today = new Date(2026, 9, 22);
    const yesterday = new Date(2026, 9, 21);
    const twoDaysAgo = new Date(2026, 9, 20);

    const sessions = [
      new MeditationSession({
        id: '1',
        timestamp: yesterday,
        durationMinutes: 15,
      }),
      new MeditationSession({
        id: '2',
        timestamp: twoDaysAgo,
        durationMinutes: 30,
      }),
    ];

    expect(StatsService.calculateCurrentStreak(sessions, today)).toBe(2);
  });

  it('calculateCurrentStreak broken when neither today nor yesterday meditated', () => {
    const today = new Date(2026, 9, 22);
    const threeDaysAgo = new Date(2026, 9, 19);

    const sessions = [
      new MeditationSession({
        id: '1',
        timestamp: threeDaysAgo,
        durationMinutes: 20,
      }),
    ];

    expect(StatsService.calculateCurrentStreak(sessions, today)).toBe(0);
  });

  it('calculateBestStreak calculates longest streak', () => {
    const sessions = [
      // Streak of 3 days
      new MeditationSession({
        id: '1',
        timestamp: new Date(2026, 4, 1),
        durationMinutes: 10,
      }),
      new MeditationSession({
        id: '2',
        timestamp: new Date(2026, 4, 2),
        durationMinutes: 15,
      }),
      new MeditationSession({
        id: '3',
        timestamp: new Date(2026, 4, 3),
        durationMinutes: 20,
      }),
      // Gap
      // Streak of 5 days
      new MeditationSession({
        id: '4',
        timestamp: new Date(2026, 5, 10),
        durationMinutes: 10,
      }),
      new MeditationSession({
        id: '5',
        timestamp: new Date(2026, 5, 11),
        durationMinutes: 10,
      }),
      new MeditationSession({
        id: '6',
        timestamp: new Date(2026, 5, 12),
        durationMinutes: 10,
      }),
      new MeditationSession({
        id: '7',
        timestamp: new Date(2026, 5, 13),
        durationMinutes: 10,
      }),
      new MeditationSession({
        id: '8',
        timestamp: new Date(2026, 5, 14),
        durationMinutes: 10,
      }),
    ];

    expect(StatsService.calculateBestStreak(sessions)).toBe(5);
  });

  it('empty sessions return 0 streaks', () => {
    expect(StatsService.calculateCurrentStreak([])).toBe(0);
    expect(StatsService.calculateBestStreak([])).toBe(0);
    expect(StatsService.calculateTotalMinutes([])).toBe(0);
    expect(StatsService.getDailyMinutesMap([]).size).toBe(0);
  });

  it('clearAllSessions clears sessions in memory and localStorage and notifies listeners', async () => {
    const service = StatsService.instance;
    await service.recordSession(15);
    expect(service.sessions.length).toBe(1);

    let notified = false;
    const listener = () => {
      notified = true;
    };

    service.addListener(listener);

    await service.clearAllSessions();

    expect(service.sessions.length).toBe(0);
    expect(notified).toBe(true);
    expect(localStorage.getItem('meditation_sessions_history')).toBeNull();

    service.removeListener(listener);
  });
});
