"use client";

import { parseChordPro } from "@/lib/vocal-tag/chordpro-parser";
import type { TagDefinitionData, ChordProNode } from "@/types/vocal-tag";

/**
 * DetailView – Read-only detail rendering of a song text with vocal tags.
 *
 * - Renders song text with increased line spacing for annotation layer
 * - Shows tag icon above word start, zusatztext in smaller font next to icon in tag color
 * - Annotation layer above text (dedicated inline layer, does not interrupt text flow)
 * - No ChordPro raw syntax shown
 * - Generic warning icon and gray text for unknown tags
 *
 * Validates: Requirements 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

export interface DetailViewProps {
  /** Raw song text potentially containing ChordPro tags */
  text: string;
  /** Available tag definitions for resolving icons, colors, and labels */
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
  const icon = definition?.icon ?? "fa-solid fa-circle-question";
  const color = definition?.color ?? "#9ca3af";
  const label = definition?.label ?? node.tag;
  const zusatztext = node.zusatztext ?? "";

  // Range tag: annotation above + highlighted text span
  if (node.type === "chordpro-range") {
    return (
      <span
        className="detail-range-marker relative inline-flex flex-col items-start"
        style={{ verticalAlign: "top" }}
      >
        <span
          className="detail-tag-annotation absolute flex items-center gap-0.5 whitespace-nowrap"
          style={{
            color,
            top: "-1.4em",
            left: 0,
            pointerEvents: "none",
          }}
          aria-label={zusatztext ? `${label}: ${zusatztext}` : label}
        >
          <i
            className={`${icon} text-[0.65rem] leading-none`}
            aria-hidden="true"
            role="img"
          />
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

  // Inline tag: icon + zusatztext annotation above the inline position
  return (
    <span
      className="detail-tag-marker relative inline-flex flex-col items-start"
      style={{ verticalAlign: "top" }}
    >
      <span
        className="detail-tag-annotation absolute flex items-center gap-0.5 whitespace-nowrap"
        style={{
          color,
          top: "-1.4em",
          left: 0,
          pointerEvents: "none",
        }}
        aria-label={zusatztext ? `${label}: ${zusatztext}` : label}
      >
        <i
          className={`${icon} text-[0.65rem] leading-none`}
          aria-hidden="true"
          role="img"
        />
        {zusatztext && (
          <span className="detail-tag-zusatztext text-[0.55rem] leading-none">
            {zusatztext}
          </span>
        )}
      </span>
    </span>
  );
}
