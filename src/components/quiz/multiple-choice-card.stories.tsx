import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { MultipleChoiceCard } from "./multiple-choice-card";

const meta: Meta<typeof MultipleChoiceCard> = {
  title: "Quiz/MultipleChoiceCard",
  component: MultipleChoiceCard,
  tags: ["autodocs"],
  args: { onAnswer: fn(), onWeiter: fn() },
};
export default meta;

type Story = StoryObj<typeof MultipleChoiceCard>;

export const Default: Story = {
  args: {
    question: {
      id: "q1",
      stropheId: "s1",
      zeileId: "z1",
      prompt: "Don't wanna be an American ___",
      options: ["idiot", "hero", "dream", "story"],
      correctIndex: 0,
    },
  },
};

export const MitKontext: Story = {
  args: {
    question: {
      id: "q2",
      stropheId: "s1",
      zeileId: "z2",
      prompt: "Welcome to a new kind of ___",
      options: ["tension", "fashion", "passion", "session"],
      correctIndex: 0,
      contextHint: "Strophe 1, nach: Don't wanna be an American idiot",
    },
  },
};
