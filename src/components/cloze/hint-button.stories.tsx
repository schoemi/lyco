import type { Meta, StoryObj } from "@storybook/react";
import { expect, fn, userEvent, within } from "storybook/test";
import { HintButton } from "./hint-button";

const meta: Meta<typeof HintButton> = {
  title: "Cloze/HintButton",
  component: HintButton,
  tags: ["autodocs"],
  args: { onClick: fn() },
};
export default meta;

type Story = StoryObj<typeof HintButton>;

export const Enabled: Story = { args: { disabled: false } };
export const Disabled: Story = { args: { disabled: true } };

export const ClickEnabled: Story = {
  args: { disabled: false },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button");
    await userEvent.click(button);
    await expect(args.onClick).toHaveBeenCalledOnce();
  },
};
