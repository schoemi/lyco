import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { NavigationsButtons } from "./navigations-buttons";

const meta: Meta<typeof NavigationsButtons> = {
  title: "Karaoke/NavigationsButtons",
  component: NavigationsButtons,
  tags: ["autodocs"],
  args: { onNext: fn(), onPrev: fn() },
  parameters: {
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1e1b4b" }] },
  },
};
export default meta;

type Story = StoryObj<typeof NavigationsButtons>;

export const Mitte: Story = { args: { isFirstLine: false, isLastLine: false } };
export const ErsteZeile: Story = { args: { isFirstLine: true, isLastLine: false } };
export const LetzteZeile: Story = { args: { isFirstLine: false, isLastLine: true } };
