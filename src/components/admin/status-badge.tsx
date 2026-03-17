import type { AccountStatus } from "../../types/auth";

interface StatusBadgeProps {
  status: AccountStatus;
}

const statusConfig: Record<AccountStatus, { label: string; className: string }> = {
  ACTIVE: { label: "Aktiv", className: "bg-green-100 text-green-800" },
  SUSPENDED: { label: "Gesperrt", className: "bg-red-100 text-red-800" },
  PENDING: { label: "Ausstehend", className: "bg-yellow-100 text-yellow-800" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const { label, className } = statusConfig[status];

  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
