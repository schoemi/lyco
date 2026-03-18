import type { Meta, StoryObj } from "@storybook/react";
import { fn } from "storybook/test";
import { StrophenNavigator } from "./strophen-navigator";

const meta: Meta<typeof StrophenNavigator> = {
  title: "ZeileFuerZeile/StrophenNavigator",
  component: StrophenNavigator,
  tags: ["autodocs"],
  args: { onPrevious: fn(), onNext: fn() },
};
export default meta;

type Story = StoryObj<typeof StrophenNavigator>;

export const Mitte: Story = {
  args: {
    currentStropheName: "Strophe 2",
    currentPosition: 2,
    totalStrophen: 4,
    canGoBack: true,
    canGoForward: true,
  },
};

export const Erste: Story = {
  args: {
    currentStropheName: "Strophe 1",
    currentPosition: 1,
    totalStrophen: 4,
    canGoBack: false,
    canGoForward: true,
  },
};

export const Letzte: Story = {
  args: {
    currentStropheName: "Strophe 4",
    currentPosition: 4,
    totalStrophen: 4,
    canGoBack: true,
    canGoForward: false,
  },
};

export const MitRichtung: Story = {
  args: {
    currentStropheName: "Strophe 3",
    currentPosition: 3,
    totalStrophen: 4,
    canGoBack: true,
    canGoForward: true,
    showDirectionIcon: true,
    positionSuffix: "(rückwärts)",
  },
};
