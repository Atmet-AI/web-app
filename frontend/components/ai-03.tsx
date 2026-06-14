"use client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  IconBolt,
  IconChevronDown,
  IconCode,
  IconDeviceLaptop,
  IconHistory,
  IconPaperclip,
  IconPlus,
  IconRobot,
  IconSend,
  IconUser,
  IconWand,
  IconWorld,
} from "@tabler/icons-react";
import { useEffect, useRef, useState } from "react";

type Ai03Props = {
  onConversationStart?: () => void;
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
};

export default function Ai03({ onConversationStart }: Ai03Props) {
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState<"chat" | "automate">("chat");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [selectedModel, setSelectedModel] = useState("Local");
  const [selectedReasoning, setSelectedReasoning] = useState("Thinking");
  const [autoMode, setAutoMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!messagesViewportRef.current) return;
    messagesViewportRef.current.scrollTop = messagesViewportRef.current.scrollHeight;
  }, [messages, isResponding]);

  const buildAssistantReply = (message: string) => {
    return `I received: ${message}`;
  };

  const submitMessage = () => {
    const message = input.trim();
    if (!message) return;

    const timestamp = Date.now();
    setMessages((prev) => [...prev, { id: timestamp, role: "user", content: message }]);
    onConversationStart?.();
    setInput("");

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    setIsResponding(true);
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now(),
          role: "assistant",
          content: buildAssistantReply(message),
        },
      ]);
      setIsResponding(false);
    }, 300);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitMessage();
  };

  const placeholderText =
    activeTab === "chat"
      ? "Type @ for integrations, Type / for skills"
      : "Describe the automation you want to build";

  return (
    <div className="mx-auto w-full max-w-[calc(100vw-2rem)] sm:max-w-2xl md:max-w-3xl lg:max-w-4xl">
      {(messages.length > 0 || isResponding) && (
        <div
          ref={messagesViewportRef}
          className="mb-3 max-h-[42vh] overflow-y-auto px-1 space-y-3"
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex items-end gap-2", {
                "justify-end": message.role === "user",
                "justify-start": message.role === "assistant",
              })}
            >
              {message.role === "assistant" && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60">
                  <IconRobot className="size-4 text-muted-foreground" />
                </div>
              )}
              <div
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                  {
                    "bg-primary text-primary-foreground": message.role === "user",
                    "bg-muted text-foreground": message.role === "assistant",
                  }
                )}
              >
                {message.content}
              </div>
              {message.role === "user" && (
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60">
                  <IconUser className="size-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
          {isResponding && (
            <div className="flex items-end gap-2">
              <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/60">
                <IconRobot className="size-4 text-muted-foreground" />
              </div>
              <div className="rounded-2xl bg-muted px-3 py-2 text-sm text-muted-foreground">
                Typing...
              </div>
            </div>
          )}
        </div>
      )}

      <div className="rounded-[26px] border border-border/70 bg-muted/40 p-2">
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="sr-only"
          onChange={() => {}}
        />

        <div className="rounded-[20px] border border-border/70 bg-background/90">
          <div className="px-3 pt-2 pb-1">
            <div className="inline-flex items-center gap-1 rounded-xl border border-border/70 bg-muted/40 p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("chat")}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors",
                  activeTab === "chat"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <IconRobot className="size-3.5" />
                <span>Chat</span>
                <IconChevronDown className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("automate")}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-xs transition-colors",
                  activeTab === "automate"
                    ? "bg-background text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <IconWand className="size-3.5" />
                <span>Automate</span>
                <IconChevronDown className="size-3" />
              </button>
            </div>
          </div>

          <div className="px-4 pt-3 pb-2 grow">
            <form onSubmit={handleSubmit}>
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={placeholderText}
                className="w-full bg-transparent! p-0 border-0 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 text-foreground placeholder-muted-foreground resize-none border-none outline-none text-sm min-h-10 max-h-[25vh]"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) {
                    e.preventDefault();
                    submitMessage();
                  }
                }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = "auto";
                  target.style.height = target.scrollHeight + "px";
                }}
              />
              {input.length > 0 && (
                <div className="mt-2 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Enter</kbd>
                  <span>new line</span>
                  <span>•</span>
                  <kbd className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">Cmd/Ctrl + Enter</kbd>
                  <span>send</span>
                </div>
              )}
            </form>
          </div>

          <div className="mb-2 px-3 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-xl border border-border bg-muted/60 hover:bg-accent" />}><IconPlus className="size-3.5" /></DropdownMenuTrigger>

                <DropdownMenuContent
                  align="start"
                  className="max-w-xs rounded-2xl p-1.5"
                >
                  <DropdownMenuGroup className="space-y-1">
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <IconPaperclip size={16} className="opacity-60" />
                      Attach Files
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => {}}
                    >
                      <IconCode size={16} className="opacity-60" />
                      Code Interpreter
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => {}}
                    >
                      <IconWorld size={16} className="opacity-60" />
                      Web Search
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => {}}
                    >
                      <IconHistory size={16} className="opacity-60" />
                      Chat History
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoMode(!autoMode)}
                className={cn(
                  "h-8 rounded-xl border border-border px-2.5 text-xs hover:bg-accent",
                  {
                    "bg-primary/10 text-primary border-primary/30": autoMode,
                    "text-muted-foreground": !autoMode,
                  }
                )}
              >
                <IconWand className="size-3.5" />
                <span>Auto</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl border border-border px-2.5 text-xs text-muted-foreground hover:bg-accent"
                    />
                  }
                >
                  <IconDeviceLaptop className="size-3.5" />
                  <span>{selectedModel}</span>
                  <IconChevronDown className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-w-xs rounded-2xl p-1.5 bg-popover border-border"
                >
                  <DropdownMenuGroup className="space-y-1">
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => setSelectedModel("Local")}
                    >
                      <IconDeviceLaptop size={16} className="opacity-60" />
                      Local
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => setSelectedModel("Cloud")}
                    >
                      <IconWorld size={16} className="opacity-60" />
                      Cloud
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-xl border border-border px-2.5 text-xs text-muted-foreground hover:bg-accent"
                    />
                  }
                >
                  <IconBolt className="size-3.5" />
                  <span>{selectedReasoning}</span>
                  <IconChevronDown className="size-3" />
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="start"
                  className="max-w-xs rounded-2xl p-1.5 bg-popover border-border"
                >
                  <DropdownMenuGroup className="space-y-1">
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => setSelectedReasoning("Low")}
                    >
                      Low
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => setSelectedReasoning("Medium")}
                    >
                      Medium
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="rounded-[calc(1rem-6px)] text-xs"
                      onClick={() => setSelectedReasoning("Thinking")}
                    >
                      Thinking
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <Button
              type="button"
              disabled={!input.trim()}
              className="size-8 rounded-xl bg-primary p-0 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              onClick={submitMessage}
            >
              <IconSend className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
