interface GeteilterSongBadgeProps {
  eigentuemerName: string;
}

export default function GeteilterSongBadge({ eigentuemerName }: GeteilterSongBadgeProps) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-pill-50 px-3 py-1 text-xs font-medium text-pill-700"
      role="status"
    >
      Geteilt von {eigentuemerName}
    </span>
  );
}
