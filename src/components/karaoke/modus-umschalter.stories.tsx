import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ModusUmschalter } from "./modus-umschalter";

const meta: Meta<typeof ModusUmschalter> = {
  title: "Karaoke/ModusUmschalter",
  component: ModusUmschalter,
  tags: ["autodocs"],
  args: { onChange: fn() },
  parameters: {
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1e1b4b" }] },
  },
};
export default meta;

type Story = StoryObj<typeof ModusUmschalter>;

export const Einzelzeile: Story = { args: { activeMode: "einzelzeile" } };
export const Strophe: Story = { args: { activeMode: "strophe" } };
export const Song: Story = { args: { activeMode: "song" } };
