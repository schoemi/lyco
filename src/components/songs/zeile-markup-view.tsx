"use client";

import { useMemo } from "react";
import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";
import { AppIcon } from "@/components/ui/iconify-icon";
import { faClassToIconify, UNKNOWN_TAG_ICON } from "@/lib/icon-utils";

/**
 * ZeileMarkupView – Renders a single zeile text with ChordPro vocal tag badges inline.
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
  const icon = faClassToIconify(def?.icon ?? UNKNOWN_TAG_ICON);
  const color = def?.color ?? "#9ca3af";
  const label = def?.label ?? node.tag;
  const zusatztext = node.zusatztext;

  if (node.type === "chordpro-range") {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 mx-0.5"
        style={{ backgroundColor: `${color}20`, borderBottom: `2px solid ${color}` }}
        aria-label={zusatztext ? `${label}: ${zusatztext}` : label}
        title={zusatztext ? `${label}: ${zusatztext}` : label}
      >
        <AppIcon icon={icon} color={color} style={{ fontSize: "0.7em" }} />
        <span>{node.rangeText}</span>
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 text-xs font-medium mx-0.5"
      style={{ backgroundColor: `${color}15`, color }}
      aria-label={zusatztext ? `${label}: ${zusatztext}` : label}
      title={zusatztext ? `${label}: ${zusatztext}` : label}
    >
      <AppIcon icon={icon} />
      {zusatztext && <span className="ml-0.5">{zusatztext}</span>}
    </span>
  );
}
