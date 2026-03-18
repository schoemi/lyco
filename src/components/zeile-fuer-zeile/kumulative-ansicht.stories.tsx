import type { Meta, StoryObj } from "@storybook/react";
import { KumulativeAnsicht } from "./kumulative-ansicht";

const meta: Meta<typeof KumulativeAnsicht> = {
  title: "ZeileFuerZeile/KumulativeAnsicht",
  component: KumulativeAnsicht,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof KumulativeAnsicht>;

export const MitZeilen: Story = {
  args: {
    zeilen: [
      { id: "z1", text: "Don't wanna be an American idiot" },
      { id: "z2", text: "Don't want a nation under the new media" },
    ],
  },
};

export const Leer: Story = {
  args: { zeilen: [] },
};
