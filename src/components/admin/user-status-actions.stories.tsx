import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import UserStatusActions from "./user-status-actions";

const meta: Meta<typeof UserStatusActions> = {
  title: "Admin/UserStatusActions",
  component: UserStatusActions,
  tags: ["autodocs"],
  args: { onStatusChanged: fn() },
};
export default meta;

type Story = StoryObj<typeof UserStatusActions>;

export const Active: Story = {
  args: {
    userId: "1",
    userName: "Max Mustermann",
    accountStatus: "ACTIVE",
    currentUserId: "other",
  },
};

export const Suspended: Story = {
  args: {
    userId: "1",
    userName: "Max Mustermann",
    accountStatus: "SUSPENDED",
    currentUserId: "other",
  },
};

export const Pending: Story = {
  args: {
    userId: "1",
    userName: "Max Mustermann",
    accountStatus: "PENDING",
    currentUserId: "other",
  },
};

export const SelfActive: Story = {
  args: {
    userId: "1",
    userName: "Admin",
    accountStatus: "ACTIVE",
    currentUserId: "1",
  },
};
