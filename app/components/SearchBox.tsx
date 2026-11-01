import { Icon } from "./Icon";

export type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  /** Enter was pressed */
  onSubmit?: () => void;
  placeholder: string;
  label: string;
};

export function SearchBox({ value, onChange, onSubmit, placeholder, label }: SearchBoxProps) {
  return (
    <form
      role="search"
      className="flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-[#1d2433] shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Icon name="search" className="text-lg text-[#667085]" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        enterKeyHint="go"
        className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-[#8a92a3]"
      />
    </form>
  );
}
