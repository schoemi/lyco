import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { QuizTypAuswahl } from "./quiz-typ-auswahl";

const meta: Meta<typeof QuizTypAuswahl> = {
  title: "Quiz/QuizTypAuswahl",
  component: QuizTypAuswahl,
  tags: ["autodocs"],
  args: { onSelect: fn() },
};
export default meta;

type Story = StoryObj<typeof QuizTypAuswahl>;

export const Default: Story = {};
