"use client";

interface StrophenTitelProps {
  name: string;
}

export function StrophenTitel({ name }: StrophenTitelProps) {
  return (
    <p className="text-center text-sm text-white/70">{name}</p>
  );
}
