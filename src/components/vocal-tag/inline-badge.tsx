"use client";

import { useState, useCallback, useEffect } from "react";
import { NodeViewWrapper } from "@tiptap/react";
import type { ReactNodeViewProps } from "@tiptap/react";
import type { TagDefinitionData } from "@/types/vocal-tag";
import { TagPopover } from "@/components/vocal-tag/tag-popover";
import { AppIcon } from "@/components/ui/iconify-icon";
import { faClassToIconify, UNKNOWN_TAG_ICON } from "@/lib/icon-utils";

/**
 * InlineBadge – NodeView component for ChordPro vocal tags.
 *
 * Validates: Requirements 5.2, 5.3, 5.4
 */

export function InlineBadge({ node, updateAttributes, extension }: ReactNodeViewProps) {
  const tag = (node.attrs.tag as string) ?? "";
  const zusatztext = (node.attrs.zusatztext as string) ?? "";
  const unknown = (node.attrs.unknown as boolean) ?? false;

  const tagDefinitions: TagDefinitionData[] = (extension.options as { tagDefinitions?: TagDefinitionData[] }).tagDefinitions ?? [];
  const definition = tagDefinitions.find((d) => d.tag === tag);
  const icon = faClassToIconify(definition?.icon ?? UNKNOWN_TAG_ICON);
  const color = definition?.color ?? "#9ca3af";
  const label = definition?.label ?? tag;

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [currentZusatztext, setCurrentZusatztext] = useState(zusatztext);

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
          <AppIcon icon={icon} />
        </button>

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
