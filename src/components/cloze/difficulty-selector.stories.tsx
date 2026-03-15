import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { DifficultySelector } from "./difficulty-selector";

const meta: Meta<typeof DifficultySelector> = {
  title: "Cloze/DifficultySelector",
  component: DifficultySelector,
  tags: ["autodocs"],
  args: {
    onChange: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof DifficultySelector>;

export const Leicht: Story = { args: { active: "leicht" } };
export const Mittel: Story = { args: { active: "mittel" } };
export const Schwer: Story = { args: { active: "schwer" } };
export const Blind: Story = { args: { active: "blind" } };
