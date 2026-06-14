"use client"

import type * as React from "react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"

type ContextMenu5WrapperProps = {
  children: React.ReactNode
  canUndo: boolean
  canRedo: boolean
  hasSelectedNode: boolean
  canPaste: boolean
  onNewNode: () => void
  onEditNode: () => void
  onUndo: () => void
  onRedo: () => void
  onCopy: () => void
  onPaste: () => void
  onDuplicate: () => void
  onDelete: () => void
}

export function ContextMenu5Wrapper({
  children,
  canUndo,
  canRedo,
  hasSelectedNode,
  canPaste,
  onNewNode,
  onEditNode,
  onUndo,
  onRedo,
  onCopy,
  onPaste,
  onDuplicate,
  onDelete,
}: ContextMenu5WrapperProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger className="block h-full w-full">
        {children}
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuGroup>
          <ContextMenuItem onClick={onNewNode}>
            New Node
            <ContextMenuShortcut>⌘ N</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={onEditNode} disabled={!hasSelectedNode}>
            Edit Node
            <ContextMenuShortcut>⌘ E</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem onClick={onUndo} disabled={!canUndo}>
            Undo
            <ContextMenuShortcut>⌘ Z</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={onRedo} disabled={!canRedo}>
            Redo
            <ContextMenuShortcut>⇧ ⌘ Z</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem onClick={onCopy} disabled={!hasSelectedNode}>
            Copy
            <ContextMenuShortcut>⌘ C</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={onPaste} disabled={!canPaste}>
            Paste
            <ContextMenuShortcut>⌘ V</ContextMenuShortcut>
          </ContextMenuItem>
          <ContextMenuItem onClick={onDuplicate} disabled={!hasSelectedNode}>
            Duplicate
            <ContextMenuShortcut>⌘ D</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
        <ContextMenuSeparator />
        <ContextMenuGroup>
          <ContextMenuItem
            variant="destructive"
            onClick={onDelete}
            disabled={!hasSelectedNode}
          >
            Delete
            <ContextMenuShortcut>Delete</ContextMenuShortcut>
          </ContextMenuItem>
        </ContextMenuGroup>
      </ContextMenuContent>
    </ContextMenu>
  )
}
