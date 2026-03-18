"use client";

import { useState, useCallback, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { TagPopover } from "@/components/vocal-tag/tag-popover";

/**
 * InlineBadge – NodeView component for ChordPro vocal tags.
 *
 * Renders a colored icon badge inline within the TipTap editor.
 * - Shows the tag icon in the tag's defined color
 * - Displays zusatztext as a native tooltip on hover
 * - Click opens a TagPopover to edit the zusatztext
 *
 * Validates: Requirements 5.2, 5.3, 5.4
 */

export function InlineBadge({ node, updateAttributes, extension }: ReactNodeViewProps) {
  const tag = (node.attrs.tag as string) ?? "";
  const zusatztext = (node.attrs.zusatztext as string) ?? "";
  const unknown = (node.attrs.unknown as boolean) ?? false;

  const tagDefinitions: TagDefinitionData[] = (extension.options as { tagDefinitions?: TagDefinitionData[] }).tagDefinitions ?? [];
  const definition = tagDefinitions.find((d) => d.tag === tag);
  const icon = definition?.icon ?? "fa-solid fa-circle-question";
  const color = definition?.color ?? "#9ca3af";
  const label = definition?.label ?? tag;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [currentZusatztext, setCurrentZusatztext] = useState(zusatztext);

  // Sync local state when the node attribute changes externally
  useEffect(() => {
    if (!popoverOpen) {
      setCurrentZusatztext(zusatztext);
    }
  }, [zusatztext, popoverOpen]);

  const handleBadgeClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentZusatztext(zusatztext);
    setPopoverOpen(true);
  }, [zusatztext]);

  const handleConfirm = useCallback((newZusatztext: string) => {
    updateAttributes({ zusatztext: newZusatztext });
    setPopoverOpen(false);
  }, [updateAttributes]);

  const handleCancel = useCallback(() => {
    setPopoverOpen(false);
  }, []);

  const ariaLabel = zusatztext ? `${label}: ${zusatztext}` : label;

  return (
    <NodeViewWrapper as="span" className="chordpro-tag inline" data-chordpro-tag={tag}>
      <span className="relative inline-flex items-center">
        {/* Badge button */}
        <button
          type="button"
          onClick={handleBadgeClick}
          title={zusatztext || undefined}
          aria-label={ariaLabel}
          className={`
            inline-flex items-center justify-center
            rounded px-1 py-0.5 text-xs font-medium
            cursor-pointer select-none
            border border-current/20
            hover:opacity-80 transition-opacity
            ${unknown ? "opacity-60" : ""}
          `}
          style={{ color, backgroundColor: `${color}1a` }}
        >
          <i className={icon} aria-hidden="true" />
        </button>

        {/* Popover for editing zusatztext */}
        {popoverOpen && (
          <TagPopover
            label={label}
            color={color}
            initialValue={currentZusatztext}
            onConfirm={handleConfirm}
            onCancel={handleCancel}
          />
        )}
      </span>
    </NodeViewWrapper>
  );
}
