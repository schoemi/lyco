"use client";

interface RememberMeCheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
}

export function RememberMeCheckbox({ checked, onChange }: RememberMeCheckboxProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-neutral-300 text-newsong-600 focus:ring-2 focus:ring-newsong-500"
        aria-label="Angemeldet bleiben"
      />
      <span className="text-sm text-neutral-700">Angemeldet bleiben</span>
    </label>
  );
}
