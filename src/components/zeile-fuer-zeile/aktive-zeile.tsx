"use client";

interface AktiveZeileProps {
  text: string;
  visible: boolean;
}

export function AktiveZeile({ text, visible }: AktiveZeileProps) {
  return (
    <div className="border-l-4 border-purple-600 pl-3">
      <p className={`text-lg text-gray-900 ${visible ? "" : "invisible"}`}>
        {text}
      </p>
    </div>
  );
}
