export type TabsProps<T extends string> = {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
};

export function Tabs<T extends string>({ tabs, value, onChange }: TabsProps<T>) {
  return (
    <div role="tablist" className="inline-flex rounded-full bg-line/60 p-1 text-sm font-medium">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          role="tab"
          aria-selected={tab.id === value}
          onClick={() => onChange(tab.id)}
          className={`rounded-full px-4 py-1.5 transition ${tab.id === value ? "bg-accent text-accent-ink" : "text-muted hover:text-ink"}`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
