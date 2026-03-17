"use client";

export interface MetrikKarteProps {
  label: string;
  value: string | number;
  fortschrittsbalken?: number;
}

export function MetrikKarte({ label, value, fortschrittsbalken }: MetrikKarteProps) {
  const clampedProgress =
    fortschrittsbalken != null
      ? Math.max(0, Math.min(100, fortschrittsbalken))
      : undefined;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
      {clampedProgress != null && (
        <div
          className="mt-2 h-2 w-full rounded-full bg-gray-200"
          role="progressbar"
          aria-valuenow={clampedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${label}: ${clampedProgress}%`}
        >
          <div
            className="h-2 rounded-full bg-blue-500 transition-all"
            style={{ width: `${clampedProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
