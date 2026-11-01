import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppBar } from "./AppBar";

const meta = {
  title: "Components/AppBar",
  component: AppBar,
  args: { alternates: { id: "/id/al-alaq", en: "/en/al-alaq" } },
} satisfies Meta<typeof AppBar>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Indonesian: Story = { args: { lang: "id" } };
export const English: Story = { args: { lang: "en" } };
