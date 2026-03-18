import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ModeTabs } from "./mode-tabs";

const meta: Meta<typeof ModeTabs> = {
  title: "Emotional/ModeTabs",
  component: ModeTabs,
  tags: ["autodocs"],
  args: { onTabChange: fn() },
};
export default meta;

type Story = StoryObj<typeof ModeTabs>;

export const Uebersetzung: Story = { args: { activeTab: "Übersetzung" } };
export const Interpretation: Story = { args: { activeTab: "Interpretation" } };
export const Notizen: Story = { args: { activeTab: "Meine Notizen" } };
