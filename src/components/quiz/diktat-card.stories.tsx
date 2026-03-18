import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { DiktatCard } from "./diktat-card";

const meta: Meta<typeof DiktatCard> = {
  title: "Quiz/DiktatCard",
  component: DiktatCard,
  tags: ["autodocs"],
  args: { onSubmit: fn(), onWeiter: fn() },
};
export default meta;

type Story = StoryObj<typeof DiktatCard>;

export const Default: Story = {
  args: {
    question: {
      id: "d1",
      stropheId: "s1",
      stropheName: "Strophe 1",
      zeileId: "z1",
      originalText: "Don't wanna be an American idiot",
    },
  },
};
