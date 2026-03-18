import type { Meta, StoryObj } from "@storybook/react";
import StatusBadge from "./status-badge";

const meta: Meta<typeof StatusBadge> = {
  title: "Admin/StatusBadge",
  component: StatusBadge,
  tags: ["autodocs"],
};
export default meta;

type Story = StoryObj<typeof StatusBadge>;

export const Aktiv: Story = { args: { status: "ACTIVE" } };
export const Gesperrt: Story = { args: { status: "SUSPENDED" } };
export const Ausstehend: Story = { args: { status: "PENDING" } };
