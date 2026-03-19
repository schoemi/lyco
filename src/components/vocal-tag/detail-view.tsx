"use client";

import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";
import { AppIcon } from "@/components/ui/iconify-icon";
import { faClassToIconify, UNKNOWN_TAG_ICON } from "@/lib/icon-utils";

/**
 * DetailView – Read-only detail rendering of a song text with vocal tags.
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

export interface DetailViewProps {
  text: string;
  tagDefinitions: TagDefinitionData[];
}

export function DetailView({ text, tagDefinitions }: DetailViewProps) {
  const knownTags = tagDefinitions.map((d) => d.tag);
  const { nodes } = parseChordPro(text, knownTags);

  return (
    <div
      className="detail-view"
      style={{ lineHeight: "2.8" }}
      role="article"
      aria-label="Detail-Ansicht"
    >
      {nodes.map((node, index) => (
        <DetailNode key={index} node={node} tagDefinitions={tagDefinitions} />
      ))}
    </div>
  );
}

function DetailNode({
  node,
  tagDefinitions,
}: {
  node: ChordProNode;
  tagDefinitions: TagDefinitionData[];
}) {
  if (node.type === "text") {
    return <span>{node.content}</span>;
  }

  const definition = tagDefinitions.find((d) => d.tag === node.tag);
  const icon = faClassToIconify(definition?.icon ?? UNKNOWN_TAG_ICON);
  const color = definition?.color ?? "#9ca3af";
  const label = definition?.label ?? node.tag;
  const zusatztext = node.zusatztext ?? "";

  if (node.type === "chordpro-range") {
    return (
      <span
        className="detail-range-marker relative inline-flex flex-col items-start"
        style={{ verticalAlign: "top" }}
      >
        <span
          className="detail-tag-annotation absolute flex items-center gap-0.5 whitespace-nowrap"
          style={{ color, top: "-1.4em", left: 0, pointerEvents: "none" }}
          aria-label={zusatztext ? `${label}: ${zusatztext}` : label}
        >
          <AppIcon icon={icon} className="text-[0.65rem] leading-none" />
          {zusatztext && (
            <span className="detail-tag-zusatztext text-[0.55rem] leading-none">
              {zusatztext}
            </span>
          )}
        </span>
        <span
          style={{
            backgroundColor: `${color}20`,
            borderBottom: `2px solid ${color}`,
            borderRadius: "2px",
            padding: "0 2px",
          }}
        >
          {node.rangeText}
        </span>
      </span>
    );
  }

  return (
    <span
      className="detail-tag-marker relative inline-flex flex-col items-start"
      style={{ verticalAlign: "top" }}
    >
      <span
        className="detail-tag-annotation absolute flex items-center gap-0.5 whitespace-nowrap"
        style={{ color, top: "-1.4em", left: 0, pointerEvents: "none" }}
        aria-label={zusatztext ? `${label}: ${zusatztext}` : label}
      >
        <AppIcon icon={icon} className="text-[0.65rem] leading-none" />
        {zusatztext && (
          <span className="detail-tag-zusatztext text-[0.55rem] leading-none">
            {zusatztext}
          </span>
        )}
      </span>
    </span>
  );
}
