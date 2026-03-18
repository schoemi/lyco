import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { GapInput } from "./gap-input";

const meta: Meta<typeof GapInput> = {
  title: "Cloze/GapInput",
  component: GapInput,
  tags: ["autodocs"],
  args: {
    onChange: fn(),
    onBlur: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof GapInput>;

export const Empty: Story = {
  args: {
    gapId: "g1",
    targetWord: "hello",
    value: "",
    feedback: null,
    hintActive: false,
    ariaLabel: "Lücke 1 von 3",
  },
};

export const Correct: Story = {
  args: {
    gapId: "g1",
    targetWord: "hello",
    value: "hello",
    feedback: "correct",
    hintActive: false,
    ariaLabel: "Lücke 1 von 3",
  },
};

export const Incorrect: Story = {
  args: {
    gapId: "g1",
    targetWord: "hello",
    value: "helo",
    feedback: "incorrect",
    hintActive: false,
    ariaLabel: "Lücke 1 von 3",
  },
};

export const WithHint: Story = {
  args: {
    gapId: "g1",
    targetWord: "hello",
    value: "",
    feedback: null,
    hintActive: true,
    ariaLabel: "Lücke 1 von 3",
  },
};
