import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { ErklaerungTooltip } from "./erklaerung-tooltip";

const meta: Meta<typeof ErklaerungTooltip> = {
  title: "Rueckwaerts/ErklaerungTooltip",
  component: ErklaerungTooltip,
  tags: ["autodocs"],
  args: { onClose: fn() },
};
export default meta;

type Story = StoryObj<typeof ErklaerungTooltip>;

export const Sichtbar: Story = { args: { visible: true } };
export const Versteckt: Story = { args: { visible: false } };
