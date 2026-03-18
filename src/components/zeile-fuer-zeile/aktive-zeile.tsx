"use client";

interface AktiveZeileProps {
  text: string;
  visible: boolean;
}

export function AktiveZeile({ text, visible }: AktiveZeileProps) {
  return (
    <div className="border-l-4 border-primary-600 pl-3">
      <p className={`text-lg text-neutral-900 ${visible ? "" : "invisible"}`}>
        {text}
      </p>
    </div>
  );
}
