import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { PlayPauseButton } from "./play-pause-button";

const meta: Meta<typeof PlayPauseButton> = {
  title: "Karaoke/PlayPauseButton",
  component: PlayPauseButton,
  tags: ["autodocs"],
  args: { onToggle: fn() },
  parameters: {
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1e1b4b" }] },
  },
};
export default meta;

type Story = StoryObj<typeof PlayPauseButton>;

export const Playing: Story = { args: { isPlaying: true } };
export const Paused: Story = { args: { isPlaying: false } };

export const TogglePlay: Story = {
  args: { isPlaying: false },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(args.onToggle).toHaveBeenCalledOnce();
  },
};
