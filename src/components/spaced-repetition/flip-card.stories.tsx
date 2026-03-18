import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { FlipCard } from "./flip-card";

const meta: Meta<typeof FlipCard> = {
  title: "SpacedRepetition/FlipCard",
  component: FlipCard,
  tags: ["autodocs"],
  args: { onFlip: fn() },
};
export default meta;

type Story = StoryObj<typeof FlipCard>;

export const Verdeckt: Story = {
  args: {
    stropheName: "Strophe 1",
    zeilen: [
      { text: "Don't wanna be an American idiot", orderIndex: 0 },
      { text: "Don't want a nation under the new media", orderIndex: 1 },
    ],
    aufgedeckt: false,
  },
};

export const Aufgedeckt: Story = {
  args: {
    stropheName: "Strophe 1",
    zeilen: [
      { text: "Don't wanna be an American idiot", orderIndex: 0 },
      { text: "Don't want a nation under the new media", orderIndex: 1 },
    ],
    aufgedeckt: true,
  },
};
