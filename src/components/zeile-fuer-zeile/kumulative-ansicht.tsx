"use client";

interface KumulativeAnsichtProps {
  zeilen: Array<{ id: string; text: string }>;
}

export function KumulativeAnsicht({ zeilen }: KumulativeAnsichtProps) {
  if (zeilen.length === 0) {
    return <></>;
  }

  return (
    <div>
      {zeilen.map((zeile) => (
        <p key={zeile.id} className="text-sm text-gray-500">
          {zeile.text}
        </p>
      ))}
    </div>
  );
}
