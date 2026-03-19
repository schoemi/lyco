"use client";

import { Icon } from "@iconify/react";

/**
 * Zentrale Icon-Komponente basierend auf Iconify.
 *
 * Unterstützt das gesamte Iconify-Ökosystem (200k+ Icons).
 * FontAwesome 6 Solid Icons sind unter dem Prefix `fa6-solid:` verfügbar.
 *
 * Beispiel: <AppIcon icon="fa6-solid:microphone" color="#e53e3e" />
 */

export interface AppIconProps {
  /** Iconify icon name, z.B. "fa6-solid:microphone" */
  icon: string;
  /** CSS color */
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
      style={{ color, ...style }}
      aria-hidden={!label}
      aria-label={label || undefined}
      role={label ? "img" : undefined}
    />
  );
}
