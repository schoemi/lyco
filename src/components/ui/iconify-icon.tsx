"use client";

import { Icon } from "@iconify/react";

/**
 * Zentrale Icon-Komponente basierend auf Iconify.
 *
 * Nutzt standardmäßig die Theme-Variable `--color-icon` für eine
 * einheitliche, monochrome Icon-Darstellung. Die Farbe kann über
 * das Admin-Theming global gesteuert werden.
 *
 * Beispiel: <AppIcon icon="lucide:search" />
 */

export interface AppIconProps {
  /** Iconify icon name, z.B. "lucide:search" */
  icon: string;
  /** CSS color – überschreibt die Theme-Farbe */
  color?: string;
  /** CSS class names */
  className?: string;
  /** Accessible label (wenn gesetzt, wird role="img" verwendet) */
  label?: string;
  /** Inline style overrides */
  style?: React.CSSProperties;
}

export function AppIcon({ icon, color, className, label, style }: AppIconProps) {
  return (
    <Icon
      icon={icon}
      className={className}
      style={{ color: color ?? "var(--color-icon)", ...style }}
      aria-hidden={!label}
      aria-label={label || undefined}
      role={label ? "img" : undefined}
    />
  );
}
