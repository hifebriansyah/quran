import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { SearchBox } from "./SearchBox";

const meta = { title: "Components/SearchBox", component: SearchBox } satisfies Meta<typeof SearchBox>;
export default meta;

export const OnBanner: StoryObj = {
  render: () => {
    const [value, setValue] = useState("");
    return (
      <div className="max-w-lg bg-banner-from p-6">
        <SearchBox value={value} onChange={setValue} placeholder="Nama/nomor surah, atau 2:124" label="Cari surah" />
      </div>
    );
  },
};
