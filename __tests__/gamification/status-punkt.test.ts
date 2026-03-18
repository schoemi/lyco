/**
 * @vitest-environment jsdom
 */
import { describe, it, expect } from 'vitest';
import React from 'react';
import { render } from '@testing-library/react';
import { getStatusPunktFarbe } from '@/lib/gamification/status-punkt';
import { StatusPunkt } from '@/components/gamification/status-punkt';

describe('getStatusPunktFarbe', () => {
  it('returns "grau" for 0%', () => {
    expect(getStatusPunktFarbe(0)).toBe('grau');
  });

  it('returns "orange" for 1%', () => {
    expect(getStatusPunktFarbe(1)).toBe('orange');
  });

  it('returns "orange" for 50%', () => {
    expect(getStatusPunktFarbe(50)).toBe('orange');
  });

  it('returns "orange" for 99%', () => {
    expect(getStatusPunktFarbe(99)).toBe('orange');
  });

  it('returns "gruen" for 100%', () => {
    expect(getStatusPunktFarbe(100)).toBe('gruen');
  });

  it('returns "grau" for negative values', () => {
    expect(getStatusPunktFarbe(-5)).toBe('grau');
  });

  it('returns "gruen" for values above 100', () => {
    expect(getStatusPunktFarbe(150)).toBe('gruen');
  });
});

describe('StatusPunkt component', () => {
  it('renders a gray dot for 0% progress', () => {
    const { container } = render(React.createElement(StatusPunkt, { fortschritt: 0 }));
    const dot = container.querySelector('span');
    expect(dot).not.toBeNull();
    expect(dot!.className).toContain('bg-neutral-300');
    expect(dot!.getAttribute('aria-label')).toBe('Fortschritt: 0%');
  });

  it('renders an orange dot for 50% progress', () => {
    const { container } = render(React.createElement(StatusPunkt, { fortschritt: 50 }));
    const dot = container.querySelector('span');
    expect(dot!.className).toContain('bg-warning-400');
    expect(dot!.getAttribute('aria-label')).toBe('Fortschritt: 50%');
  });

  it('renders a green dot for 100% progress', () => {
    const { container } = render(React.createElement(StatusPunkt, { fortschritt: 100 }));
    const dot = container.querySelector('span');
    expect(dot!.className).toContain('bg-success-500');
    expect(dot!.getAttribute('aria-label')).toBe('Fortschritt: 100%');
  });

  it('renders with correct shape classes', () => {
    const { container } = render(React.createElement(StatusPunkt, { fortschritt: 0 }));
    const dot = container.querySelector('span');
    expect(dot!.className).toContain('rounded-full');
    expect(dot!.className).toContain('h-3');
    expect(dot!.className).toContain('w-3');
  });

  it('has role="img" for accessibility', () => {
    const { container } = render(React.createElement(StatusPunkt, { fortschritt: 0 }));
    const dot = container.querySelector('span');
    expect(dot!.getAttribute('role')).toBe('img');
  });
});
