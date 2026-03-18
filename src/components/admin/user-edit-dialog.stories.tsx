import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import UserEditDialog from "./user-edit-dialog";

const meta: Meta<typeof UserEditDialog> = {
  title: "Admin/UserEditDialog",
  component: UserEditDialog,
  tags: ["autodocs"],
  args: { onClose: fn(), onUpdated: fn() },
};
export default meta;

type Story = StoryObj<typeof UserEditDialog>;

export const Open: Story = {
  args: {
    open: true,
    user: {
      id: "1",
      email: "user@example.com",
      name: "Max Mustermann",
      role: "USER",
      accountStatus: "ACTIVE",
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01",
    },
  },
};
