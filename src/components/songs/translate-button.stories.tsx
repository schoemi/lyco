import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import TranslateButton from "./translate-button";

const meta: Meta<typeof TranslateButton> = {
  title: "Songs/TranslateButton",
  component: TranslateButton,
  tags: ["autodocs"],
  args: { onClick: fn() },
};
export default meta;

type Story = StoryObj<typeof TranslateButton>;

export const Default: Story = { args: { translating: false } };
export const Translating: Story = { args: { translating: true } };
