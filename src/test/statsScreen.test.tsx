import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { StatsScreen } from '../components/StatsScreen';
import { StatsService } from '../statsService';

describe('StatsScreen tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await StatsService.instance.clearAllSessions();
    await StatsService.instance.loadSessions();
  });

  it('StatsScreen renders cards and heatmap', () => {
    render(<StatsScreen />);

    expect(screen.getByText('Current Streak')).toBeInTheDocument();
    expect(screen.getByText('Best Streak')).toBeInTheDocument();
    expect(screen.getByText('Total Time')).toBeInTheDocument();
    expect(screen.getByText('Total Sessions')).toBeInTheDocument();
    expect(screen.getByText('Meditation Activity')).toBeInTheDocument();
    expect(screen.getByText('Recent Sessions')).toBeInTheDocument();
  });
});
