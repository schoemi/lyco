import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import PasswordResetDialog from "./password-reset-dialog";

const meta: Meta<typeof PasswordResetDialog> = {
  title: "Admin/PasswordResetDialog",
  component: PasswordResetDialog,
  tags: ["autodocs"],
  args: { onClose: fn() },
};
export default meta;

type Story = StoryObj<typeof PasswordResetDialog>;

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
