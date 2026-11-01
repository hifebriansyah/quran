import type { Meta, StoryObj } from "@storybook/react-vite";
import { Toast } from "./Toast";

const meta = { title: "Components/Toast", component: Toast } satisfies Meta<typeof Toast>;
export default meta;

export const Shown: StoryObj<typeof meta> = { args: { message: "Ayat disalin", shown: true } };
