import type { Meta, StoryObj } from "@storybook/react";
import { EmotionsTags } from "./emotions-tags";

const meta: Meta<typeof EmotionsTags> = {
  title: "Emotional/EmotionsTags",
  component: EmotionsTags,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof EmotionsTags>;

export const MehrereTags: Story = {
  args: { tags: ["rebellisch", "wütend", "energisch"] },
};

export const EinTag: Story = {
  args: { tags: ["melancholisch"] },
};

export const Leer: Story = {
  args: { tags: [] },
};
