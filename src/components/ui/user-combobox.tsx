import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command"
import type { User } from "@/types"

interface UserComboboxProps {
  users: User[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
}

// Searchable dropdown for selecting a user from a long list
const UserCombobox = ({ users, value, onValueChange, placeholder }: UserComboboxProps) => {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  const selectedUser = users.find(u => u.id === value)

  return (
    // `modal` is what makes the list scroll with the mouse wheel inside a dialog.
    //
    // Almost every use of this picker is inside a Dialog. A Radix Dialog locks
    // scrolling for everything outside itself (react-remove-scroll), and
    // PopoverContent is portaled to <body> — i.e. outside the dialog. So wheel and
    // touch scrolling on the list were swallowed, while dragging the scrollbar
    // still worked because that doesn't go through wheel events.
    //
    // A modal popover registers its own scroll lock, which becomes the active one
    // and allows scrolling inside the popover. Side effects are what a combobox
    // should do anyway: focus stays in the list and the page behind can't scroll.
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {selectedUser ? selectedUser.full_name : (placeholder ?? t("common.selectUser"))}
          <ChevronsUpDown className="ms-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("common.searchUser")} />
          <CommandList>
            <CommandEmpty>{t("common.noResults")}</CommandEmpty>
            <CommandGroup>
              {users.map(u => (
                <CommandItem
                  key={u.id}
                  value={u.full_name}
                  onSelect={() => {
                    onValueChange(u.id)
                    setOpen(false)
                  }}
                >
                  <Check className={cn("me-2 h-4 w-4", value === u.id ? "opacity-100" : "opacity-0")} />
                  <span>{u.full_name}</span>
                  <span className="ms-auto text-xs text-muted-foreground">{u.phone}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export default UserCombobox
