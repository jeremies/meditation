import 'package:flutter/material.dart';
import 'package:intl/intl.dart';

class HeatmapCalendar extends StatefulWidget {
  final Map<DateTime, int> dailyMinutes;
  final Color primaryColor;
  final DateTime? selectedDate;
  final void Function(DateTime date, int minutes) onDateSelected;

  const HeatmapCalendar({
    Key? key,
    required this.dailyMinutes,
    required this.primaryColor,
    this.selectedDate,
    required this.onDateSelected,
  }) : super(key: key);

  @override
  State<HeatmapCalendar> createState() => _HeatmapCalendarState();
}

class _HeatmapCalendarState extends State<HeatmapCalendar> {
  late final ScrollController _scrollController;
  final double cellSize = 13.0;
  final double cellSpacing = 3.0;
  final int totalWeeks = 52;

  late final DateTime _today;
  late final DateTime _startMonday;

  @override
  void initState() {
    super.initState();
    _scrollController = ScrollController();

    final now = DateTime.now();
    _today = DateTime(now.year, now.month, now.day);

    // Monday of current week
    final currentWeekMonday =
        DateTime(_today.year, _today.month, _today.day - (_today.weekday - 1));
    // 51 weeks before current week monday (total 52 weeks)
    _startMonday = DateTime(currentWeekMonday.year, currentWeekMonday.month,
        currentWeekMonday.day - ((totalWeeks - 1) * 7));

    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients &&
          _scrollController.position.hasContentDimensions) {
        _scrollController.jumpTo(_scrollController.position.maxScrollExtent);
      }
    });
  }

  @override
  void dispose() {
    _scrollController.dispose();
    super.dispose();
  }

  Color _getColorForMinutes(int minutes) {
    if (minutes <= 0) {
      return Colors.white.withOpacity(0.06);
    } else if (minutes <= 15) {
      return widget.primaryColor.withOpacity(0.35);
    } else if (minutes <= 30) {
      return widget.primaryColor.withOpacity(0.60);
    } else if (minutes <= 45) {
      return widget.primaryColor.withOpacity(0.85);
    } else {
      return widget.primaryColor;
    }
  }

  DateTime _getDateForCell(int weekIndex, int dayIndex) {
    return DateTime(_startMonday.year, _startMonday.month,
        _startMonday.day + (weekIndex * 7 + dayIndex));
  }

  bool _isSameDay(DateTime a, DateTime b) {
    return a.year == b.year && a.month == b.month && a.day == b.day;
  }

  @override
  Widget build(BuildContext context) {
    const weekdayLabels = ['M', '', 'W', '', 'F', '', ''];

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Weekday labels column
            Padding(
              padding: const EdgeInsets.only(top: 22.0, right: 6.0),
              child: Column(
                children: List.generate(7, (index) {
                  return Container(
                    height: cellSize,
                    margin: EdgeInsets.only(bottom: cellSpacing),
                    alignment: Alignment.center,
                    child: Text(
                      weekdayLabels[index],
                      style: TextStyle(
                        fontSize: 9.0,
                        color: Colors.grey[500],
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  );
                }),
              ),
            ),
            // Horizontally scrollable weeks grid
            Expanded(
              child: SingleChildScrollView(
                controller: _scrollController,
                scrollDirection: Axis.horizontal,
                physics: const BouncingScrollPhysics(),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    // Month labels row
                    _buildMonthLabelsRow(),
                    const SizedBox(height: 4.0),
                    // 52 weeks grid (7 rows)
                    Row(
                      children: List.generate(totalWeeks, (weekIndex) {
                        return Container(
                          margin: EdgeInsets.only(right: cellSpacing),
                          child: Column(
                            children: List.generate(7, (dayIndex) {
                              final cellDate =
                                  _getDateForCell(weekIndex, dayIndex);
                              final isFuture = cellDate.isAfter(_today);
                              final minutes = isFuture
                                  ? 0
                                  : (widget.dailyMinutes[cellDate] ?? 0);
                              final isSelected = widget.selectedDate != null &&
                                  _isSameDay(widget.selectedDate!, cellDate);

                              if (isFuture) {
                                return Container(
                                  width: cellSize,
                                  height: cellSize,
                                  margin: EdgeInsets.only(bottom: cellSpacing),
                                  decoration: BoxDecoration(
                                    color: Colors.transparent,
                                    borderRadius: BorderRadius.circular(2.5),
                                  ),
                                );
                              }

                              return GestureDetector(
                                onTap: () => widget.onDateSelected(
                                    cellDate, minutes),
                                child: Container(
                                  width: cellSize,
                                  height: cellSize,
                                  margin: EdgeInsets.only(bottom: cellSpacing),
                                  decoration: BoxDecoration(
                                    color: _getColorForMinutes(minutes),
                                    borderRadius: BorderRadius.circular(2.5),
                                    border: isSelected
                                        ? Border.all(
                                            color: Colors.white,
                                            width: 1.5,
                                          )
                                        : null,
                                  ),
                                ),
                              );
                            }),
                          ),
                        );
                      }),
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 10.0),
        // Legend row
        Row(
          mainAxisAlignment: MainAxisAlignment.end,
          children: [
            Text(
              'Less',
              style: TextStyle(
                fontSize: 10.0,
                color: Colors.grey[500],
              ),
            ),
            const SizedBox(width: 5.0),
            _buildLegendBox(0),
            const SizedBox(width: 3.0),
            _buildLegendBox(10),
            const SizedBox(width: 3.0),
            _buildLegendBox(25),
            const SizedBox(width: 3.0),
            _buildLegendBox(40),
            const SizedBox(width: 3.0),
            _buildLegendBox(50),
            const SizedBox(width: 5.0),
            Text(
              'More',
              style: TextStyle(
                fontSize: 10.0,
                color: Colors.grey[500],
              ),
            ),
          ],
        ),
      ],
    );
  }

  Widget _buildLegendBox(int minutes) {
    return Container(
      width: 10.0,
      height: 10.0,
      decoration: BoxDecoration(
        color: _getColorForMinutes(minutes),
        borderRadius: BorderRadius.circular(2.0),
      ),
    );
  }

  Widget _buildMonthLabelsRow() {
    final List<Widget> monthWidgets = [];
    int lastMonth = -1;

    for (int w = 0; w < totalWeeks; w++) {
      // Month of Monday of that week
      final weekMonday = _getDateForCell(w, 0);
      final month = weekMonday.month;

      if (month != lastMonth && w < totalWeeks - 1) {
        lastMonth = month;
        final monthName = DateFormat.MMM().format(weekMonday);
        monthWidgets.add(
          Container(
            width: (cellSize + cellSpacing) * 4,
            alignment: Alignment.centerLeft,
            child: Text(
              monthName,
              style: TextStyle(
                fontSize: 9.5,
                color: Colors.grey[400],
                fontWeight: FontWeight.w500,
              ),
              overflow: TextOverflow.visible,
            ),
          ),
        );
      }
    }

    final totalWidth = totalWeeks * (cellSize + cellSpacing);
    return SizedBox(
      height: 16.0,
      width: totalWidth,
      child: Stack(
        children: _buildPositionedMonthLabels(),
      ),
    );
  }

  List<Widget> _buildPositionedMonthLabels() {
    final List<Widget> labels = [];
    int lastMonth = -1;

    for (int w = 0; w < totalWeeks; w++) {
      final weekMonday = _getDateForCell(w, 0);
      final month = weekMonday.month;

      if (month != lastMonth) {
        lastMonth = month;
        final monthName = DateFormat.MMM().format(weekMonday);
        final leftOffset = w * (cellSize + cellSpacing);
        labels.add(
          Positioned(
            left: leftOffset,
            top: 0,
            child: Text(
              monthName,
              style: TextStyle(
                fontSize: 9.5,
                color: Colors.grey[400],
                fontWeight: FontWeight.w500,
              ),
            ),
          ),
        );
      }
    }
    return labels;
  }
}

