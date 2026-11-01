import type { Meta, StoryObj } from "@storybook/react-vite";
import { surahByNo } from "~/lib/surahs";
import { SurahHeader } from "./SurahHeader";

const meta = { title: "Components/SurahHeader", component: SurahHeader, args: { lang: "id", bismillah: null } } satisfies Meta<
  typeof SurahHeader
>;
export default meta;
type Story = StoryObj<typeof meta>;

export const WithoutBismillah: Story = { args: { surah: surahByNo(9)! } };
export const English: Story = { args: { surah: surahByNo(96)!, lang: "en" } };
