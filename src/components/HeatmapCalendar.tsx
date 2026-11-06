import React, { useEffect, useMemo, useRef } from 'react';
import { StatsService } from '../statsService';

interface HeatmapCalendarProps {
  dailyMinutes: Map<string, number>;
  primaryColor?: string;
  selectedDate: Date | null;
  onDateSelected: (date: Date, minutes: number) => void;
}

const CELL_SIZE = 13;
const CELL_SPACING = 3;
const TOTAL_WEEKS = 52;
const WEEKDAY_LABELS = ['M', '', 'W', '', 'F', '', ''];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

export function getColorForMinutes(minutes: number): string {
  if (minutes <= 0) {
    return 'rgba(255, 255, 255, 0.06)';
  } else if (minutes <= 15) {
    return 'rgba(140, 158, 255, 0.35)';
  } else if (minutes <= 30) {
    return 'rgba(140, 158, 255, 0.60)';
  } else if (minutes <= 45) {
    return 'rgba(140, 158, 255, 0.85)';
  } else {
    return '#8C9EFF';
  }
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export const HeatmapCalendar: React.FC<HeatmapCalendarProps> = ({
  dailyMinutes,
  selectedDate,
  onDateSelected,
}) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { today, startMonday } = useMemo(() => {
    const now = new Date();
    const normToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    // Convert JS getDay (0=Sun..6=Sat) to ISO weekday (1=Mon..7=Sun)
    const isoWeekday = normToday.getDay() === 0 ? 7 : normToday.getDay();
    const currentWeekMonday = new Date(
      normToday.getFullYear(),
      normToday.getMonth(),
      normToday.getDate() - (isoWeekday - 1)
    );
    const firstMonday = new Date(
      currentWeekMonday.getFullYear(),
      currentWeekMonday.getMonth(),
      currentWeekMonday.getDate() - (TOTAL_WEEKS - 1) * 7
    );
    return { today: normToday, startMonday: firstMonday };
  }, []);

  useEffect(() => {
    const el = scrollContainerRef.current;
    if (el) {
      el.scrollLeft = el.scrollWidth;
    }
  }, []);

  const getDateForCell = (weekIndex: number, dayIndex: number): Date => {
    return new Date(
      startMonday.getFullYear(),
      startMonday.getMonth(),
      startMonday.getDate() + (weekIndex * 7 + dayIndex)
    );
  };

  const monthLabels = useMemo(() => {
    const labels: Array<{ weekIndex: number; label: string; leftOffset: number }> = [];
    let lastMonth = -1;

    for (let w = 0; w < TOTAL_WEEKS; w++) {
      const weekMonday = new Date(
        startMonday.getFullYear(),
        startMonday.getMonth(),
        startMonday.getDate() + w * 7
      );
      const month = weekMonday.getMonth();
      if (month !== lastMonth) {
        lastMonth = month;
        labels.push({
          weekIndex: w,
          label: MONTH_NAMES[month],
          leftOffset: w * (CELL_SIZE + CELL_SPACING),
        });
      }
    }
    return labels;
  }, [startMonday]);

  const totalWidth = TOTAL_WEEKS * (CELL_SIZE + CELL_SPACING);

  return (
    <div className="heatmap-calendar">
      <div className="heatmap-main-row">
        {/* Weekday labels column */}
        <div className="heatmap-weekday-col">
          {WEEKDAY_LABELS.map((label, idx) => (
            <div
              key={idx}
              className="heatmap-weekday-label"
              style={{
                height: `${CELL_SIZE}px`,
                marginBottom: `${CELL_SPACING}px`,
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* Horizontally scrollable weeks grid */}
        <div className="heatmap-scroll-container" ref={scrollContainerRef}>
          <div style={{ width: `${totalWidth}px` }}>
            {/* Month labels row */}
            <div
              className="heatmap-month-row"
              style={{ width: `${totalWidth}px`, height: '16px' }}
            >
              {monthLabels.map((m) => (
                <span
                  key={`${m.weekIndex}-${m.label}`}
                  className="heatmap-month-label"
                  style={{ left: `${m.leftOffset}px` }}
                >
                  {m.label}
                </span>
              ))}
            </div>

            {/* 52 weeks grid (7 rows) */}
            <div className="heatmap-weeks-row">
              {Array.from({ length: TOTAL_WEEKS }, (_, weekIndex) => (
                <div
                  key={weekIndex}
                  className="heatmap-week-col"
                  style={{ marginRight: `${CELL_SPACING}px` }}
                >
                  {Array.from({ length: 7 }, (__, dayIndex) => {
                    const cellDate = getDateForCell(weekIndex, dayIndex);
                    const isFuture = cellDate.getTime() > today.getTime();
                    const key = StatsService.dateKey(cellDate);
                    const minutes = isFuture ? 0 : (dailyMinutes.get(key) ?? 0);
                    const isSelected =
                      selectedDate !== null && isSameDay(selectedDate, cellDate);

                    if (isFuture) {
                      return (
                        <div
                          key={dayIndex}
                          style={{
                            width: `${CELL_SIZE}px`,
                            height: `${CELL_SIZE}px`,
                            marginBottom: `${CELL_SPACING}px`,
                            backgroundColor: 'transparent',
                            borderRadius: '2.5px',
                          }}
                        />
                      );
                    }

                    return (
                      <button
                        key={dayIndex}
                        type="button"
                        className="heatmap-cell"
                        aria-label={`${key}: ${minutes} min`}
                        onClick={() => onDateSelected(cellDate, minutes)}
                        style={{
                          width: `${CELL_SIZE}px`,
                          height: `${CELL_SIZE}px`,
                          marginBottom: `${CELL_SPACING}px`,
                          backgroundColor: getColorForMinutes(minutes),
                          borderRadius: '2.5px',
                          border: isSelected ? '1.5px solid #ffffff' : 'none',
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legend row */}
      <div className="heatmap-legend-row">
        <span className="heatmap-legend-text">Less</span>
        {[0, 10, 25, 40, 50].map((minVal) => (
          <span
            key={minVal}
            className="heatmap-legend-box"
            style={{ backgroundColor: getColorForMinutes(minVal) }}
          />
        ))}
        <span className="heatmap-legend-text">More</span>
      </div>
    </div>
  );
};
