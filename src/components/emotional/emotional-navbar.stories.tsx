import type { Meta, StoryObj } from "@storybook/react";
import { EmotionalNavbar } from "./emotional-navbar";

const meta: Meta<typeof EmotionalNavbar> = {
  title: "Emotional/EmotionalNavbar",
  component: EmotionalNavbar,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof EmotionalNavbar>;

export const Default: Story = {
  args: { songId: "song-1", songTitle: "American Idiot" },
};
