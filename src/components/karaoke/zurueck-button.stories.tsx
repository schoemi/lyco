import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ZurueckButton } from "./zurueck-button";

const meta: Meta<typeof ZurueckButton> = {
  title: "Karaoke/ZurueckButton",
  component: ZurueckButton,
  tags: ["autodocs"],
  args: { onBack: fn() },
  parameters: {
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1e1b4b" }] },
  },
};
export default meta;

type Story = StoryObj<typeof ZurueckButton>;

export const Default: Story = {};
