import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { EinstellungsDialog } from "./einstellungs-dialog";

const meta: Meta<typeof EinstellungsDialog> = {
  title: "Karaoke/EinstellungsDialog",
  component: EinstellungsDialog,
  tags: ["autodocs"],
  args: { onClose: fn(), onSpeedChange: fn() },
};
export default meta;

type Story = StoryObj<typeof EinstellungsDialog>;

export const Open: Story = {
  args: { isOpen: true, scrollSpeed: 5 },
};

export const Closed: Story = {
  args: { isOpen: false, scrollSpeed: 5 },
};
