"use client"

import { Check, ChevronDown } from "lucide-react"
import { useState } from "react"

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

export type PlatformSelectOption = {
  value: string
  label: string
  leading?: React.ReactNode
}

export function PlatformSelect({
  id,
  value,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  searchable = false,
  invalid = false,
  onChange,
}: {
  id?: string
  value: string
  options: readonly PlatformSelectOption[]
  placeholder: string
  searchPlaceholder?: string
  searchable?: boolean
  invalid?: boolean
  onChange: (value: string) => void
}) {
  const [open, setOpen] = useState(false)
  const selectedOption = options.find((option) => option.value === value)

  const selectOption = (nextValue: string) => {
    onChange(nextValue)
    setOpen(false)
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        id={id}
        type="button"
        aria-invalid={invalid}
        data-platform-select-trigger="true"
        className={cn(
          "inline-flex h-8 w-full items-center justify-between gap-1.5 rounded-lg border border-input bg-sidebar-accent px-2.5 text-sm font-normal outline-none transition-colors",
          selectedOption ? "text-foreground" : "text-muted-foreground"
        )}
      >
        <span className="flex min-w-0 items-center gap-2 truncate">
          {selectedOption?.leading}
          <span className="truncate">{selectedOption?.label ?? placeholder}</span>
        </span>
        <ChevronDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="start"
        data-platform-select-content="true"
        className="max-h-72 min-w-(--anchor-width) p-1"
      >
        {searchable ? (
          <Command
            data-platform-select-command="true"
            className="bg-transparent p-0"
            onKeyDown={(event) => event.stopPropagation()}
          >
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-60">
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={`${option.label} ${option.value}`}
                    data-checked={option.value === value}
                    onSelect={() => selectOption(option.value)}
                  >
                    {option.leading}
                    <span className="truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        ) : (
          options.map((option) => (
            <DropdownMenuItem key={option.value} onClick={() => selectOption(option.value)}>
              {option.leading}
              <span className="truncate">{option.label}</span>
              {option.value === value ? <Check className="ms-auto h-3.5 w-3.5" /> : null}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
