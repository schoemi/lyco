/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { MetrikKarte } from '@/components/gamification/metrik-karte';

describe('MetrikKarte', () => {
  it('renders the label text', () => {
    render(React.createElement(MetrikKarte, { label: 'Songs aktiv', value: 5 }));
    expect(screen.getByText('Songs aktiv')).toBeDefined();
  });

  it('renders a string value', () => {
    render(React.createElement(MetrikKarte, { label: 'Status', value: '42%' }));
    expect(screen.getByText('42%')).toBeDefined();
  });

  it('renders a number value', () => {
    render(React.createElement(MetrikKarte, { label: 'Sessions gesamt', value: 17 }));
    expect(screen.getByText('17')).toBeDefined();
  });

  it('shows progress bar when fortschrittsbalken is provided', () => {
    render(React.createElement(MetrikKarte, { label: 'Ø Fortschritt', value: '65%', fortschrittsbalken: 65 }));
    expect(screen.getByRole('progressbar')).toBeDefined();
  });

  it('does not show progress bar when fortschrittsbalken is not provided', () => {
    render(React.createElement(MetrikKarte, { label: 'Songs aktiv', value: 3 }));
    expect(screen.queryByRole('progressbar')).toBeNull();
  });

  it('progress bar has correct aria attributes', () => {
    render(React.createElement(MetrikKarte, { label: 'Ø Fortschritt', value: '80%', fortschrittsbalken: 80 }));
    const bar = screen.getByRole('progressbar');
    expect(bar.getAttribute('aria-valuenow')).toBe('80');
    expect(bar.getAttribute('aria-valuemin')).toBe('0');
    expect(bar.getAttribute('aria-valuemax')).toBe('100');
  });

  it('progress bar width matches the fortschrittsbalken value', () => {
    const { container } = render(
      React.createElement(MetrikKarte, { label: 'Ø Fortschritt', value: '45%', fortschrittsbalken: 45 })
    );
    const progressBar = screen.getByRole('progressbar');
    const innerBar = progressBar.firstElementChild as HTMLElement;
    expect(innerBar.style.width).toBe('45%');
  });
});
