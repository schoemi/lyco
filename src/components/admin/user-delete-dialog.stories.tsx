import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import UserDeleteDialog from "./user-delete-dialog";

const meta: Meta<typeof UserDeleteDialog> = {
  title: "Admin/UserDeleteDialog",
  component: UserDeleteDialog,
  tags: ["autodocs"],
  args: { onClose: fn(), onDeleted: fn() },
};
export default meta;

type Story = StoryObj<typeof UserDeleteDialog>;

export const Open: Story = {
  args: {
    open: true,
    currentUserId: "other-user",
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

export const SelfDelete: Story = {
  args: {
    open: true,
    currentUserId: "1",
    user: {
      id: "1",
      email: "admin@example.com",
      name: "Admin",
      role: "ADMIN",
      accountStatus: "ACTIVE",
      createdAt: "2025-01-01",
      updatedAt: "2025-01-01",
    },
  },
};
