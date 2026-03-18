import { createRoot, type Root } from "react-dom/client";
import type { SuggestionOptions, SuggestionProps, SuggestionKeyDownProps } from "@tiptap/suggestion";
import type { TagDefinitionData } from "@/types/vocal-tag";
import {
  SuggestionDropdown,
  type SuggestionDropdownRef,
} from "@/components/vocal-tag/suggestion-dropdown";

/**
 * suggestionRenderer – Creates the render callbacks for the TipTap Suggestion plugin.
 *
 * Manages a floating React root that renders the SuggestionDropdown component.
 * Positions the dropdown below the cursor using the clientRect provided by TipTap.
 *
 * @param onTagSelected Optional callback invoked after a tag is selected (e.g. to open TagPopover)
 */
export function suggestionRenderer(
  onTagSelected?: (tag: TagDefinitionData) => void,
): NonNullable<SuggestionOptions<TagDefinitionData, TagDefinitionData>["render"]> {
  return () => {
    let container: HTMLDivElement | null = null;
    let root: Root | null = null;
    let dropdownRef: SuggestionDropdownRef | null = null;
    let selectedTag: TagDefinitionData | null = null;

    return {
      onStart(props: SuggestionProps<TagDefinitionData, TagDefinitionData>) {
        container = document.createElement("div");
        container.style.position = "absolute";
        container.style.zIndex = "9999";
        document.body.appendChild(container);

        root = createRoot(container);
        renderDropdown(props);
        updatePosition(props);
      },

      onUpdate(props: SuggestionProps<TagDefinitionData, TagDefinitionData>) {
        renderDropdown(props);
        updatePosition(props);
      },

      onKeyDown(props: SuggestionKeyDownProps) {
        if (props.event.key === "Escape") {
          cleanup();
          return true;
        }
        return dropdownRef?.onKeyDown({ event: props.event }) ?? false;
      },

      onExit() {
        // If a tag was selected, notify the callback
        if (selectedTag && onTagSelected) {
          const tag = selectedTag;
          selectedTag = null;
          // Defer so the node is inserted before the popover opens
          requestAnimationFrame(() => onTagSelected(tag));
        }
        cleanup();
      },
    };

    function renderDropdown(props: SuggestionProps<TagDefinitionData, TagDefinitionData>) {
      if (!root) return;

      root.render(
        <SuggestionDropdown
          ref={(ref) => {
            dropdownRef = ref;
          }}
          items={props.items}
          command={(item) => {
            selectedTag = item;
            props.command(item);
          }}
        />,
      );
    }

    function updatePosition(props: SuggestionProps<TagDefinitionData, TagDefinitionData>) {
      if (!container || !props.clientRect) return;
      const rect = props.clientRect();
      if (!rect) return;

      container.style.left = `${rect.left + window.scrollX}px`;
      container.style.top = `${rect.bottom + window.scrollY + 4}px`;
      container.style.width = "auto";
      container.style.minWidth = "220px";
    }

    function cleanup() {
      if (root) {
        root.unmount();
        root = null;
      }
      if (container) {
        container.remove();
        container = null;
      }
      dropdownRef = null;
    }
  };
}
