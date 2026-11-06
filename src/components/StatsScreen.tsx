import React, { useEffect, useState } from 'react';
import { MeditationSession, StatsService } from '../statsService';
import { PRIMARY_COLOR } from '../utils';
import { HeatmapCalendar } from './HeatmapCalendar';
import {
  CheckCircleOutlineRoundedIcon,
  CircleOutlinedIcon,
  EmojiEventsRoundedIcon,
  LocalFireDepartmentRoundedIcon,
  SelfImprovementRoundedIcon,
  TimelapseRoundedIcon,
} from './Icons';

function formatShortMonthDay(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatMediumDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export const StatsScreen: React.FC = () => {
  const [, setTick] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  const [selectedMinutes, setSelectedMinutes] = useState<number | null>(null);

  useEffect(() => {
    const onStatsChanged = () => {
      setTick((t) => t + 1);
    };
    StatsService.instance.addListener(onStatsChanged);
    if (!StatsService.instance.isLoaded) {
      void StatsService.instance.loadSessions();
    }
    return () => {
      StatsService.instance.removeListener(onStatsChanged);
    };
  }, []);

  const sessions = StatsService.instance.sessions;
  const currentStreak = StatsService.calculateCurrentStreak(sessions);
  const bestStreak = StatsService.calculateBestStreak(sessions);
  const totalMinutes = StatsService.calculateTotalMinutes(sessions);
  const totalSessions = sessions.length;
  const dailyMinutes = StatsService.getDailyMinutesMap(sessions);

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const inspectionDate = selectedDate ?? today;
  const inspectionKey = StatsService.dateKey(inspectionDate);
  const inspectionMinutes =
    selectedMinutes ?? (dailyMinutes.get(inspectionKey) ?? 0);

  const isToday =
    inspectionDate.getFullYear() === today.getFullYear() &&
    inspectionDate.getMonth() === today.getMonth() &&
    inspectionDate.getDate() === today.getDate();

  const dateStr = isToday
    ? `Today (${formatShortMonthDay(inspectionDate)})`
    : formatLongDate(inspectionDate);

  const handleDateSelected = (date: Date, minutes: number) => {
    setSelectedDate(date);
    setSelectedMinutes(minutes);
  };

  const recentSessions: readonly MeditationSession[] = sessions.slice(0, 20);

  return (
    <div className="stats-screen">
      <div className="stats-scroll-content">
        {/* Stat Cards Grid */}
        <div className="stats-grid">
          <div className="stats-grid-row">
            <div className="metric-card">
              <div className="metric-card-header">
                <LocalFireDepartmentRoundedIcon size={20} color="#FF6E40" />
                <span className="metric-card-label">Current Streak</span>
              </div>
              <div className="metric-card-value">
                {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <EmojiEventsRoundedIcon size={20} color="#FFD740" />
                <span className="metric-card-label">Best Streak</span>
              </div>
              <div className="metric-card-value">
                {bestStreak} {bestStreak === 1 ? 'day' : 'days'}
              </div>
            </div>
          </div>

          <div className="stats-grid-row">
            <div className="metric-card">
              <div className="metric-card-header">
                <TimelapseRoundedIcon size={20} color={PRIMARY_COLOR} />
                <span className="metric-card-label">Total Time</span>
              </div>
              <div className="metric-card-value">
                {StatsService.formatDuration(totalMinutes)}
              </div>
            </div>

            <div className="metric-card">
              <div className="metric-card-header">
                <SelfImprovementRoundedIcon size={20} color="#64FFDA" />
                <span className="metric-card-label">Total Sessions</span>
              </div>
              <div className="metric-card-value">{totalSessions}</div>
            </div>
          </div>
        </div>

        {/* Activity Heatmap Card */}
        <div className="stats-card">
          <div className="stats-card-header">
            <span className="stats-card-title">Meditation Activity</span>
            <span className="stats-card-subtitle">Past 12 months</span>
          </div>

          <HeatmapCalendar
            dailyMinutes={dailyMinutes}
            primaryColor={PRIMARY_COLOR}
            selectedDate={selectedDate}
            onDateSelected={handleDateSelected}
          />

          <div className="day-inspection-banner">
            {inspectionMinutes > 0 ? (
              <CheckCircleOutlineRoundedIcon size={16} color={PRIMARY_COLOR} />
            ) : (
              <CircleOutlinedIcon size={16} color="#9E9E9E" />
            )}
            <span
              className="day-inspection-text"
              style={{
                color: inspectionMinutes > 0 ? '#FFFFFF' : '#BDBDBD',
              }}
            >
              {inspectionMinutes > 0
                ? `${dateStr}: ${inspectionMinutes} min meditated`
                : `${dateStr}: No meditation recorded`}
            </span>
          </div>
        </div>

        {/* Recent Sessions History */}
        <div className="stats-card">
          <div className="stats-card-header">
            <span className="stats-card-title">Recent Sessions</span>
            {sessions.length > 0 && (
              <span className="stats-card-subtitle">
                {sessions.length} recorded
              </span>
            )}
          </div>

          {sessions.length === 0 ? (
            <div className="empty-sessions-state">
              <SelfImprovementRoundedIcon size={40} color="#757575" />
              <div className="empty-sessions-title">No sessions yet</div>
              <div className="empty-sessions-subtitle">
                Complete your first meditation to see your history!
              </div>
            </div>
          ) : (
            <div className="recent-sessions-list">
              {recentSessions.map((session, index) => (
                <React.Fragment key={session.id}>
                  {index > 0 && <div className="session-divider" />}
                  <div className="session-item">
                    <div className="session-icon-circle">
                      <SelfImprovementRoundedIcon
                        size={18}
                        color={PRIMARY_COLOR}
                      />
                    </div>
                    <div className="session-info">
                      <div className="session-date">
                        {formatMediumDate(session.timestamp)}
                      </div>
                      <div className="session-time">
                        {formatTime(session.timestamp)}
                      </div>
                    </div>
                    <div className="session-duration-pill">
                      {session.durationMinutes} min
                    </div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
