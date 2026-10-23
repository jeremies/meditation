import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

import 'package:meditation/heatmap_calendar.dart';
import 'package:meditation/stats_service.dart';
import 'package:meditation/utils.dart';

class StatsScreen extends StatefulWidget {
  const StatsScreen({Key? key}) : super(key: key);

  @override
  State<StatsScreen> createState() => _StatsScreenState();
}

class _StatsScreenState extends State<StatsScreen> {
  DateTime? _selectedDate;
  int? _selectedMinutes;

  @override
  void initState() {
    super.initState();
    StatsService.instance.addListener(_onStatsChanged);
    if (!StatsService.instance.isLoaded) {
      StatsService.instance.loadSessions();
    }
    final now = DateTime.now();
    _selectedDate = DateTime(now.year, now.month, now.day);
  }

  @override
  void dispose() {
    StatsService.instance.removeListener(_onStatsChanged);
    super.dispose();
  }

  void _onStatsChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  void _onDateSelected(DateTime date, int minutes) {
    setState(() {
      _selectedDate = date;
      _selectedMinutes = minutes;
    });
  }

  @override
  Widget build(BuildContext context) {
    final sessions = StatsService.instance.sessions;
    final currentStreak = StatsService.calculateCurrentStreak(sessions);
    final bestStreak = StatsService.calculateBestStreak(sessions);
    final totalMinutes = StatsService.calculateTotalMinutes(sessions);
    final totalSessions = sessions.length;
    final dailyMinutes = StatsService.getDailyMinutesMap(sessions);

    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final inspectionDate = _selectedDate ?? today;
    final inspectionMinutes = _selectedMinutes ?? (dailyMinutes[inspectionDate] ?? 0);

    return Scaffold(
      backgroundColor: backgroundColor,
      body: SafeArea(
        child: SingleChildScrollView(
          physics: const BouncingScrollPhysics(),
          padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 12.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Stat Cards Grid
              _buildStatsGrid(
                currentStreak: currentStreak,
                bestStreak: bestStreak,
                totalMinutes: totalMinutes,
                totalSessions: totalSessions,
              ),
              const SizedBox(height: 16.0),

              // Activity Heatmap Card
              _buildHeatmapCard(
                dailyMinutes: dailyMinutes,
                inspectionDate: inspectionDate,
                inspectionMinutes: inspectionMinutes,
                today: today,
              ),
              const SizedBox(height: 16.0),

              // Recent Sessions History
              _buildRecentSessionsCard(sessions),
              const SizedBox(height: 24.0),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildStatsGrid({
    required int currentStreak,
    required int bestStreak,
    required int totalMinutes,
    required int totalSessions,
  }) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                icon: Icons.local_fire_department_rounded,
                iconColor: Colors.deepOrangeAccent,
                label: 'Current Streak',
                value: '$currentStreak ${currentStreak == 1 ? 'day' : 'days'}',
              ),
            ),
            const SizedBox(width: 12.0),
            Expanded(
              child: _buildMetricCard(
                icon: Icons.emoji_events_rounded,
                iconColor: Colors.amberAccent,
                label: 'Best Streak',
                value: '$bestStreak ${bestStreak == 1 ? 'day' : 'days'}',
              ),
            ),
          ],
        ),
        const SizedBox(height: 12.0),
        Row(
          children: [
            Expanded(
              child: _buildMetricCard(
                icon: Icons.timelapse_rounded,
                iconColor: primaryColor ?? Colors.indigoAccent,
                label: 'Total Time',
                value: StatsService.formatDuration(totalMinutes),
              ),
            ),
            const SizedBox(width: 12.0),
            Expanded(
              child: _buildMetricCard(
                icon: Icons.self_improvement_rounded,
                iconColor: Colors.tealAccent,
                label: 'Total Sessions',
                value: '$totalSessions',
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildMetricCard({
    required IconData icon,
    required Color iconColor,
    required String label,
    required String value,
  }) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 14.0),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 20.0, color: iconColor),
              const SizedBox(width: 6.0),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    fontSize: 12.0,
                    color: Colors.grey[400],
                    fontWeight: FontWeight.w500,
                  ),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
          const SizedBox(height: 8.0),
          Text(
            value,
            style: const TextStyle(
              fontSize: 18.0,
              fontWeight: FontWeight.bold,
              color: Colors.white,
              letterSpacing: 0.3,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildHeatmapCard({
    required Map<DateTime, int> dailyMinutes,
    required DateTime inspectionDate,
    required int inspectionMinutes,
    required DateTime today,
  }) {
    final isToday = inspectionDate.year == today.year &&
        inspectionDate.month == today.month &&
        inspectionDate.day == today.day;
    final dateStr = isToday
        ? 'Today (${DateFormat.MMMd().format(inspectionDate)})'
        : DateFormat.yMMMMd().format(inspectionDate);

    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Meditation Activity',
                style: TextStyle(
                  fontSize: 16.0,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              Text(
                'Past 12 months',
                style: TextStyle(
                  fontSize: 12.0,
                  color: Colors.grey[400],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14.0),
          HeatmapCalendar(
            dailyMinutes: dailyMinutes,
            primaryColor: primaryColor ?? Colors.indigoAccent,
            selectedDate: _selectedDate,
            onDateSelected: _onDateSelected,
          ),
          const SizedBox(height: 14.0),
          // Day Inspection Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12.0, vertical: 8.0),
            decoration: BoxDecoration(
              color: Colors.white.withOpacity(0.04),
              borderRadius: BorderRadius.circular(8.0),
            ),
            child: Row(
              children: [
                Icon(
                  inspectionMinutes > 0
                      ? Icons.check_circle_outline_rounded
                      : Icons.circle_outlined,
                  size: 16.0,
                  color: inspectionMinutes > 0
                      ? (primaryColor ?? Colors.indigoAccent)
                      : Colors.grey[500],
                ),
                const SizedBox(width: 8.0),
                Expanded(
                  child: Text(
                    inspectionMinutes > 0
                        ? '$dateStr: $inspectionMinutes min meditated'
                        : '$dateStr: No meditation recorded',
                    style: TextStyle(
                      fontSize: 12.5,
                      color: inspectionMinutes > 0 ? Colors.white : Colors.grey[400],
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildRecentSessionsCard(List<MeditationSession> sessions) {
    return Container(
      padding: const EdgeInsets.all(16.0),
      decoration: BoxDecoration(
        color: surfaceColor,
        borderRadius: BorderRadius.circular(12.0),
        border: Border.all(color: Colors.white.withOpacity(0.06)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'Recent Sessions',
                style: TextStyle(
                  fontSize: 16.0,
                  fontWeight: FontWeight.bold,
                  color: Colors.white,
                ),
              ),
              if (sessions.isNotEmpty)
                Text(
                  '${sessions.length} recorded',
                  style: TextStyle(
                    fontSize: 12.0,
                    color: Colors.grey[400],
                  ),
                ),
            ],
          ),
          const SizedBox(height: 12.0),
          if (sessions.isEmpty)
            Padding(
              padding: const EdgeInsets.symmetric(vertical: 24.0),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      Icons.self_improvement_rounded,
                      size: 40.0,
                      color: Colors.grey[600],
                    ),
                    const SizedBox(height: 8.0),
                    Text(
                      'No sessions yet',
                      style: TextStyle(
                        fontSize: 14.0,
                        fontWeight: FontWeight.w600,
                        color: Colors.grey[400],
                      ),
                    ),
                    const SizedBox(height: 4.0),
                    Text(
                      'Complete your first meditation to see your history!',
                      style: TextStyle(
                        fontSize: 12.0,
                        color: Colors.grey[500],
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ],
                ),
              ),
            )
          else
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: sessions.length > 20 ? 20 : sessions.length,
              separatorBuilder: (context, index) => Divider(
                color: Colors.white.withOpacity(0.06),
                height: 16.0,
              ),
              itemBuilder: (context, index) {
                final session = sessions[index];
                final dateFormatted =
                    DateFormat.yMMMd().format(session.timestamp);
                final timeFormatted =
                    DateFormat.jm().format(session.timestamp);

                return Row(
                  children: [
                    Container(
                      width: 34.0,
                      height: 34.0,
                      decoration: BoxDecoration(
                        color: (primaryColor ?? Colors.indigoAccent)
                            .withOpacity(0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        Icons.self_improvement_rounded,
                        size: 18.0,
                        color: primaryColor ?? Colors.indigoAccent,
                      ),
                    ),
                    const SizedBox(width: 12.0),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            dateFormatted,
                            style: const TextStyle(
                              fontSize: 13.5,
                              fontWeight: FontWeight.w600,
                              color: Colors.white,
                            ),
                          ),
                          const SizedBox(height: 2.0),
                          Text(
                            timeFormatted,
                            style: TextStyle(
                              fontSize: 11.5,
                              color: Colors.grey[400],
                            ),
                          ),
                        ],
                      ),
                    ),
                    Container(
                      padding: const EdgeInsets.symmetric(
                          horizontal: 10.0, vertical: 4.0),
                      decoration: BoxDecoration(
                        color: Colors.white.withOpacity(0.06),
                        borderRadius: BorderRadius.circular(12.0),
                      ),
                      child: Text(
                        '${session.durationMinutes} min',
                        style: TextStyle(
                          fontSize: 12.0,
                          fontWeight: FontWeight.w600,
                          color: primaryColor ?? Colors.indigoAccent,
                        ),
                      ),
                    ),
                  ],
                );
              },
            ),
        ],
      ),
    );
  }
}

