import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { ScoreScreen } from "./score-screen";

const meta: Meta<typeof ScoreScreen> = {
  title: "Quiz/ScoreScreen",
  component: ScoreScreen,
  tags: ["autodocs"],
  args: { onRepeat: fn() },
};
export default meta;

type Story = StoryObj<typeof ScoreScreen>;

export const Gut: Story = {
  args: { correct: 8, total: 10, songId: "song-1" },
};

export const Schlecht: Story = {
  args: { correct: 2, total: 10, songId: "song-1" },
};

export const Perfekt: Story = {
  args: { correct: 10, total: 10, songId: "song-1" },
};

export const ClickRepeat: Story = {
  args: { correct: 8, total: 10, songId: "song-1" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /quiz wiederholen/i });
    await userEvent.click(button);
    await expect(args.onRepeat).toHaveBeenCalledOnce();
  },
};
