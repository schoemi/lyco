import type { Meta, StoryObj } from "@storybook/react";
import { ProgressBar } from "./progress-bar";

const meta: Meta<typeof ProgressBar> = {
  title: "Songs/ProgressBar",
  component: ProgressBar,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ProgressBar>;

export const Empty: Story = { args: { value: 0 } };
export const Half: Story = { args: { value: 50 } };
export const Full: Story = { args: { value: 100 } };
export const Overflow: Story = { args: { value: 150 } };
