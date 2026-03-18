import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { GeniusSearchPanel } from "./genius-search-panel";

const meta: Meta<typeof GeniusSearchPanel> = {
  title: "Import/GeniusSearchPanel",
  component: GeniusSearchPanel,
  tags: ["autodocs"],
  args: { onImportSuccess: fn(), onError: fn() },
};
export default meta;

type Story = StoryObj<typeof GeniusSearchPanel>;

export const Default: Story = {};
