import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
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
