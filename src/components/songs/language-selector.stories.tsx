import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import LanguageSelector from "./language-selector";

const meta: Meta<typeof LanguageSelector> = {
  title: "Songs/LanguageSelector",
  component: LanguageSelector,
  tags: ["autodocs"],
  args: { onChange: fn() },
};
export default meta;

type Story = StoryObj<typeof LanguageSelector>;

export const Deutsch: Story = { args: { value: "Deutsch" } };
export const Englisch: Story = { args: { value: "Englisch" } };
export const Disabled: Story = { args: { value: "Deutsch", disabled: true } };
