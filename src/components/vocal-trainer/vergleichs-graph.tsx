"use client";

import { useMemo } from "react";

interface VergleichsGraphProps {
  referenzKurve: { timestampMs: number; midiValue: number }[];
  nutzerKurve: {
    timestampMs: number;
    midiValue: number;
    abweichungCents: number;
  }[];
}

/** Returns the color for a given cents deviation. */
function abweichungFarbe(abweichungCents: number): string {
  const abs = Math.abs(abweichungCents);
  if (abs < 50) return "#22c55e"; // green
  if (abs <= 100) return "#eab308"; // yellow
  return "#ef4444"; // red
}

/**
 * SVG-based pitch curve comparison graph.
 * Draws the reference curve as a gray/blue line and the user curve
 * with color-coded segments based on pitch deviation in cents.
 */
export function VergleichsGraph({
  referenzKurve,
  nutzerKurve,
}: VergleichsGraphProps) {
  const { svgWidth, svgHeight, padding, xScale, yScale, ariaLabel } =
    useMemo(() => {
      const w = 800;
      const h = 300;
      const pad = { top: 20, right: 20, bottom: 30, left: 40 };

      if (referenzKurve.length === 0 && nutzerKurve.length === 0) {
        return {
          svgWidth: w,
          svgHeight: h,
          padding: pad,
          xScale: (_t: number) => pad.left,
          yScale: (_m: number) => h / 2,
          ariaLabel: "Pitch-Vergleich: Keine Daten vorhanden",
        };
      }

      // Compute data bounds
      const allTimestamps = [
        ...referenzKurve.map((p) => p.timestampMs),
        ...nutzerKurve.map((p) => p.timestampMs),
      ];
      const allMidi = [
        ...referenzKurve.map((p) => p.midiValue),
        ...nutzerKurve.map((p) => p.midiValue),
      ];

      const minT = Math.min(...allTimestamps);
      const maxT = Math.max(...allTimestamps);
      const minM = Math.min(...allMidi);
      const maxM = Math.max(...allMidi);

      const tRange = maxT - minT || 1;
      const mRange = maxM - minM || 1;

      const plotW = w - pad.left - pad.right;
      const plotH = h - pad.top - pad.bottom;

      const xs = (t: number) => pad.left + ((t - minT) / tRange) * plotW;
      // Invert Y so higher MIDI values are at the top
      const ys = (m: number) =>
        pad.top + plotH - ((m - minM) / mRange) * plotH;

      // Compute category percentages for aria-label
      let gut = 0;
      let akzeptabel = 0;
      let fehlerhaft = 0;

      for (const p of nutzerKurve) {
        const abs = Math.abs(p.abweichungCents);
        if (abs < 50) gut++;
        else if (abs <= 100) akzeptabel++;
        else fehlerhaft++;
      }

      const total = nutzerKurve.length || 1;
      const gutPct = Math.round((gut / total) * 100);
      const akzPct = Math.round((akzeptabel / total) * 100);
      const fehlPct = Math.round((fehlerhaft / total) * 100);

      const label = `Pitch-Vergleich: ${gutPct}% gut, ${akzPct}% akzeptabel, ${fehlPct}% fehlerhaft`;

      return {
        svgWidth: w,
        svgHeight: h,
        padding: pad,
        xScale: xs,
        yScale: ys,
        ariaLabel: label,
      };
    }, [referenzKurve, nutzerKurve]);

  // Build reference polyline points string
  const referenzPoints = useMemo(
    () =>
      referenzKurve
        .map((p) => `${xScale(p.timestampMs)},${yScale(p.midiValue)}`)
        .join(" "),
    [referenzKurve, xScale, yScale]
  );

  // Build colored line segments for user curve
  const nutzerSegments = useMemo(() => {
    if (nutzerKurve.length < 2) return [];
    const segs: { x1: number; y1: number; x2: number; y2: number; color: string }[] = [];
    for (let i = 0; i < nutzerKurve.length - 1; i++) {
      const curr = nutzerKurve[i];
      const next = nutzerKurve[i + 1];
      segs.push({
        x1: xScale(curr.timestampMs),
        y1: yScale(curr.midiValue),
        x2: xScale(next.timestampMs),
        y2: yScale(next.midiValue),
        color: abweichungFarbe(curr.abweichungCents),
      });
    }
    return segs;
  }, [nutzerKurve, xScale, yScale]);

  const isEmpty = referenzKurve.length === 0 && nutzerKurve.length === 0;

  return (
    <div className="w-full overflow-x-auto rounded-lg border border-neutral-200 bg-white p-2">
      <svg
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        role="img"
        aria-label={ariaLabel}
      >
        {isEmpty ? (
          <text
            x={svgWidth / 2}
            y={svgHeight / 2}
            textAnchor="middle"
            className="fill-neutral-400 text-sm"
          >
            Keine Daten vorhanden
          </text>
        ) : (
          <>
            {/* Reference curve */}
            {referenzKurve.length >= 2 && (
              <polyline
                points={referenzPoints}
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {/* User curve – color-coded segments */}
            {nutzerSegments.map((seg, i) => (
              <line
                key={i}
                x1={seg.x1}
                y1={seg.y1}
                x2={seg.x2}
                y2={seg.y2}
                stroke={seg.color}
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            ))}
          </>
        )}
      </svg>
    </div>
  );
}
