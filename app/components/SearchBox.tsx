import { Icon } from "./Icon";

export type SearchBoxProps = {
  value: string;
  onChange: (value: string) => void;
  /** Enter was pressed */
  onSubmit?: () => void;
  placeholder: string;
  label: string;
  className?: string;
};

/** The search field in the header: a soft pill inside the header pill. */
export function SearchBox({ value, onChange, onSubmit, placeholder, label, className = "" }: SearchBoxProps) {
  return (
    <form
      role="search"
      className={`flex h-9 items-center gap-2 rounded-full bg-ink/8 px-3.5 text-sm leading-5 text-ink ${className}`.trim()}
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit?.();
      }}
    >
      <Icon name="search" className="text-base text-muted" />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        autoComplete="off"
        enterKeyHint="go"
        className="min-w-0 flex-1 bg-transparent text-sm leading-5 outline-none placeholder:text-muted"
      />
    </form>
  );
}
