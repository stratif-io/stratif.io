// apps/analytics/frontend/features/connections/components/steps/fieldmap/ColumnCombobox.tsx
import { useState } from 'react'
import { Check, ChevronsUpDown } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import { cn } from '@/lib/utils'

interface Props {
  value: string
  detectedColumns: string[]
  onChange: (v: string) => void
  placeholder?: string
}

export function ColumnCombobox({
  value,
  detectedColumns,
  onChange,
  placeholder = 'Select column…',
}: Props) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const options = Array.from(
    new Set([...(value ? [value] : []), ...detectedColumns.filter(Boolean)])
  ).sort((a, b) => (a === value ? -1 : b === value ? 1 : a.localeCompare(b)))

  const trimmed = search.trim()
  const showCreate =
    trimmed.length > 0 && !options.some((o) => o.toLowerCase() === trimmed.toLowerCase())

  function select(v: string) {
    onChange(v)
    setOpen(false)
    setSearch('')
  }

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setSearch('')
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            'h-8 w-full flex items-center justify-between rounded-md border border-input bg-background px-3 text-sm font-mono text-left',
            'hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-1 focus:ring-ring',
            !value && 'text-muted-foreground'
          )}
        >
          <span className="truncate">{value || placeholder}</span>
          <ChevronsUpDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] max-w-xs p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search or type column…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-52">
            {!showCreate && (
              <CommandEmpty>
                {options.length === 0 ? 'Type a column name to set it.' : 'No column found.'}
              </CommandEmpty>
            )}
            {showCreate && (
              <CommandGroup>
                <CommandItem value={trimmed} onSelect={() => select(trimmed)}>
                  <Check className="mr-2 h-3.5 w-3.5 shrink-0 opacity-0" />
                  Use "{trimmed}"
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup>
              {options.map((col) => (
                <CommandItem key={col} value={col} onSelect={() => select(col)}>
                  <Check
                    className={cn(
                      'mr-2 h-3.5 w-3.5 shrink-0',
                      col === value ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                  {col}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
