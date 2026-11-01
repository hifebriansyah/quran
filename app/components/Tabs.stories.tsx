import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Tabs } from "./Tabs";

const tabs = [
  { id: "surah", label: "Surah" },
  { id: "juz", label: "Juz" },
  { id: "order", label: "Tartib" },
];

const meta = { title: "Components/Tabs", component: Tabs } satisfies Meta<typeof Tabs>;
export default meta;

export const Default: StoryObj = {
  render: () => {
    const [value, setValue] = useState("surah");
    return <Tabs tabs={tabs} value={value} onChange={setValue} />;
  },
};
