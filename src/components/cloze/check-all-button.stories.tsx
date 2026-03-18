import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { CheckAllButton } from "./check-all-button";

const meta: Meta<typeof CheckAllButton> = {
  title: "Cloze/CheckAllButton",
  component: CheckAllButton,
  tags: ["autodocs"],
  args: { onClick: fn() },
};
export default meta;

type Story = StoryObj<typeof CheckAllButton>;

export const Enabled: Story = { args: { disabled: false } };
export const Disabled: Story = { args: { disabled: true } };
