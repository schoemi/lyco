import type { Meta, StoryObj } from "@storybook/react";
import { ZeileFuerZeileNavbar } from "./navbar";

const meta: Meta<typeof ZeileFuerZeileNavbar> = {
  title: "ZeileFuerZeile/Navbar",
  component: ZeileFuerZeileNavbar,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ZeileFuerZeileNavbar>;

export const Default: Story = {
  args: { songId: "song-1", songTitle: "American Idiot" },
};

export const MitLabel: Story = {
  args: { songId: "song-1", songTitle: "American Idiot", label: "Rückwärts" },
};
