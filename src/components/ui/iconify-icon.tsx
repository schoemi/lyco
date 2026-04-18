"use client";

import { Icon, addCollection } from "@iconify/react";
import lucideIcons from "@iconify-json/lucide/icons.json";

// Lucide-Icons lokal registrieren, damit keine API-Aufrufe nötig sind.
// Dies verhindert CSP-Blockaden (connect-src 'self') und verbessert die Performance.
addCollection(lucideIcons);

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
      style={{ color: color ?? "var(--color-icon, currentColor)", ...style }}
      aria-hidden={!label}
      aria-label={label || undefined}
      role={label ? "img" : undefined}
    />
  );
}
