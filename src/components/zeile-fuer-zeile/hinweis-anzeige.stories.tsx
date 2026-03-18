import type { Meta, StoryObj } from "@storybook/react";
import { HinweisAnzeige } from "./hinweis-anzeige";

const meta: Meta<typeof HinweisAnzeige> = {
  title: "ZeileFuerZeile/HinweisAnzeige",
  component: HinweisAnzeige,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof HinweisAnzeige>;

export const MitHinweis: Story = {
  args: { hinweis: "D___ w____ b_ a_ A_______ i____" },
};

export const OhneHinweis: Story = {
  args: { hinweis: "" },
};
