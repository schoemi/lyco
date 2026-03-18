import type { Meta, StoryObj } from "@storybook/react";
import { StatusPunkt } from "./status-punkt";

const meta: Meta<typeof StatusPunkt> = {
  title: "Gamification/StatusPunkt",
  component: StatusPunkt,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof StatusPunkt>;

export const Grau: Story = { args: { fortschritt: 0 } };
export const Orange: Story = { args: { fortschritt: 50 } };
export const Gruen: Story = { args: { fortschritt: 100 } };
