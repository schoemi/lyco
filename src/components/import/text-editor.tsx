"use client";

import { useRef, useCallback } from "react";

interface TextEditorProps {
  value: string;
  onChange: (value: string) => void;
}

const SECTION_RE = /^\[.+\]$/;

export function TextEditor({ value, onChange }: TextEditorProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLTextAreaElement>) => {
      if (overlayRef.current) {
        overlayRef.current.scrollTop = e.currentTarget.scrollTop;
        overlayRef.current.scrollLeft = e.currentTarget.scrollLeft;
      }
    },
    []
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
      e.preventDefault();
      const plain = e.clipboardData.getData("text/plain");
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const next = value.slice(0, start) + plain + value.slice(end);
      onChange(next);
      requestAnimationFrame(() => {
        const pos = start + plain.length;
        textarea.selectionStart = pos;
        textarea.selectionEnd = pos;
      });
    },
    [value, onChange]
  );

  const lines = value.split("\n");

  return (
    <div className="relative min-h-[200px]">
      <div
        ref={overlayRef}
        aria-hidden="true"
        className="absolute inset-0 overflow-hidden whitespace-pre-wrap break-words font-mono text-sm p-3 pointer-events-none"
      >
        {lines.map((line, i) => (
          <div key={i}>
            {SECTION_RE.test(line.trim()) ? (
              <span className="text-primary-600 font-bold">{line}</span>
            ) : (
              <span>{line}</span>
            )}
            {i < lines.length - 1 ? "\n" : ""}
          </div>
        ))}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onScroll={handleScroll}
        onPaste={handlePaste}
        aria-label="Songtext eingeben"
        className="relative w-full min-h-[200px] resize-y bg-transparent text-transparent caret-black font-mono text-sm p-3 border border-neutral-300 rounded-md focus:outline-none focus:ring-2 focus:ring-newsong-500"
        spellCheck={false}
      />
    </div>
  );
}
