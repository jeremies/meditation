import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class MeditationSession {
  final String id;
  final DateTime timestamp;
  final int durationMinutes;

  MeditationSession({
    required this.id,
    required this.timestamp,
    required this.durationMinutes,
  });

  Map<String, dynamic> toJson() => {
        'id': id,
        'timestamp': timestamp.toIso8601String(),
        'durationMinutes': durationMinutes,
      };

  factory MeditationSession.fromJson(Map<String, dynamic> json) {
    return MeditationSession(
      id: json['id'] as String? ?? UniqueKey().toString(),
      timestamp: DateTime.parse(json['timestamp'] as String),
      durationMinutes: json['durationMinutes'] as int? ?? 0,
    );
  }
}

class StatsService extends ChangeNotifier {
  static final StatsService _instance = StatsService._internal();
  static StatsService get instance => _instance;

  StatsService._internal();

  static const String _storageKey = 'meditation_sessions_history';

  List<MeditationSession> _sessions = [];
  bool _isLoaded = false;

  bool get isLoaded => _isLoaded;
  List<MeditationSession> get sessions => List.unmodifiable(_sessions);

  Future<List<MeditationSession>> getSessions() async {
    if (!_isLoaded) {
      await loadSessions();
    }
    return List.unmodifiable(_sessions);
  }

  Future<void> loadSessions() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final List<String>? jsonList = prefs.getStringList(_storageKey);
      if (jsonList != null) {
        _sessions = jsonList
            .map((item) {
              try {
                return MeditationSession.fromJson(
                    jsonDecode(item) as Map<String, dynamic>);
              } catch (_) {
                return null;
              }
            })
            .whereType<MeditationSession>()
            .toList();
        // Sort newest first
        _sessions.sort((a, b) => b.timestamp.compareTo(a.timestamp));
      } else {
        _sessions = [];
      }
    } catch (e) {
      _sessions = [];
    } finally {
      _isLoaded = true;
      notifyListeners();
    }
  }

  Future<void> recordSession(int durationMinutes, {DateTime? timestamp}) async {
    if (durationMinutes <= 0) return;

    final session = MeditationSession(
      id: '${DateTime.now().millisecondsSinceEpoch}_${durationMinutes}',
      timestamp: timestamp ?? DateTime.now(),
      durationMinutes: durationMinutes,
    );

    if (!_isLoaded) {
      await loadSessions();
    }

    _sessions.insert(0, session);

    final prefs = await SharedPreferences.getInstance();
    final List<String> jsonList =
        _sessions.map((s) => jsonEncode(s.toJson())).toList();
    await prefs.setStringList(_storageKey, jsonList);

    notifyListeners();
  }

  Future<void> clearAllSessions() async {
    _sessions = [];
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_storageKey);
    notifyListeners();
  }

  static DateTime normalizeDate(DateTime dt) =>
      DateTime(dt.year, dt.month, dt.day);

  static bool isNextDay(DateTime first, DateTime second) {
    final next = DateTime(first.year, first.month, first.day + 1);
    return next.year == second.year &&
        next.month == second.month &&
        next.day == second.day;
  }

  static int calculateCurrentStreak(List<MeditationSession> sessions,
      [DateTime? referenceDate]) {
    if (sessions.isEmpty) return 0;

    final today = normalizeDate(referenceDate ?? DateTime.now());
    final yesterday = DateTime(today.year, today.month, today.day - 1);

    final Set<DateTime> sessionDays = sessions
        .map((s) => normalizeDate(s.timestamp))
        .toSet();

    DateTime checkDate;
    if (sessionDays.contains(today)) {
      checkDate = today;
    } else if (sessionDays.contains(yesterday)) {
      checkDate = yesterday;
    } else {
      return 0;
    }

    int streak = 0;
    while (sessionDays.contains(checkDate)) {
      streak++;
      checkDate = DateTime(checkDate.year, checkDate.month, checkDate.day - 1);
    }

    return streak;
  }

  static int calculateBestStreak(List<MeditationSession> sessions) {
    if (sessions.isEmpty) return 0;

    final List<DateTime> sortedDays = sessions
        .map((s) => normalizeDate(s.timestamp))
        .toSet()
        .toList()
      ..sort((a, b) => a.compareTo(b));

    if (sortedDays.isEmpty) return 0;

    int maxStreak = 1;
    int currentStreak = 1;

    for (int i = 0; i < sortedDays.length - 1; i++) {
      if (isNextDay(sortedDays[i], sortedDays[i + 1])) {
        currentStreak++;
        if (currentStreak > maxStreak) {
          maxStreak = currentStreak;
        }
      } else {
        currentStreak = 1;
      }
    }

    return maxStreak;
  }

  static int calculateTotalMinutes(List<MeditationSession> sessions) {
    return sessions.fold(0, (total, s) => total + s.durationMinutes);
  }

  static Map<DateTime, int> getDailyMinutesMap(
      List<MeditationSession> sessions) {
    final Map<DateTime, int> map = {};
    for (final s in sessions) {
      final key = normalizeDate(s.timestamp);
      map[key] = (map[key] ?? 0) + s.durationMinutes;
    }
    return map;
  }

  static String formatDuration(int totalMinutes) {
    if (totalMinutes < 60) {
      return '$totalMinutes min';
    }
    final hours = totalMinutes ~/ 60;
    final minutes = totalMinutes % 60;
    if (minutes == 0) {
      return '${hours}h';
    }
    return '${hours}h ${minutes}m';
  }
}

