interface HinweisAnzeigeProps {
  hinweis: string;
}

export function HinweisAnzeige({ hinweis }: HinweisAnzeigeProps) {
  return (
    <div
      aria-live="polite"
      aria-label={hinweis ? `Hinweis: ${hinweis}` : undefined}
    >
      {hinweis && <p className="text-gray-400 italic">{hinweis}</p>}
    </div>
  );
}
