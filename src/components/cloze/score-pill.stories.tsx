import type { Meta, StoryObj } from "@storybook/react";
import { ScorePill } from "./score-pill";

const meta: Meta<typeof ScorePill> = {
  title: "Cloze/ScorePill",
  component: ScorePill,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ScorePill>;

export const Default: Story = { args: { correct: 7, total: 10 } };
export const Perfect: Story = { args: { correct: 10, total: 10 } };
export const Zero: Story = { args: { correct: 0, total: 10 } };
