import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { TextEditor } from "./text-editor";

const meta: Meta<typeof TextEditor> = {
  title: "Import/TextEditor",
  component: TextEditor,
  tags: ["autodocs"],
  args: { onChange: fn() },
};
export default meta;

type Story = StoryObj<typeof TextEditor>;

export const Leer: Story = { args: { value: "" } };

export const MitText: Story = {
  args: {
    value: "[Strophe 1]\nDon't wanna be an American idiot\nDon't want a nation under the new media\n\n[Refrain]\nWelcome to a new kind of tension\nAll across the alien nation",
  },
};
