import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ImportTabs } from "./import-tabs";

const meta: Meta<typeof ImportTabs> = {
  title: "Import/ImportTabs",
  component: ImportTabs,
  tags: ["autodocs"],
  args: { onChange: fn() },
};
export default meta;

type Story = StoryObj<typeof ImportTabs>;

export const Manuell: Story = { args: { active: "manuell" } };
export const Text: Story = { args: { active: "text" } };
export const Pdf: Story = { args: { active: "pdf" } };
export const Genius: Story = { args: { active: "genius" } };
