"use client";

import { useMemo } from "react";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";

/**
 * ZeileMarkupView – Renders a single zeile text with ChordPro vocal tag badges inline.
 * Strips the raw ChordPro syntax and shows colored icons at tag positions.
 */

export interface ZeileMarkupViewProps {
  text: string;
  tagDefinitions: TagDefinitionData[];
}

export function ZeileMarkupView({ text, tagDefinitions }: ZeileMarkupViewProps) {
  const knownTags = useMemo(() => tagDefinitions.map((d) => d.tag), [tagDefinitions]);
  const { nodes } = useMemo(() => parseChordPro(text, knownTags), [text, knownTags]);

  return (
    <span className="leading-relaxed">
      {nodes.map((node, i) => (
        <MarkupNode key={i} node={node} tagDefinitions={tagDefinitions} />
      ))}
    </span>
  );
}

function MarkupNode({ node, tagDefinitions }: { node: ChordProNode; tagDefinitions: TagDefinitionData[] }) {
  if (node.type === "text") {
    return <span>{node.content}</span>;
  }

  const def = tagDefinitions.find((d) => d.tag === node.tag);
  const icon = def?.icon ?? "fa-solid fa-circle-question";
  const color = def?.color ?? "#9ca3af";
  const label = def?.label ?? node.tag;
  const zusatztext = node.zusatztext;

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs font-medium mx-0.5"
      style={{ backgroundColor: `${color}15`, color }}
      aria-label={zusatztext ? `${label}: ${zusatztext}` : label}
      title={zusatztext ? `${label}: ${zusatztext}` : label}
    >
      <i className={icon} aria-hidden="true" />
      {zusatztext && <span className="ml-0.5">{zusatztext}</span>}
    </span>
  );
}
