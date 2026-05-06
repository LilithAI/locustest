import { ChevronDown, Check, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useState } from "react";

type Option = { label: string; value: string };

interface FilterDropdownProps {
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  searchable?: boolean;
  className?: string;
}

export default function FilterDropdown({
  label,
  value,
  options,
  onChange,
  searchable = true,
  className,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  const isActive = !!value;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group inline-flex items-center justify-between gap-2 h-11 px-3 rounded-lg border-2 text-sm font-medium transition-all whitespace-nowrap",
            isActive
              ? "bg-accent text-accent-foreground border-foreground shadow-[3px_3px_0_0_hsl(var(--foreground))]"
              : "bg-card text-foreground border-foreground/70 hover:border-foreground hover:shadow-[3px_3px_0_0_hsl(var(--accent))]",
            className
          )}
        >
          <span className="truncate max-w-[140px]">
            {selected ? `${label}: ${selected.label}` : label}
          </span>
          {isActive ? (
            <span
              role="button"
              tabIndex={-1}
              aria-label={`Clear ${label}`}
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                onChange("");
              }}
              className="shrink-0 p-0.5 rounded hover:bg-foreground/10"
            >
              <X size={14} />
            </span>
          ) : (
            <ChevronDown size={14} className="shrink-0 opacity-70 group-hover:opacity-100" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="p-0 w-[260px] border-2 border-foreground rounded-xl shadow-[4px_4px_0_0_hsl(var(--accent))] bg-card"
      >
        <Command>
          {searchable && options.length > 8 && (
            <CommandInput placeholder={`Search ${label.toLowerCase()}…`} className="h-10" />
          )}
          <CommandList className="max-h-72">
            <CommandEmpty>No matches.</CommandEmpty>
            <CommandGroup>
              <CommandItem
                value="__all__"
                onSelect={() => {
                  onChange("");
                  setOpen(false);
                }}
                className="cursor-pointer"
              >
                <span className="flex-1">All {label.toLowerCase()}</span>
                {!value && <Check size={14} className="text-accent" />}
              </CommandItem>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {value === opt.value && <Check size={14} className="text-accent" />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
