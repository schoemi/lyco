import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import TranslationToggle from "./translation-toggle";

const meta: Meta<typeof TranslationToggle> = {
  title: "Songs/TranslationToggle",
  component: TranslationToggle,
  tags: ["autodocs"],
  args: { onChange: fn() },
};
export default meta;

type Story = StoryObj<typeof TranslationToggle>;

export const Aus: Story = { args: { checked: false } };
export const An: Story = { args: { checked: true } };
