import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ReihenfolgeCard } from "./reihenfolge-card";

const meta: Meta<typeof ReihenfolgeCard> = {
  title: "Quiz/ReihenfolgeCard",
  component: ReihenfolgeCard,
  tags: ["autodocs"],
  args: { onSubmit: fn(), onWeiter: fn() },
};
export default meta;

type Story = StoryObj<typeof ReihenfolgeCard>;

export const Default: Story = {
  args: {
    question: {
      id: "r1",
      stropheId: "s1",
      stropheName: "Strophe 1",
      shuffledZeilen: [
        { zeileId: "z3", text: "Where everything isn't meant to be okay" },
        { zeileId: "z1", text: "Don't wanna be an American idiot" },
        { zeileId: "z2", text: "Welcome to a new kind of tension" },
      ],
      correctOrder: ["z1", "z2", "z3"],
    },
  },
};
