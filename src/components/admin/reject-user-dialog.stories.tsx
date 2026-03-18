import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import RejectUserDialog from "./reject-user-dialog";

const meta: Meta<typeof RejectUserDialog> = {
  title: "Admin/RejectUserDialog",
  component: RejectUserDialog,
  tags: ["autodocs"],
  args: {
    onConfirm: fn(),
    onCancel: fn(),
  },
};
export default meta;

type Story = StoryObj<typeof RejectUserDialog>;

export const Open: Story = {
  args: { open: true, userName: "Max Mustermann" },
};

export const Closed: Story = {
  args: { open: false, userName: null },
};
