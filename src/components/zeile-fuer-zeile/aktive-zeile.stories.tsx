import type { Meta, StoryObj } from "@storybook/react";
import { AktiveZeile } from "./aktive-zeile";

const meta: Meta<typeof AktiveZeile> = {
  title: "ZeileFuerZeile/AktiveZeile",
  component: AktiveZeile,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof AktiveZeile>;

export const Sichtbar: Story = {
  args: { text: "Don't wanna be an American idiot", visible: true },
};

export const Versteckt: Story = {
  args: { text: "Don't wanna be an American idiot", visible: false },
};
