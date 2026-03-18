import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { SchwierigkeitsAuswahl } from "./schwierigkeits-auswahl";

const meta: Meta<typeof SchwierigkeitsAuswahl> = {
  title: "ZeileFuerZeile/SchwierigkeitsAuswahl",
  component: SchwierigkeitsAuswahl,
  tags: ["autodocs"],
  args: { onChange: fn() },
};
export default meta;

type Story = StoryObj<typeof SchwierigkeitsAuswahl>;

export const SehrLeicht: Story = { args: { value: "sehr-leicht" } };
export const Leichter: Story = { args: { value: "leichter" } };
export const Mittel: Story = { args: { value: "mittel" } };
export const Schwer: Story = { args: { value: "schwer" } };
