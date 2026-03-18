interface ProgressBarProps {
  value: number;
  className?: string;
}

export function ProgressBar({ value, className = "" }: ProgressBarProps) {
  const clamped = Math.min(100, Math.max(0, value));

  return (
    <div
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      className={`h-1 w-full overflow-hidden rounded-full bg-neutral-200 ${className}`}
    >
      <div
        className="h-full rounded-full bg-success-500 transition-all"
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
