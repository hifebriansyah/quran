import type { Decorator, Preview } from "@storybook/react-vite";
import { MemoryRouter } from "react-router";
import { ToastProvider } from "../app/components/Toast";
import "../app/styles/app.css";

const withApp: Decorator = (Story, context) => {
  document.documentElement.dataset.theme = context.globals.theme === "dark" ? "dark" : "light";
  return (
    <ToastProvider>
      <MemoryRouter initialEntries={["/id"]}>
        <div className="min-h-32 bg-bg p-4 text-ink">
          <Story />
        </div>
      </MemoryRouter>
    </ToastProvider>
  );
};

const preview: Preview = {
  decorators: [withApp],
  globalTypes: {
    theme: {
      description: "Theme",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { theme: "light" },
  parameters: { backgrounds: { disable: true }, layout: "fullscreen", a11y: { test: "todo" } },
};
export default preview;
