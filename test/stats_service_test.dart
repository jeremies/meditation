import 'package:flutter_test/flutter_test.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:meditation/stats_service.dart';

void main() {
  group('StatsService tests', () {
    test('MeditationSession serialization', () {
      final now = DateTime(2026, 10, 22, 10, 30);
      final session = MeditationSession(
        id: 'test_1',
        timestamp: now,
        durationMinutes: 20,
      );

      final json = session.toJson();
      expect(json['id'], 'test_1');
      expect(json['durationMinutes'], 20);
      expect(json['timestamp'], now.toIso8601String());

      final deserialized = MeditationSession.fromJson(json);
      expect(deserialized.id, 'test_1');
      expect(deserialized.durationMinutes, 20);
      expect(deserialized.timestamp, now);
    });

    test('formatDuration formats properly', () {
      expect(StatsService.formatDuration(0), '0 min');
      expect(StatsService.formatDuration(15), '15 min');
      expect(StatsService.formatDuration(60), '1h');
      expect(StatsService.formatDuration(90), '1h 30m');
      expect(StatsService.formatDuration(125), '2h 5m');
    });

    test('calculateTotalMinutes calculates sum', () {
      final sessions = [
        MeditationSession(
            id: '1',
            timestamp: DateTime(2026, 10, 20, 8),
            durationMinutes: 15),
        MeditationSession(
            id: '2',
            timestamp: DateTime(2026, 10, 21, 9),
            durationMinutes: 30),
        MeditationSession(
            id: '3',
            timestamp: DateTime(2026, 10, 22, 7),
            durationMinutes: 20),
      ];

      expect(StatsService.calculateTotalMinutes(sessions), 65);
    });

    test('getDailyMinutesMap groups minutes by calendar date', () {
      final d1 = DateTime(2026, 10, 20, 8);
      final d2 = DateTime(2026, 10, 20, 20); // same day, later
      final d3 = DateTime(2026, 10, 21, 12);

      final sessions = [
        MeditationSession(id: '1', timestamp: d1, durationMinutes: 15),
        MeditationSession(id: '2', timestamp: d2, durationMinutes: 20),
        MeditationSession(id: '3', timestamp: d3, durationMinutes: 25),
      ];

      final map = StatsService.getDailyMinutesMap(sessions);
      final key1 = DateTime(2026, 10, 20);
      final key2 = DateTime(2026, 10, 21);

      expect(map[key1], 35);
      expect(map[key2], 25);
    });

    test('calculateCurrentStreak with today meditated', () {
      final today = DateTime(2026, 10, 22);
      final yesterday = DateTime(2026, 10, 21);
      final twoDaysAgo = DateTime(2026, 10, 20);

      final sessions = [
        MeditationSession(
            id: '1', timestamp: today, durationMinutes: 20),
        MeditationSession(
            id: '2', timestamp: yesterday, durationMinutes: 15),
        MeditationSession(
            id: '3', timestamp: twoDaysAgo, durationMinutes: 30),
      ];

      expect(StatsService.calculateCurrentStreak(sessions, today), 3);
    });

    test('calculateCurrentStreak with today not yet meditated but yesterday meditated', () {
      final today = DateTime(2026, 10, 22);
      final yesterday = DateTime(2026, 10, 21);
      final twoDaysAgo = DateTime(2026, 10, 20);

      final sessions = [
        MeditationSession(
            id: '1', timestamp: yesterday, durationMinutes: 15),
        MeditationSession(
            id: '2', timestamp: twoDaysAgo, durationMinutes: 30),
      ];

      expect(StatsService.calculateCurrentStreak(sessions, today), 2);
    });

    test('calculateCurrentStreak broken when neither today nor yesterday meditated', () {
      final today = DateTime(2026, 10, 22);
      final threeDaysAgo = DateTime(2026, 10, 19);

      final sessions = [
        MeditationSession(
            id: '1', timestamp: threeDaysAgo, durationMinutes: 20),
      ];

      expect(StatsService.calculateCurrentStreak(sessions, today), 0);
    });

    test('calculateBestStreak calculates longest streak', () {
      final sessions = [
        // Streak of 3 days
        MeditationSession(
            id: '1',
            timestamp: DateTime(2026, 5, 1),
            durationMinutes: 10),
        MeditationSession(
            id: '2',
            timestamp: DateTime(2026, 5, 2),
            durationMinutes: 15),
        MeditationSession(
            id: '3',
            timestamp: DateTime(2026, 5, 3),
            durationMinutes: 20),
        // Gap
        // Streak of 5 days
        MeditationSession(
            id: '4',
            timestamp: DateTime(2026, 6, 10),
            durationMinutes: 10),
        MeditationSession(
            id: '5',
            timestamp: DateTime(2026, 6, 11),
            durationMinutes: 10),
        MeditationSession(
            id: '6',
            timestamp: DateTime(2026, 6, 12),
            durationMinutes: 10),
        MeditationSession(
            id: '7',
            timestamp: DateTime(2026, 6, 13),
            durationMinutes: 10),
        MeditationSession(
            id: '8',
            timestamp: DateTime(2026, 6, 14),
            durationMinutes: 10),
      ];

      expect(StatsService.calculateBestStreak(sessions), 5);
    });

    test('empty sessions return 0 streaks', () {
      expect(StatsService.calculateCurrentStreak([]), 0);
      expect(StatsService.calculateBestStreak([]), 0);
      expect(StatsService.calculateTotalMinutes([]), 0);
      expect(StatsService.getDailyMinutesMap([]), isEmpty);
    });

    test(
        'clearAllSessions clears sessions in memory and SharedPreferences and notifies listeners',
        () async {
      SharedPreferences.setMockInitialValues({});
      final service = StatsService.instance;
      await service.recordSession(15);
      expect(service.sessions.length, 1);

      bool notified = false;
      void listener() {
        notified = true;
      }

      service.addListener(listener);

      await service.clearAllSessions();

      expect(service.sessions, isEmpty);
      expect(notified, isTrue);

      final prefs = await SharedPreferences.getInstance();
      expect(prefs.getStringList('meditation_sessions_history'), isNull);

      service.removeListener(listener);
    });
  });
}

