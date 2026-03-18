import type { Meta, StoryObj } from "@storybook/react";
import { SongInfo } from "./song-info";

const meta: Meta<typeof SongInfo> = {
  title: "Karaoke/SongInfo",
  component: SongInfo,
  tags: ["autodocs"],
  parameters: {
    backgrounds: { default: "dark", values: [{ name: "dark", value: "#1e1b4b" }] },
  },
};
export default meta;

type Story = StoryObj<typeof SongInfo>;

export const MitKuenstler: Story = {
  args: { titel: "American Idiot", kuenstler: "Green Day" },
};

export const OhneKuenstler: Story = {
  args: { titel: "American Idiot", kuenstler: null },
};

export const Compact: Story = {
  args: { titel: "American Idiot", kuenstler: "Green Day", compact: true },
};
