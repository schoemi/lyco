import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { HintButton } from "./hint-button";

const meta: Meta<typeof HintButton> = {
  title: "Cloze/HintButton",
  component: HintButton,
  tags: ["autodocs"],
  args: { onClick: fn() },
};
export default meta;

type Story = StoryObj<typeof HintButton>;

export const Enabled: Story = { args: { disabled: false } };
export const Disabled: Story = { args: { disabled: true } };
