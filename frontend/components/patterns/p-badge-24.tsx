import { Badge } from "@/registry/spell-ui/badge"

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { MultiplicationSignIcon } from "@hugeicons/core-free-icons"

export function Pattern() {
  return (
    <Badge variant="neutral">
      <Avatar className="size-3.5">
        <AvatarImage src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=96&h=96&dpr=2&q=80" />
        <AvatarFallback>AL</AvatarFallback>
      </Avatar>
      Alex
      <Button
        variant="ghost"
        size="icon"
        className="size-3 hover:bg-transparent"
      >
        <HugeiconsIcon icon={MultiplicationSignIcon} strokeWidth={2} />
      </Button>
    </Badge>
  )
}
