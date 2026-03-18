import type { Meta, StoryObj } from "@storybook/react";
import { StrophenTitel } from "./strophen-titel";

const meta: Meta<typeof StrophenTitel> = {
  title: "Karaoke/StrophenTitel",
  component: StrophenTitel,
  tags: ["autodocs"],
  parameters: {
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1e1b4b" }] },
  },
};
export default meta;

type Story = StoryObj<typeof StrophenTitel>;

export const Default: Story = { args: { name: "Strophe 1" } };
export const Refrain: Story = { args: { name: "Refrain" } };
