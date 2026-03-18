import type { Meta, StoryObj } from "@storybook/react";
import { QuizNavbar } from "./quiz-navbar";

const meta: Meta<typeof QuizNavbar> = {
  title: "Quiz/QuizNavbar",
  component: QuizNavbar,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof QuizNavbar>;

export const Default: Story = {
  args: { songId: "song-1", songTitle: "American Idiot" },
};
