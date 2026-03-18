import type { Meta, StoryObj } from "@storybook/react";
import { FortschrittsDots } from "./fortschritts-dots";

const meta: Meta<typeof FortschrittsDots> = {
  title: "ZeileFuerZeile/FortschrittsDots",
  component: FortschrittsDots,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof FortschrittsDots>;

export const Anfang: Story = {
  args: { totalZeilen: 5, currentIndex: 0, completedIndices: new Set<number>() },
};

export const Mitte: Story = {
  args: { totalZeilen: 5, currentIndex: 2, completedIndices: new Set([0, 1]) },
};

export const Fertig: Story = {
  args: { totalZeilen: 5, currentIndex: 4, completedIndices: new Set([0, 1, 2, 3, 4]) },
};
