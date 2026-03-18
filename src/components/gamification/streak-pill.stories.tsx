import type { Meta, StoryObj } from "@storybook/react";
import { StreakPill } from "./streak-pill";

const meta: Meta<typeof StreakPill> = {
  title: "Gamification/StreakPill",
  component: StreakPill,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof StreakPill>;

export const EinTag: Story = { args: { streak: 1 } };
export const MehrereTage: Story = { args: { streak: 7 } };
export const Null: Story = { args: { streak: 0 } };
