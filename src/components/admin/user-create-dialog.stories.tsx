import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import UserCreateDialog from "./user-create-dialog";

const meta: Meta<typeof UserCreateDialog> = {
  title: "Admin/UserCreateDialog",
  component: UserCreateDialog,
  tags: ["autodocs"],
  args: { onClose: fn(), onCreated: fn() },
};
export default meta;

type Story = StoryObj<typeof UserCreateDialog>;

export const Open: Story = { args: { open: true } };
export const Closed: Story = { args: { open: false } };
