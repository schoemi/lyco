import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { PdfUploader } from "./pdf-uploader";

const meta: Meta<typeof PdfUploader> = {
  title: "Import/PdfUploader",
  component: PdfUploader,
  tags: ["autodocs"],
  args: { onResult: fn(), onError: fn() },
};
export default meta;

type Story = StoryObj<typeof PdfUploader>;

export const Default: Story = {};
