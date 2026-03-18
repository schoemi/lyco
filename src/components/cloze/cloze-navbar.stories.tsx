import type { Meta, StoryObj } from "@storybook/react";
import { ClozeNavbar } from "./cloze-navbar";

const meta: Meta<typeof ClozeNavbar> = {
  title: "Cloze/ClozeNavbar",
  component: ClozeNavbar,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof ClozeNavbar>;

export const Default: Story = {
  args: { songId: "song-1", songTitle: "American Idiot" },
};
