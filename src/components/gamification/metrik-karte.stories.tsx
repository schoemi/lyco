import type { Meta, StoryObj } from "@storybook/react";
import { MetrikKarte } from "./metrik-karte";

const meta: Meta<typeof MetrikKarte> = {
  title: "Gamification/MetrikKarte",
  component: MetrikKarte,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof MetrikKarte>;

export const OhneBalken: Story = {
  args: { label: "Sessions", value: 42 },
};

export const MitBalken: Story = {
  args: { label: "Fortschritt", value: "65%", fortschrittsbalken: 65 },
};

export const VollerBalken: Story = {
  args: { label: "Abgeschlossen", value: "100%", fortschrittsbalken: 100 },
};
