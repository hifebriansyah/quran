import type { Meta, StoryObj } from "@storybook/react-vite";
import { surahByNo } from "~/lib/surahs";
import { SurahNav } from "./SurahNav";

const meta = { title: "Components/SurahNav", component: SurahNav, args: { lang: "id" } } satisfies Meta<typeof SurahNav>;
export default meta;
type Story = StoryObj<typeof meta>;

export const Middle: Story = { args: { surah: surahByNo(96)! } };
export const FirstSurah: Story = { args: { surah: surahByNo(1)! } };
export const LastSurah: Story = { args: { surah: surahByNo(114)!, lang: "en" } };
