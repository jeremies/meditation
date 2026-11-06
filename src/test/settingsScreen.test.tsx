import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { App } from '../App';
import { StatsService } from '../statsService';

describe('SettingsScreen tests', () => {
  beforeEach(async () => {
    localStorage.clear();
    await StatsService.instance.clearAllSessions();
  });

  it('Clear meditation history dialog cancels and clears correctly', async () => {
    const stats = StatsService.instance;
    await stats.recordSession(20);
    expect(stats.sessions.length).toBe(1);

    render(<App />);

    // Open Settings
    const settingsBtn = screen.getByLabelText('Open Settings');
    fireEvent.click(settingsBtn);

    expect(screen.getByText('DANGER ZONE')).toBeInTheDocument();
    expect(screen.getByTestId('delete-forever-icon')).toBeInTheDocument();

    const clearTile = screen.getByText('Clear meditation history');
    expect(clearTile).toBeInTheDocument();

    // Tap to open confirmation dialog
    fireEvent.click(clearTile);

    expect(screen.getByText('Clear meditation history?')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Are you sure you want to delete all session logs? This action cannot be undone and will reset your streaks and statistics.'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Clear')).toBeInTheDocument();

    // Tap Cancel
    fireEvent.click(screen.getByText('Cancel'));
    expect(stats.sessions.length).toBe(1);
    expect(
      screen.queryByText('Clear meditation history?')
    ).not.toBeInTheDocument();

    // Tap again and confirm Clear
    fireEvent.click(clearTile);
    fireEvent.click(screen.getByText('Clear'));

    await waitFor(() => {
      expect(stats.sessions.length).toBe(0);
      expect(
        screen.getByText('All meditation history has been cleared')
      ).toBeInTheDocument();
    });
  });
});
