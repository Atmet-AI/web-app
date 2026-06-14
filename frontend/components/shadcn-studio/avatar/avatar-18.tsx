import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Plus } from 'lucide-react'

type ChatParticipant = {
  src?: string
  fallback: string
  name: string
}

const avatars: ChatParticipant[] = [
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-3.png',
    fallback: 'OS',
    name: 'Olivia Sparks'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-6.png',
    fallback: 'HL',
    name: 'Howard Lloyd'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-5.png',
    fallback: 'HR',
    name: 'Hallie Richards'
  },
  {
    src: 'https://cdn.shadcnstudio.com/ss-assets/avatar/avatar-16.png',
    fallback: 'JW',
    name: 'Jenny Wilson'
  }
]

type AvatarGroupTooltipTransitionDemoProps = {
  users?: ChatParticipant[]
  className?: string
  onOpenUserPicker?: () => void
  manageUsersLabel?: string
}

const AvatarGroupTooltipTransitionDemo = ({
  users = avatars,
  className,
  onOpenUserPicker,
  manageUsersLabel = 'Manage chat users',
}: AvatarGroupTooltipTransitionDemoProps) => {
  return (
    <div className={cn('group flex items-center', className)}>
      {users.map((avatar, index) => (
        <Tooltip key={index}>
          <TooltipTrigger
            render={
              <Avatar
                size="sm"
                className={cn(
                  'ring-background relative ring-2 transition-[margin] duration-300 ease-out',
                  index > 0 && '-ml-3 group-hover:ml-0.5'
                )}
                style={{ zIndex: users.length - index }}
              />
            }
          >
            <AvatarImage src={avatar.src} alt={avatar.name} />
            <AvatarFallback className="text-[10px]">{avatar.fallback}</AvatarFallback>
          </TooltipTrigger>
          <TooltipContent>{avatar.name}</TooltipContent>
        </Tooltip>
      ))}
      {onOpenUserPicker && (
        <Tooltip>
          <TooltipTrigger
            render={
              <button
                type="button"
                aria-label={manageUsersLabel}
                onClick={onOpenUserPicker}
                className={cn(
                  'ring-background bg-muted text-muted-foreground hover:bg-accent hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-full ring-2 transition-[margin] duration-300 ease-out',
                  users.length > 0 && '-ml-3 group-hover:ml-0.5'
                )}
              />
            }
          >
            <Plus className="h-3 w-3" />
          </TooltipTrigger>
          <TooltipContent>{manageUsersLabel}</TooltipContent>
        </Tooltip>
      )}
    </div>
  )
}

export default AvatarGroupTooltipTransitionDemo
export type { ChatParticipant }
