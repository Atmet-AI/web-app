"use client";

/**
 * @author: @kokonutui
 * @description: AI Prompt Input
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import {
  Bot,
  Check,
  ChevronDown,
  CornerDownLeft,
  Copy,
  Download,
  FileArchive,
  FileImage,
  FileText,
  Monitor,
  Pencil,
  Plus,
  RefreshCcw,
  Play,
  ThumbsDown,
  ThumbsUp,
  Upload,
  UserPlus,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/registry/spell-ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Kbd } from "@/components/ui/kbd";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/lib/workspace-context";
import {
  Artifact,
  ArtifactAction,
  ArtifactActions,
  ArtifactContent,
  ArtifactDescription,
  ArtifactHeader,
  ArtifactTitle,
} from "@/components/ai/artifact";
import {
  DocumentCsvIllustration,
  DocumentJsonIllustration,
  DocumentPptxIllustration,
  DocumentTxtIllustration,
  DocumentXlsxIllustration,
  DocumentZipIllustration,
} from "@/components/file-type-illustrations";

const OPENAI_SVG = (
  <div>
    <svg
      aria-label="o3-mini icon"
      className="block dark:hidden"
      height="260"
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 256 260"
      width="256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>OpenAI Icon Light</title>
      <path d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z" />
    </svg>
    <svg
      aria-label="o3-mini icon"
      className="hidden dark:block"
      height="260"
      preserveAspectRatio="xMidYMid"
      viewBox="0 0 256 260"
      width="256"
      xmlns="http://www.w3.org/2000/svg"
    >
      <title>OpenAI Icon Dark</title>
      <path
        d="M239.184 106.203a64.716 64.716 0 0 0-5.576-53.103C219.452 28.459 191 15.784 163.213 21.74A65.586 65.586 0 0 0 52.096 45.22a64.716 64.716 0 0 0-43.23 31.36c-14.31 24.602-11.061 55.634 8.033 76.74a64.665 64.665 0 0 0 5.525 53.102c14.174 24.65 42.644 37.324 70.446 31.36a64.72 64.72 0 0 0 48.754 21.744c28.481.025 53.714-18.361 62.414-45.481a64.767 64.767 0 0 0 43.229-31.36c14.137-24.558 10.875-55.423-8.083-76.483Zm-97.56 136.338a48.397 48.397 0 0 1-31.105-11.255l1.535-.87 51.67-29.825a8.595 8.595 0 0 0 4.247-7.367v-72.85l21.845 12.636c.218.111.37.32.409.563v60.367c-.056 26.818-21.783 48.545-48.601 48.601Zm-104.466-44.61a48.345 48.345 0 0 1-5.781-32.589l1.534.921 51.722 29.826a8.339 8.339 0 0 0 8.441 0l63.181-36.425v25.221a.87.87 0 0 1-.358.665l-52.335 30.184c-23.257 13.398-52.97 5.431-66.404-17.803ZM23.549 85.38a48.499 48.499 0 0 1 25.58-21.333v61.39a8.288 8.288 0 0 0 4.195 7.316l62.874 36.272-21.845 12.636a.819.819 0 0 1-.767 0L41.353 151.53c-23.211-13.454-31.171-43.144-17.804-66.405v.256Zm179.466 41.695-63.08-36.63L161.73 77.86a.819.819 0 0 1 .768 0l52.233 30.184a48.6 48.6 0 0 1-7.316 87.635v-61.391a8.544 8.544 0 0 0-4.4-7.213Zm21.742-32.69-1.535-.922-51.619-30.081a8.39 8.39 0 0 0-8.492 0L99.98 99.808V74.587a.716.716 0 0 1 .307-.665l52.233-30.133a48.652 48.652 0 0 1 72.236 50.391v.205ZM88.061 139.097l-21.845-12.585a.87.87 0 0 1-.41-.614V65.685a48.652 48.652 0 0 1 79.757-37.346l-1.535.87-51.67 29.825a8.595 8.595 0 0 0-4.246 7.367l-.051 72.697Zm11.868-25.58 28.138-16.217 28.188 16.218v32.434l-28.086 16.218-28.188-16.218-.052-32.434Z"
        fill="#fff"
      />
    </svg>
  </div>
);

type AttachmentKind =
  | "image"
  | "excel"
  | "pdf"
  | "document"
  | "archive"
  | "text"
  | "other";

type MessageAttachment = {
  id: string;
  fileId?: string;
  name: string;
  kind: AttachmentKind;
  previewUrl?: string;
};

type AttachmentDraft = {
  id: string;
  name: string;
  kind: AttachmentKind;
  previewUrl?: string;
  file?: File;
};

type ChatMessage = {
  id: number;
  role: "user" | "assistant";
  content: string;
  attachments?: MessageAttachment[];
};

type ApiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  metadata?: {
    attachments?: MessageAttachment[];
  } | null;
};

type UploadedFilePayload = {
  id: string;
  name: string;
  mime_type: string;
  size_bytes: number;
};

type CommandMenuState = {
  type: "skill" | "app";
  query: string;
  start: number;
  end: number;
};

type AssistantContentSegment =
  | { type: "text"; value: string }
  | { type: "code"; language: string; value: string };

const AI_CORE_CHATS_UPDATED_EVENT = "ai-core-chats-updated";

type AIPromptProps = {
  chatId?: string | null;
  persistChatListEntry?: boolean;
  hideGreeting?: boolean;
  dockComposerToBottom?: boolean;
  glassComposer?: boolean;
  fixedCommandBadge?: string;
  onConversationStart?: () => void;
  onAutomationConversationStart?: () => void;
  onConversationActivityChange?: (isActive: boolean) => void;
  onAddUserToChat?: () => void;
  userFullName?: string;
  enableCreateAgent?: boolean;
};

const AI_MODELS = [
  "Atmet",
  "Gemini 3",
  "GPT-5-mini",
  "Claude 4.5 Sonnet",
  "GPT-5-1 Mini",
  "GPT-5-1",
] as const;

const DEFAULT_TELEGRAM_AGENT_INSTRUCTIONS =
  "You are a customer support agent replying on Telegram. Reply in the same language as the customer unless the instructions say otherwise. Be concise, friendly, and practical. Ask one focused question when information is missing. Do not explain how to create, deploy, or connect a Telegram bot unless the customer asks about that. If the request needs a human, say the team will follow up.";

function normalizePlanText(value: string) {
  return value
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/[#>*_`-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function looksLikeSetupGuide(value: string) {
  return /botfather|newbot|deploy|server|cloud function|webhook|bot token|write the bot code|telegram bot library/i.test(value);
}

function draftTelegramAgentInstructions(plan: string, transcript: ChatMessage[]) {
  const normalizedPlan = normalizePlanText(plan);
  const latestUserAsk = [...transcript]
    .reverse()
    .find((message) => message.role === "user" && message.content.trim().length > 0)
    ?.content.trim();

  const businessGoal = latestUserAsk
    ? `The user asked Atmet to build this Telegram agent: "${latestUserAsk.slice(0, 420)}".`
    : "The user asked Atmet to build a Telegram customer agent.";

  if (!normalizedPlan || looksLikeSetupGuide(normalizedPlan)) {
    return `${DEFAULT_TELEGRAM_AGENT_INSTRUCTIONS}\n\n${businessGoal}`;
  }

  const planContext =
    normalizedPlan.length > 700 ? `${normalizedPlan.slice(0, 697)}...` : normalizedPlan;

  return `${DEFAULT_TELEGRAM_AGENT_INSTRUCTIONS}\n\n${businessGoal}\n\nUse this plan as behavior context, not as setup instructions: ${planContext}`;
}


export default function AI_Prompt({
  chatId = null,
  persistChatListEntry = true,
  hideGreeting = false,
  dockComposerToBottom = false,
  glassComposer = false,
  fixedCommandBadge,
  onConversationStart,
  onAutomationConversationStart,
  onConversationActivityChange,
  onAddUserToChat,
  userFullName = "there",
  enableCreateAgent = true,
}: AIPromptProps) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [composerScrollTop, setComposerScrollTop] = useState(0);
  const [activeTab] = useState<"automation" | "chat">("automation");
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  const [selectedSkill, setSelectedSkill] = useState("No skill");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isResponding, setIsResponding] = useState(false);
  const [resolvedChatId, setResolvedChatId] = useState<string | null>(chatId ?? null);
  const [creatingAgentMessageId, setCreatingAgentMessageId] = useState<number | null>(null);
  const [createAgentError, setCreateAgentError] = useState<string | null>(null);
  const [agentSetupMessageId, setAgentSetupMessageId] = useState<number | null>(null);
  const [telegramAgentName, setTelegramAgentName] = useState("Telegram support agent");
  const [telegramAgentInstructions, setTelegramAgentInstructions] = useState(DEFAULT_TELEGRAM_AGENT_INSTRUCTIONS);
  const [telegramAgentMode, setTelegramAgentMode] = useState<"atmet" | "agent_api">("atmet");
  const [telegramAgentApiUrl, setTelegramAgentApiUrl] = useState("");
  const [isCreatingTelegramAgent, setIsCreatingTelegramAgent] = useState(false);
  const [telegramAgentError, setTelegramAgentError] = useState<string | null>(null);
  const [telegramAgentSuccess, setTelegramAgentSuccess] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [attachedFiles, setAttachedFiles] = useState<AttachmentDraft[]>([]);
  const [assistantFeedback, setAssistantFeedback] = useState<
    Record<number, "like" | "dislike">
  >({});
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [codeRunOutput, setCodeRunOutput] = useState<
    Record<string, { status: "success" | "error" | "info"; output: string }>
  >({});
  const copyTimersRef = useRef<Record<string, number>>({});
  const [heroLine1, setHeroLine1] = useState("");
  const [heroTypingLine, setHeroTypingLine] = useState<0 | 1>(0);
  const [commandMenu, setCommandMenu] = useState<CommandMenuState | null>(null);
  const [highlightedCommandIndex, setHighlightedCommandIndex] = useState(0);
  const instanceId = useId().replace(/:/g, "");
  const fileInputId = `ai-upload-input-${instanceId}`;
  const textareaId = `ai-input-${instanceId}`;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachedFilesRef = useRef<AttachmentDraft[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const nextMessageIdRef = useRef(Date.now());
  const activeChatIdRef = useRef<string | null>(null);
  const activeChatTitleRef = useRef<string | null>(null);
  const messagesViewportRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 72,
    maxHeight: 300,
  });
  const [selectedModel, setSelectedModel] = useState("Atmet");
  const fixedSkillName = useMemo(() => {
    if (!fixedCommandBadge) return null;
    const normalized = fixedCommandBadge.trim().replace(/^\//, "").trim();
    return normalized.length > 0 ? normalized : null;
  }, [fixedCommandBadge]);
  const lockedComposerPrefix = useMemo(
    () => (fixedSkillName ? `/${fixedSkillName} ` : ""),
    [fixedSkillName]
  );
  const firstName = useMemo(
    () => userFullName.trim().split(/\s+/)[0] || "there",
    [userFullName]
  );
  const { apiFetch } = useWorkspace();

  type IntegrationConnection = {
    id: string;
    connection_name?: string | null;
    connected_account?: string | null;
    status?: string | null;
  };
  type Integration = {
    slug: string;
    name: string;
    logo: string;
    connected: boolean;
    connection_count?: number;
    connections?: IntegrationConnection[];
  };
  const [availableIntegrations, setAvailableIntegrations] = useState<Integration[]>([]);
  const [availableSkillNames, setAvailableSkillNames] = useState<string[]>([]);
  const [telegramConnections, setTelegramConnections] = useState<IntegrationConnection[]>([]);
  const [selectedTelegramConnectionId, setSelectedTelegramConnectionId] = useState("");

  useEffect(() => {
    apiFetch("/api/integrations")
      .then((r) => r.json())
      .then((res: { data?: { integrations?: Integration[] } }) => {
        if (res.data?.integrations) setAvailableIntegrations(res.data.integrations);
      })
      .catch(() => {});
    apiFetch("/api/skills")
      .then((r) => r.json())
      .then((res: { data?: { skills?: Array<{ id: string; name: string }> } }) => {
        if (res.data?.skills) setAvailableSkillNames(res.data.skills.map((s) => s.name));
      })
      .catch(() => {});
  }, [apiFetch]);

  const appNames = useMemo(() => availableIntegrations.map((i) => i.name), [availableIntegrations]);
  const integrationByName = useMemo(
    () => new Map(availableIntegrations.map((i) => [i.name.toLowerCase(), i])),
    [availableIntegrations]
  );
  const telegramIntegration = useMemo(
    () => availableIntegrations.find((integration) => integration.slug === "telegram") ?? null,
    [availableIntegrations]
  );
  useEffect(() => {
    if (!agentSetupMessageId) return;
    if (!telegramIntegration?.connected) {
      setTelegramConnections([]);
      setSelectedTelegramConnectionId("");
      return;
    }

    apiFetch("/api/integrations/telegram", { cache: "no-store" })
      .then((response) => response.json())
      .then((res: { data?: { integration?: Integration } }) => {
        const connections = res.data?.integration?.connections ?? telegramIntegration.connections ?? [];
        const activeConnections = connections.filter((connection) => connection.status !== "error");
        setTelegramConnections(activeConnections);
        setSelectedTelegramConnectionId((current) => {
          if (current && activeConnections.some((connection) => connection.id === current)) {
            return current;
          }
          return activeConnections[0]?.id ?? "";
        });
      })
      .catch(() => {
        const fallbackConnections = telegramIntegration.connections ?? [];
        setTelegramConnections(fallbackConnections);
        setSelectedTelegramConnectionId((current) => current || fallbackConnections[0]?.id || "");
      });
  }, [agentSetupMessageId, apiFetch, telegramIntegration]);
  const isTelegramMentioned = useMemo(() => {
    const telegramMentionPattern = /(^|\s)@?telegram(?=\s|$|[.,!?;:])/i;
    return (
      connectedApps.some((app) => app.toLowerCase() === "telegram") ||
      telegramMentionPattern.test(value) ||
      messages.some((message) => telegramMentionPattern.test(message.content))
    );
  }, [connectedApps, value, messages]);
  const mentionableSkills = useMemo(() => {
    const baseSkills = availableSkillNames;
    if (!fixedSkillName) return baseSkills;
    if (baseSkills.some((skill) => skill.toLowerCase() === fixedSkillName.toLowerCase())) {
      return baseSkills;
    }
    return [fixedSkillName, ...baseSkills];
  }, [fixedSkillName, availableSkillNames]);

  const createClientMessageId = useCallback(() => {
    nextMessageIdRef.current += 1;
    return nextMessageIdRef.current;
  }, []);

  const renderAppLogo = (app: string, size: "sm" | "md" | "mention" = "sm") => {
    const integration = integrationByName.get(app.toLowerCase());
    const baseSize =
      size === "md"
        ? "h-5 w-5"
        : size === "mention"
          ? "h-[1.18em] w-[1.18em]"
          : "h-4 w-4";
    const radiusClass = size === "mention" ? "rounded-[0.36em]" : "rounded-sm";

    if (integration?.logo) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={integration.logo}
          alt={integration.name}
          className={cn("inline-block shrink-0 object-contain", radiusClass, baseSize)}
        />
      );
    }

    const textSize =
      size === "md" ? "text-[11px]" : size === "mention" ? "text-[0.8em] leading-none" : "text-[10px]";
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center justify-center border border-border/40 bg-muted/70 font-semibold text-muted-foreground",
          radiusClass,
          baseSize,
          textSize
        )}
      >
        {app[0]}
      </span>
    );
  };

  const getAttachmentKind = (fileName: string, mimeType = ""): AttachmentKind => {
    const lower = fileName.toLowerCase();
    const ext = lower.includes(".") ? lower.split(".").pop() ?? "" : "";

    if (mimeType.startsWith("image/")) return "image";
    if (
      mimeType === "application/pdf" ||
      ext === "pdf"
    ) {
      return "pdf";
    }
    if (
      mimeType.includes("spreadsheet") ||
      mimeType.includes("excel") ||
      ["xls", "xlsx", "csv"].includes(ext)
    ) {
      return "excel";
    }
    if (
      mimeType.includes("word") ||
      ["doc", "docx", "odt", "rtf"].includes(ext)
    ) {
      return "document";
    }
    if (
      mimeType.includes("zip") ||
      mimeType.includes("compressed") ||
      ["zip", "rar", "7z", "tar", "gz"].includes(ext)
    ) {
      return "archive";
    }
    if (
      mimeType.startsWith("text/") ||
      ["txt", "md", "json", "xml", "yaml", "yml"].includes(ext)
    ) {
      return "text";
    }
    return "other";
  };

  const getAttachmentIcon = (kind: AttachmentKind) => {
    if (kind === "image") return <FileImage className="h-4 w-4" />;
    if (kind === "archive") return <FileArchive className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const getFileExtension = (fileName: string) => {
    const lower = fileName.toLowerCase();
    return lower.includes(".") ? lower.split(".").pop() ?? "" : "";
  };

  const renderAttachmentIllustration = (attachment: Pick<MessageAttachment, "kind" | "name">) => {
    const ext = getFileExtension(attachment.name);

    if (attachment.kind === "excel") {
      const Illustration = ext === "csv" ? DocumentCsvIllustration : DocumentXlsxIllustration;
      return <Illustration />;
    }

    if (attachment.kind === "archive") return <DocumentZipIllustration />;

    if (attachment.kind === "text") {
      const Illustration = ext === "json" ? DocumentJsonIllustration : DocumentTxtIllustration;
      return <Illustration />;
    }

    if (attachment.kind === "other" && ["ppt", "pptx"].includes(ext)) {
      return <DocumentPptxIllustration />;
    }

    return null;
  };

  const renderAttachmentPreviewAsset = (attachment: Pick<MessageAttachment, "kind" | "name">) => {
    const illustration = renderAttachmentIllustration(attachment);

    if (illustration) {
      return (
        <span className="relative inline-block h-10 w-10">
          <span
            className="pointer-events-none absolute left-0 top-0 block"
            style={{ transform: "scale(0.52)", transformOrigin: "0 0" }}
          >
            {illustration}
          </span>
        </span>
      );
    }

    return <span className="opacity-80">{getAttachmentIcon(attachment.kind)}</span>;
  };

  const getAttachmentKindLabel = (kind: AttachmentKind) => {
    if (kind === "image") return "Image";
    if (kind === "excel") return "Spreadsheet";
    if (kind === "pdf") return "PDF";
    if (kind === "document") return "Document";
    if (kind === "archive") return "Archive";
    if (kind === "text") return "Text";
    return "File";
  };

  const commandItems = useMemo(() => {
    if (!commandMenu) return [];

    const source =
      commandMenu.type === "skill"
        ? mentionableSkills
        : appNames;

    const query = commandMenu.query.trim().toLowerCase();
    return source.filter((item) => item.toLowerCase().includes(query));
  }, [commandMenu, mentionableSkills, appNames]);

  const MODEL_ICONS: Record<string, React.ReactNode> = {
    Atmet: (
      <Image
        src="/Logos/Favicon Atmet.png"
        alt=""
        width={16}
        height={16}
        className="h-4 w-4 rounded-sm object-contain"
      />
    ),
    "GPT-5-mini": OPENAI_SVG,
    "Gemini 3": (
      <svg
        height="1em"
        style={{ flex: "none", lineHeight: "1" }}
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>Gemini</title>
        <defs>
          <linearGradient
            id="lobe-icons-gemini-fill"
            x1="0%"
            x2="68.73%"
            y1="100%"
            y2="30.395%"
          >
            <stop offset="0%" stopColor="#1C7DFF" />
            <stop offset="52.021%" stopColor="#1C69FF" />
            <stop offset="100%" stopColor="#F0DCD6" />
          </linearGradient>
        </defs>
        <path
          d="M12 24A14.304 14.304 0 000 12 14.304 14.304 0 0012 0a14.305 14.305 0 0012 12 14.305 14.305 0 00-12 12"
          fill="url(#lobe-icons-gemini-fill)"
          fillRule="nonzero"
        />
      </svg>
    ),
    "Claude 4.5 Sonnet": (
      <div>
        <svg
          className="block dark:hidden"
          fill="#000"
          fillRule="evenodd"
          style={{ flex: "none", lineHeight: "1" }}
          viewBox="0 0 24 24"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Anthropic Icon Light</title>
          <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
        <svg
          className="hidden dark:block"
          fill="#ffff"
          fillRule="evenodd"
          style={{ flex: "none", lineHeight: "1" }}
          viewBox="0 0 24 24"
          width="1em"
          xmlns="http://www.w3.org/2000/svg"
        >
          <title>Anthropic Icon Dark</title>
          <path d="M13.827 3.52h3.603L24 20h-3.603l-6.57-16.48zm-7.258 0h3.767L16.906 20h-3.674l-1.343-3.461H5.017l-1.344 3.46H0L6.57 3.522zm4.132 9.959L8.453 7.687 6.205 13.48H10.7z" />
        </svg>
      </div>
    ),
    "GPT-5-1 Mini": OPENAI_SVG,
    "GPT-5-1": OPENAI_SVG,
  };

  useEffect(() => {
    if (messages.length === 0 && !isResponding) return;

    requestAnimationFrame(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior: "auto",
      });
    });
  }, [messages.length, isResponding]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    onConversationActivityChange?.(messages.length > 0 || isResponding);
  }, [messages.length, isResponding, onConversationActivityChange]);

  useEffect(() => {
    const isPreChat = messages.length === 0 && !isResponding;
    if (!isPreChat) return;

    const hour = new Date().getHours();
    const greeting =
      hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
    const line1Target = `${greeting}, ${firstName}`;

    setHeroLine1("");
    setHeroTypingLine(1);

    const timeouts: Array<ReturnType<typeof setTimeout>> = [];
    let isCancelled = false;

    const schedule = (fn: () => void, delayMs: number) => {
      const id = setTimeout(() => {
        if (!isCancelled) fn();
      }, delayMs);
      timeouts.push(id);
    };

    const typeLine = (
      target: string,
      setLine: (value: string) => void,
      onComplete: () => void,
      baseDelayMs = 36
    ) => {
      let index = 0;

      const step = () => {
        index += 1;
        setLine(target.slice(0, index));

        if (index < target.length) {
          schedule(step, baseDelayMs + (index % 3) * 8);
          return;
        }

        onComplete();
      };

      schedule(step, 280);
    };

    typeLine(line1Target, setHeroLine1, () => {
      setHeroTypingLine(0);
    });

    return () => {
      isCancelled = true;
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
    };
  }, [messages.length, isResponding, firstName]);

  useEffect(() => {
    attachedFilesRef.current = attachedFiles;
  }, [attachedFiles]);

  useEffect(() => {
    if (!lockedComposerPrefix) return;

    setValue((prev) => {
      if (prev.startsWith(lockedComposerPrefix)) return prev;
      const withoutPrefix = prev.replace(
        new RegExp(
          `^\\s*\\/${fixedSkillName?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") ?? ""}\\s*`,
          "i"
        ),
        ""
      );
      return `${lockedComposerPrefix}${withoutPrefix.replace(/^\s+/, "")}`;
    });
  }, [fixedSkillName, lockedComposerPrefix]);

  useEffect(() => {
    activeChatIdRef.current = chatId ?? null;
    setResolvedChatId(chatId ?? null);
    setAgentSetupMessageId(null);
    setTelegramAgentError(null);
    setTelegramAgentSuccess(null);

    if (!chatId) {
      activeChatTitleRef.current = null;
      return;
    }

    activeChatTitleRef.current = null;
  }, [chatId]);

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      return;
    }

    let isCancelled = false;
    void apiFetch(`/api/chats/${chatId}/messages`)
      .then((response) => (response.ok ? response.json() : null))
      .then((payload: { data?: { messages?: ApiMessage[] } } | null) => {
        if (isCancelled) return;
        setMessages(
          (payload?.data?.messages ?? [])
            .filter((message) => message.role === "user" || message.role === "assistant")
            .map((message, index) => ({
              id: index + 1,
              role: message.role,
              content: message.content,
              attachments: message.metadata?.attachments ?? undefined,
            }))
        );
      })
      .catch(() => {
        if (!isCancelled) setMessages([]);
      });

    return () => {
      isCancelled = true;
    };
  }, [apiFetch, chatId]);

  useEffect(() => {
    const copyTimers = copyTimersRef.current;
    return () => {
      Object.values(copyTimers).forEach((timeoutId) => {
        clearTimeout(timeoutId);
      });

      const previewUrls = new Set<string>();

      attachedFilesRef.current.forEach((attachment) => {
        if (attachment.previewUrl) previewUrls.add(attachment.previewUrl);
      });

      messagesRef.current.forEach((message) => {
        message.attachments?.forEach((attachment) => {
          if (attachment.previewUrl) previewUrls.add(attachment.previewUrl);
        });
      });

      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const buildAssistantReply = (
    message: string,
    attachments: MessageAttachment[] = []
  ) => {
    const lowerMessage = message.toLowerCase();
    const attachmentNames = attachments.map((attachment) => attachment.name);
    const filesNote =
      attachmentNames.length > 0
        ? `\nFiles: ${attachmentNames.join(", ")}`
        : "";

    const wantsCode =
      /```|`{2,}|code block|code snippet|code script|write code|show me.*code|example code|python|javascript|typescript|bash|shell|sql/.test(
        lowerMessage
      );

    if (wantsCode) {
      let language = "python";
      if (
        /\b(javascript|js|node)\b/.test(lowerMessage)
      ) {
        language = "javascript";
      } else if (/\b(typescript|ts)\b/.test(lowerMessage)) {
        language = "typescript";
      } else if (/\b(bash|shell|sh)\b/.test(lowerMessage)) {
        language = "bash";
      } else if (/\bsql\b/.test(lowerMessage)) {
        language = "sql";
      }

      const sampleByLanguage: Record<string, string> = {
        python: 'for i in range(3):\n    print("hello world", i)',
        javascript:
          'for (let i = 0; i < 3; i += 1) {\n  console.log("hello world", i);\n}',
        typescript:
          'for (let i = 0; i < 3; i += 1) {\n  console.log("hello world", i);\n}',
        bash: 'for i in 1 2 3; do\n  echo "hello world $i"\ndone',
        sql: 'SELECT id, name\nFROM users\nORDER BY id\nLIMIT 3;',
      };

      const code = sampleByLanguage[language] ?? sampleByLanguage.python;
      const intro =
        activeTab === "automation"
          ? "Automation code draft:"
          : "Here is a code example:";

      return `${intro}\n\n\`\`\`${language}\n${code}\n\`\`\`${filesNote}`;
    }

    if (activeTab === "automation") {
      return `Automation plan: ${message}${filesNote}`;
    }
    return `Response: ${message}${filesNote}`;
  };

  const extractMentionedApps = useCallback(
    (text: string) => {
      const lowerText = text.toLowerCase();
      return appNames.filter((app) => {
        const escaped = app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").toLowerCase();
        const pattern = new RegExp(`(^|\\s)@${escaped}(?=\\s|$)`, "i");
        return pattern.test(lowerText);
      });
    },
    [appNames]
  );

  useEffect(() => {
    const nextApps = extractMentionedApps(value);
    setConnectedApps((prev) => {
      if (
        prev.length === nextApps.length &&
        prev.every((app, index) => app === nextApps[index])
      ) {
        return prev;
      }
      return nextApps;
    });
  }, [extractMentionedApps, value]);

  const updateCommandMenuFromInput = (nextValue: string, cursorPosition: number) => {
    const prefix = nextValue.slice(0, cursorPosition);
    const match = prefix.match(/(?:^|\s)([/@])([^\s/@]*)$/);

    if (!match) {
      setCommandMenu(null);
      return;
    }

    const trigger = match[1];
    const token = match[0];
    const hasLeadingSpace = token.startsWith(" ");
    const start = cursorPosition - token.length + (hasLeadingSpace ? 1 : 0);

    setCommandMenu({
      type: trigger === "/" ? "skill" : "app",
      query: match[2] ?? "",
      start,
      end: cursorPosition,
    });
    setHighlightedCommandIndex(0);
  };

  const selectCommandItem = (item: string) => {
    if (!commandMenu) return;

    const prefix = commandMenu.type === "skill" ? "/" : "@";
    const replacement = `${prefix}${item} `;
    const nextValue =
      value.slice(0, commandMenu.start) + replacement + value.slice(commandMenu.end);

    setValue(nextValue);
    setCommandMenu(null);
    setHighlightedCommandIndex(0);

    if (commandMenu.type === "skill") {
      setSelectedSkill(item);
    }

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const nextCursor = commandMenu.start + replacement.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      adjustHeight();
    });
  };

  const applyMentionAutoSpace = (
    inputValue: string,
    cursorPosition: number
  ): { nextValue: string; nextCursor: number } => {
    const beforeCursor = inputValue.slice(0, cursorPosition);
    const afterCursor = inputValue.slice(cursorPosition);

    if (afterCursor.startsWith(" ") || afterCursor.startsWith("\n")) {
      return { nextValue: inputValue, nextCursor: cursorPosition };
    }

    const mentionTokens = [
      ...appNames.map((app) => `@${app}`),
      ...mentionableSkills.map((skill) => `/${skill}`),
    ].sort((a, b) => b.length - a.length);

    const lowerBefore = beforeCursor.toLowerCase();

    for (const token of mentionTokens) {
      const lowerToken = token.toLowerCase();
      if (!lowerBefore.endsWith(lowerToken)) continue;

      const tokenStart = beforeCursor.length - token.length;
      const charBeforeToken = tokenStart > 0 ? beforeCursor[tokenStart - 1] : "";
      if (tokenStart > 0 && !/\s/.test(charBeforeToken)) {
        continue;
      }

      const nextValue = `${beforeCursor} ${afterCursor}`;
      return { nextValue, nextCursor: cursorPosition + 1 };
    }

    return { nextValue: inputValue, nextCursor: cursorPosition };
  };

  const normalizeMentionSpacing = (
    inputValue: string,
    cursorPosition: number
  ): { nextValue: string; nextCursor: number } => {
    const escapedApps = appNames.map((app) => app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort(
      (a, b) => b.length - a.length
    );
    const escapedSkills = mentionableSkills
      .map((skill) => skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length);

    if (escapedApps.length === 0 && escapedSkills.length === 0) {
      return { nextValue: inputValue, nextCursor: cursorPosition };
    }

    const mentionParts: string[] = [];
    if (escapedApps.length > 0) {
      mentionParts.push(`@(?:${escapedApps.join("|")})`);
    }
    if (escapedSkills.length > 0) {
      mentionParts.push(`\\/(?:${escapedSkills.join("|")})`);
    }

    if (mentionParts.length === 0) {
      return { nextValue: inputValue, nextCursor: cursorPosition };
    }

    const mentionRegex = new RegExp(`(^|\\s)(${mentionParts.join("|")})(?=\\S|$)`, "gi");

    let cursorDelta = 0;
    const nextValue = inputValue.replace(
      mentionRegex,
      (fullMatch, leadingSpace = "", mentionToken = "", offset = 0) => {
        const insertionPoint = Number(offset) + String(leadingSpace).length + String(mentionToken).length;
        if (insertionPoint <= cursorPosition) {
          cursorDelta += 1;
        }
        return `${leadingSpace}${mentionToken} `;
      }
    );

    if (nextValue === inputValue) {
      return { nextValue: inputValue, nextCursor: cursorPosition };
    }

    return {
      nextValue,
      nextCursor: cursorPosition + cursorDelta,
    };
  };

  const getMentionRanges = (inputValue: string): Array<{ start: number; end: number }> => {
    const escapedApps = appNames.map((app) => app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort(
      (a, b) => b.length - a.length
    );
    const escapedSkills = mentionableSkills
      .map((skill) => skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length);
    const mentionRegex = new RegExp(
      `(@(${escapedApps.join("|")})|\\/(${escapedSkills.join("|")}))(?=\\s|$|[.,!?;:])`,
      "gi"
    );

    const ranges: Array<{ start: number; end: number }> = [];
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(inputValue)) !== null) {
      const mention = match[0] ?? "";
      ranges.push({
        start: match.index,
        end: match.index + mention.length,
      });
    }

    return ranges;
  };

  const removeWholeMentionAtCursor = (
    inputValue: string,
    cursorPosition: number,
    key: "Backspace" | "Delete"
  ): { nextValue: string; nextCursor: number } | null => {
    const ranges = getMentionRanges(inputValue);

    for (const range of ranges) {
      const isBackspace = key === "Backspace";
      const isInsideMention = cursorPosition > range.start && cursorPosition < range.end;
      const isAtMentionEdge = isBackspace
        ? cursorPosition === range.end
        : cursorPosition === range.start;
      const isBackspaceAfterMentionSpace =
        isBackspace &&
        cursorPosition === range.end + 1 &&
        inputValue[range.end] === " ";

      if (!(isInsideMention || isAtMentionEdge || isBackspaceAfterMentionSpace)) {
        continue;
      }

      const removeStart = range.start;
      let removeEnd = range.end;

      if (isBackspaceAfterMentionSpace || inputValue[removeEnd] === " ") {
        removeEnd += 1;
      }

      if (
        removeStart > 0 &&
        inputValue[removeStart - 1] === " " &&
        removeEnd < inputValue.length &&
        inputValue[removeEnd] === " "
      ) {
        removeEnd += 1;
      }

      return {
        nextValue: inputValue.slice(0, removeStart) + inputValue.slice(removeEnd),
        nextCursor: removeStart,
      };
    }

    return null;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const rawValue = e.target.value;
    const rawCursor = e.target.selectionStart ?? rawValue.length;
    const nativeInput = e.nativeEvent as InputEvent | undefined;
    const isDeleteAction = nativeInput?.inputType?.startsWith("delete") ?? false;
    const { nextValue, nextCursor } = isDeleteAction
      ? { nextValue: rawValue, nextCursor: rawCursor }
      : applyMentionAutoSpace(rawValue, rawCursor);
    const normalizedSpacing = isDeleteAction
      ? { nextValue, nextCursor }
      : normalizeMentionSpacing(nextValue, nextCursor);
    const spacedValue = normalizedSpacing.nextValue;
    const spacedCursor = normalizedSpacing.nextCursor;

    let guardedValue = spacedValue;
    let guardedCursor = spacedCursor;
    if (lockedComposerPrefix) {
      const withoutLockedPrefix = guardedValue.replace(
        new RegExp(
          `^\\s*\\/${fixedSkillName?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") ?? ""}\\s*`,
          "i"
        ),
        ""
      );
      guardedValue = `${lockedComposerPrefix}${withoutLockedPrefix.replace(/^\s+/, "")}`;
      guardedCursor = Math.max(guardedCursor, lockedComposerPrefix.length);
    }

    setValue(guardedValue);
    adjustHeight();
    updateCommandMenuFromInput(guardedValue, guardedCursor);

    if (guardedValue !== rawValue || guardedCursor !== rawCursor) {
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        textareaRef.current.setSelectionRange(guardedCursor, guardedCursor);
      });
    }
  };

  const handleComposerScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    setComposerScrollTop(e.currentTarget.scrollTop);
  };

  const handleComposerSelection = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    if (!lockedComposerPrefix) return;
    const target = e.currentTarget;
    const start = target.selectionStart ?? 0;
    const end = target.selectionEnd ?? start;
    if (start >= lockedComposerPrefix.length && end >= lockedComposerPrefix.length) {
      return;
    }

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.setSelectionRange(
        lockedComposerPrefix.length,
        lockedComposerPrefix.length
      );
    });
  };

  const insertAppMention = (app: string) => {
    const mention = `@${app} `;
    const nextValue = value.length === 0
      ? mention
      : `${value}${value.endsWith(" ") ? "" : " "}${mention}`;

    setValue(nextValue);
    setCommandMenu(null);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const nextCursor = nextValue.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      adjustHeight();
    });
  };

  const removeConnectedApp = (app: string) => {
    setValue((prev) => {
      const escapedApp = app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const appMentionPattern = new RegExp(`(^|\\s)@${escapedApp}(?=\\s|$)`, "g");

      return prev
        .replace(appMentionPattern, "$1")
        .replace(/[ \t]{2,}/g, " ")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n[ \t]+/g, "\n")
        .trim();
    });
    setCommandMenu(null);
    requestAnimationFrame(() => {
      adjustHeight();
    });
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setAttachedFiles((prev) => {
      const next = [...prev];
      for (const file of Array.from(files)) {
        const isDuplicate = next.some(
          (existing) =>
            existing.file &&
            existing.file.name === file.name &&
            existing.file.size === file.size &&
            existing.file.lastModified === file.lastModified
        );
        if (!isDuplicate) {
          const kind = getAttachmentKind(file.name, file.type);
          next.push({
            id: `${file.name}-${file.size}-${file.lastModified}-${crypto.randomUUID()}`,
            name: file.name,
            kind,
            previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
            file,
          });
        }
      }
      return next;
    });

    e.target.value = "";
  };

  const openFilePicker = () => {
    const input = fileInputRef.current;
    if (!input) return;

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // Fall back to click in browsers that block showPicker.
    }

    input.click();
  };

  const removeAttachedFile = (attachmentId: string) => {
    setAttachedFiles((prev) =>
      prev.filter((attachment) => attachment.id !== attachmentId)
    );
  };

  const toChatTitle = (content: string) => {
    const normalized = content.replace(/\s+/g, " ").trim();
    if (!normalized) return "New chat";
    return normalized.length > 56 ? `${normalized.slice(0, 56)}...` : normalized;
  };

  const persistActiveChat = (content: string) => {
    if (
      !activeChatTitleRef.current ||
      activeChatTitleRef.current === "New chat"
    ) {
      activeChatTitleRef.current = toChatTitle(content);
    }
  };

  const streamReply = useCallback(async (
    chatId: string,
    userContent: string,
    attachments: MessageAttachment[] = []
  ) => {
    const assistantMsgId = createClientMessageId();
    setMessages((prev) => [
      ...prev,
      { id: assistantMsgId, role: "assistant", content: "" },
    ]);

    try {
      const resp = await apiFetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: userContent, attachments }),
      });

      if (!resp.ok || !resp.body) {
        const payload = (await resp.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        throw new Error(payload?.error?.message ?? "Failed to generate a response.");
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const chunk = JSON.parse(raw) as { content?: string };
            if (chunk.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMsgId
                    ? { ...m, content: m.content + chunk.content! }
                    : m
                )
              );
            }
          } catch {
            // ignore malformed SSE line
          }
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Something went wrong. Please try again.";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: message }
            : m
        )
      );
    } finally {
      setIsResponding(false);
    }
  }, [apiFetch, createClientMessageId]);

  const uploadMessageAttachments = useCallback(
    async (attachments: AttachmentDraft[]) => {
      const uploaded: MessageAttachment[] = [];

      for (const attachment of attachments) {
        if (!attachment.file) {
          uploaded.push(attachment);
          continue;
        }

        const formData = new FormData();
        formData.append("file", attachment.file);

        const response = await apiFetch("/api/files", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json().catch(() => null)) as
          | { data?: { file?: UploadedFilePayload }; error?: { message?: string } }
          | null;

        if (!response.ok || !payload?.data?.file) {
          throw new Error(payload?.error?.message ?? `Failed to upload ${attachment.name}.`);
        }

        uploaded.push({
          id: attachment.id,
          fileId: payload.data.file.id,
          name: payload.data.file.name,
          kind: attachment.kind,
          previewUrl: attachment.previewUrl,
        });
      }

      return uploaded;
    },
    [apiFetch]
  );

  const createAgentFromChat = useCallback(async (sourceMessageId: number) => {
    const chatId = activeChatIdRef.current ?? resolvedChatId;
    if (!chatId || chatId.startsWith("local-") || chatId.startsWith("workflow-node-chat-")) {
      setCreateAgentError("Create a saved chat before creating an agent.");
      return;
    }

    const transcript = messagesRef.current
      .filter(
        (message) =>
          (message.role === "user" || message.role === "assistant") &&
          message.content.trim().length > 0
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    if (transcript.length === 0) {
      setCreateAgentError("This chat does not have enough content to create an agent.");
      return;
    }

    setCreateAgentError(null);
    setCreatingAgentMessageId(sourceMessageId);

    try {
      const response = await apiFetch(`/api/chats/${chatId}/agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceMessageId,
          messages: transcript,
        }),
      });
      const payload = (await response.json()) as {
        data?: { automation?: { id: string } };
        error?: { message?: string };
      };

      const automationId = payload.data?.automation?.id;
      if (!response.ok || !automationId) {
        throw new Error(payload.error?.message ?? "Failed to create agent.");
      }

      router.push(`/workflow/${automationId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to create agent.";
      setCreateAgentError(message);
    } finally {
      setCreatingAgentMessageId(null);
    }
  }, [apiFetch, resolvedChatId, router]);

  const openAgentSetupFromPlan = useCallback(
    (message: ChatMessage) => {
      if (!isTelegramMentioned) {
        void createAgentFromChat(message.id);
        return;
      }

      setCreateAgentError(null);
      setTelegramAgentError(null);
      setTelegramAgentSuccess(null);
      setAgentSetupMessageId(message.id);
      setTelegramAgentInstructions(
        draftTelegramAgentInstructions(message.content, messagesRef.current)
      );

      if (activeChatTitleRef.current && activeChatTitleRef.current !== "New chat") {
        setTelegramAgentName(activeChatTitleRef.current);
      }

      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
      });
    },
    [createAgentFromChat, isTelegramMentioned]
  );

  const createTelegramAgentFromChat = useCallback(async () => {
    const currentChatId = activeChatIdRef.current ?? resolvedChatId;
    if (
      !currentChatId ||
      currentChatId.startsWith("local-") ||
      currentChatId.startsWith("workflow-node-chat-")
    ) {
      setTelegramAgentError("Start a saved chat before creating a Telegram agent.");
      return;
    }

    if (!telegramIntegration?.connected) {
      setTelegramAgentError("Connect Telegram first, then create the agent.");
      return;
    }

    if (!selectedTelegramConnectionId) {
      setTelegramAgentError("Choose the Telegram bot for this agent.");
      return;
    }

    if (telegramAgentMode === "agent_api" && !telegramAgentApiUrl.trim()) {
      setTelegramAgentError("Add the Agent API URL or choose Atmet model.");
      return;
    }

    setTelegramAgentError(null);
    setTelegramAgentSuccess(null);
    setIsCreatingTelegramAgent(true);

    try {
      const response = await apiFetch(`/api/chats/${currentChatId}/telegram-agent`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: telegramAgentName.trim() || "Telegram support agent",
          instructions: telegramAgentInstructions,
          modelMode: telegramAgentMode,
          agentApiUrl: telegramAgentMode === "agent_api" ? telegramAgentApiUrl.trim() : "",
          autoReply: true,
          workspaceIntegrationId: selectedTelegramConnectionId,
        }),
      });
      const payload = (await response.json()) as {
        data?: {
          automation?: { id: string };
          webhookConfigured?: boolean;
          webhookUrl?: string;
        };
        error?: { message?: string };
      };

      if (!response.ok || !payload.data?.automation?.id) {
        throw new Error(payload.error?.message ?? "Failed to create Telegram agent.");
      }

      setTelegramAgentSuccess(
        payload.data.webhookConfigured
          ? "Telegram agent is live."
          : `Telegram agent created. Webhook: ${payload.data.webhookUrl ?? "open the agent to finish setup."}`
      );
      router.push(`/workflow/${payload.data.automation.id}`);
    } catch (error) {
      setTelegramAgentError(
        error instanceof Error ? error.message : "Failed to create Telegram agent."
      );
    } finally {
      setIsCreatingTelegramAgent(false);
    }
  }, [
    apiFetch,
    resolvedChatId,
    router,
    selectedTelegramConnectionId,
    telegramAgentApiUrl,
    telegramAgentInstructions,
    telegramAgentMode,
    telegramAgentName,
    telegramIntegration?.connected,
  ]);

  const sendMessage = useCallback(async () => {
    const content = value.trim();
    const submittedContent = content || (attachedFiles.length > 0 ? "Attached file(s)" : "");
    const hasUserTextBeyondLockedPrefix = lockedComposerPrefix
      ? value.slice(lockedComposerPrefix.length).trim().length > 0
      : content.length > 0;
    if (!hasUserTextBeyondLockedPrefix && attachedFiles.length === 0) return;
    const attachmentsToUpload = attachedFiles;
    const attachmentData: MessageAttachment[] = attachedFiles.map(({ id, name, kind, previewUrl }) => ({
      id,
      name,
      kind,
      previewUrl,
    }));

    onConversationStart?.();
    if (persistChatListEntry) {
      persistActiveChat(submittedContent);
    }
    if (activeTab === "automation") {
      onAutomationConversationStart?.();
    }
    setCommandMenu(null);

    if (editingMessageId !== null) {
      const targetMessageId = editingMessageId;

      setMessages((prev) => {
        const editIndex = prev.findIndex(
          (message) => message.id === targetMessageId && message.role === "user"
        );

        if (editIndex === -1) {
          return [
            ...prev,
            { id: createClientMessageId(), role: "user", content: submittedContent, attachments: attachmentData },
          ];
        }

        const updated = [...prev];
        updated[editIndex] = { ...updated[editIndex], content: submittedContent, attachments: attachmentData };
        return updated.slice(0, editIndex + 1);
      });

      setValue(lockedComposerPrefix);
      setComposerScrollTop(0);
      setAttachedFiles([]);
      adjustHeight(true);
      setEditingMessageId(null);
      setIsResponding(true);
      await streamReply(activeChatIdRef.current ?? `local-${createClientMessageId()}`, submittedContent, attachmentData);
      return;
    }

    const userMessageId = createClientMessageId();
    setMessages((prev) => [
      ...prev,
      { id: userMessageId, role: "user", content: submittedContent, attachments: attachmentData },
    ]);
    setValue(lockedComposerPrefix);
    setComposerScrollTop(0);
    setAttachedFiles([]);
    adjustHeight(true);
    setIsResponding(true);

    // Create chat in DB if this is the first message
    let chatId = activeChatIdRef.current;
    if (!chatId) {
      try {
        const chatTitle = toChatTitle(submittedContent);
        const r = await apiFetch("/api/chats", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: chatTitle }),
        });
        if (r.ok) {
          const payload = (await r.json()) as { data?: { chat?: { id: string } } };
          chatId = payload.data?.chat?.id ?? null;
          if (chatId) {
            activeChatIdRef.current = chatId;
            setResolvedChatId(chatId);
            activeChatTitleRef.current = chatTitle;
            if (typeof window !== "undefined" && window.location.pathname === "/ai-core") {
              window.history.replaceState(null, "", `/ai-core?chat=${chatId}`);
            }
            window.dispatchEvent(new CustomEvent(AI_CORE_CHATS_UPDATED_EVENT));
          }
        } else {
          const payload = (await r.json().catch(() => null)) as {
            error?: { message?: string };
          } | null;
          throw new Error(payload?.error?.message ?? "Failed to create chat.");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to create chat.";
        setMessages((prev) => [
          ...prev,
          { id: createClientMessageId(), role: "assistant", content: message },
        ]);
        setIsResponding(false);
        return;
      }
    }

    if (!chatId) {
      setMessages((prev) => [
        ...prev,
        { id: createClientMessageId(), role: "assistant", content: "Failed to create chat. Please try again." },
      ]);
      setIsResponding(false);
      return;
    }

    let savedAttachments = attachmentData;
    if (attachmentsToUpload.length > 0) {
      try {
        savedAttachments = await uploadMessageAttachments(attachmentsToUpload);
        setMessages((prev) =>
          prev.map((message) =>
            message.id === userMessageId
              ? { ...message, attachments: savedAttachments }
              : message
          )
        );
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to upload file.";
        setMessages((prev) => [
          ...prev,
          { id: createClientMessageId(), role: "assistant", content: message },
        ]);
        setIsResponding(false);
        return;
      }
    }

    await streamReply(chatId, submittedContent, savedAttachments);
  }, [
    value, lockedComposerPrefix, attachedFiles, onConversationStart, persistChatListEntry,
    persistActiveChat, activeTab, onAutomationConversationStart, editingMessageId,
    adjustHeight, streamReply, apiFetch, toChatTitle, createClientMessageId, uploadMessageAttachments,
  ]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // no-op
    }
  };

  const copyWithFeedback = async (text: string, copyKey: string) => {
    await copyToClipboard(text);

    setCopiedStates((prev) => ({
      ...prev,
      [copyKey]: true,
    }));

    const existingTimer = copyTimersRef.current[copyKey];
    if (existingTimer) clearTimeout(existingTimer);

    copyTimersRef.current[copyKey] = window.setTimeout(() => {
      setCopiedStates((prev) => {
        const next = { ...prev };
        delete next[copyKey];
        return next;
      });
      delete copyTimersRef.current[copyKey];
    }, 2000);
  };

  const renderCopyIcon = (copyKey: string, sizeClass = "h-3.5 w-3.5") => (
    <AnimatePresence mode="wait" initial={false}>
      {copiedStates[copyKey] ? (
        <motion.span
          key="copied"
          initial={{ opacity: 0, scale: 0.8, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -2 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex"
        >
          <Check className={sizeClass} />
        </motion.span>
      ) : (
        <motion.span
          key="copy"
          initial={{ opacity: 0, scale: 0.8, y: 2 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -2 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
          className="inline-flex"
        >
          <Copy className={sizeClass} />
        </motion.span>
      )}
    </AnimatePresence>
  );

  const outputActionButtonBase =
    "inline-flex h-7 w-7 items-center justify-center rounded-md p-0 leading-none transition-colors";

  const getCodeFileExtension = (language: string) => {
    const lower = language.trim().toLowerCase();
    if (["js", "javascript"].includes(lower)) return "js";
    if (["ts", "typescript"].includes(lower)) return "ts";
    if (["py", "python"].includes(lower)) return "py";
    if (["sh", "bash", "shell"].includes(lower)) return "sh";
    if (["sql"].includes(lower)) return "sql";
    return "txt";
  };

  const downloadCodeBlock = (language: string, code: string, messageId: number, index: number) => {
    const ext = getCodeFileExtension(language);
    const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `artifact-${messageId}-${index}.${ext}`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  const runCodeBlock = (language: string, code: string, key: string) => {
    const lower = language.trim().toLowerCase();
    const executable = lower === "" || ["js", "javascript", "ts", "typescript"].includes(lower);

    if (!executable) {
      setCodeRunOutput((prev) => ({
        ...prev,
        [key]: {
          status: "info",
          output: "Run preview currently supports JavaScript/TypeScript blocks.",
        },
      }));
      return;
    }

    const logs: string[] = [];
    const sandboxConsole = {
      log: (...args: unknown[]) => {
        logs.push(
          args
            .map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg)))
            .join(" ")
        );
      },
    };

    try {
      // Demo-only local runner for simple snippets.
      const fn = new Function("console", code);
      fn(sandboxConsole);

      setCodeRunOutput((prev) => ({
        ...prev,
        [key]: {
          status: "success",
          output:
            logs.length > 0
              ? logs.join("\n")
              : "Code executed successfully (no output).",
        },
      }));
    } catch (error) {
      setCodeRunOutput((prev) => ({
        ...prev,
        [key]: {
          status: "error",
          output:
            error instanceof Error
              ? error.message
              : "Failed to run this code block.",
        },
      }));
    }
  };

  const parseAssistantContent = (content: string): AssistantContentSegment[] => {
    const segments: AssistantContentSegment[] = [];
    const openFenceRegex = /`{2,}([a-zA-Z0-9_+-]*)\n?/g;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = openFenceRegex.exec(content)) !== null) {
      const fullMatch = match[0] ?? "";
      const fenceMatch = fullMatch.match(/^`{2,}/);
      const fence = fenceMatch?.[0] ?? "```";
      const codeStart = openFenceRegex.lastIndex;
      const closeIndex = content.indexOf(fence, codeStart);

      if (match.index > lastIndex) {
        segments.push({
          type: "text",
          value: content.slice(lastIndex, match.index),
        });
      }

      const language = (match[1] ?? "").trim();

      if (closeIndex === -1) {
        const code = content.slice(codeStart).replace(/\n$/, "");
        if (code.trim().length > 0) {
          segments.push({
            type: "code",
            language,
            value: code,
          });
        }
        lastIndex = content.length;
        break;
      }

      const code = content.slice(codeStart, closeIndex).replace(/\n$/, "");
      segments.push({
        type: "code",
        language,
        value: code,
      });

      lastIndex = closeIndex + fence.length;
      openFenceRegex.lastIndex = lastIndex;
    }

    if (lastIndex < content.length) {
      segments.push({
        type: "text",
        value: content.slice(lastIndex),
      });
    }

    return segments.length > 0 ? segments : [{ type: "text", value: content }];
  };

  const renderTextWithAppMentions = (
    content: string,
    keyPrefix: string,
    options?: {
      badgeClassName?: string;
      showLogo?: boolean;
      plainInline?: boolean;
      preserveComposerCaret?: boolean;
      lockedSkillName?: string | null;
    }
  ) => {
    const useInlineMentionStyle = options?.plainInline ?? true;
    const preserveComposerCaret = options?.preserveComposerCaret ?? false;
    const escapedApps = appNames.map((app) => app.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).sort(
      (a, b) => b.length - a.length
    );
    const escapedSkills = mentionableSkills
      .map((skill) => skill.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
      .sort((a, b) => b.length - a.length);
    const mentionRegex = new RegExp(
      `(@(${escapedApps.join("|")})|\\/(${escapedSkills.join("|")}))(?=\\s|$|[.,!?;:])`,
      "gi"
    );
    const appByLower = new Map(appNames.map((app) => [app.toLowerCase(), app]));
    const skillByLower = new Map(
      mentionableSkills.map((skill) => [skill.toLowerCase(), skill])
    );
    const nodes: React.ReactNode[] = [];
    let cursor = 0;
    let mentionIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = mentionRegex.exec(content)) !== null) {
      const fullMatch = match[0] ?? "";
      const appRaw = match[2] ?? "";
      const skillRaw = match[3] ?? "";
      const appName = appRaw ? appByLower.get(appRaw.toLowerCase()) ?? appRaw : "";
      const skillName = skillRaw
        ? skillByLower.get(skillRaw.toLowerCase()) ?? skillRaw
        : "";
      const isSkillMention = skillName.length > 0;
      const isLockedSkillMention =
        isSkillMention &&
        !!options?.lockedSkillName &&
        skillName.toLowerCase() === options.lockedSkillName.toLowerCase();
      const start = match.index;
      const end = start + fullMatch.length;

      if (start > cursor) {
        nodes.push(content.slice(cursor, start));
      }

      if (useInlineMentionStyle) {
        if (preserveComposerCaret) {
          nodes.push(
            <span
              key={`${keyPrefix}-mention-${mentionIndex}`}
              className={cn(
                isSkillMention
                  ? isLockedSkillMention
                    ? "relative inline whitespace-nowrap align-baseline text-violet-600 font-normal leading-[inherit] tracking-normal dark:text-violet-300"
                    : "relative inline whitespace-nowrap align-baseline text-pink-600 font-normal leading-[inherit] tracking-normal dark:text-pink-300"
                  : "relative inline whitespace-nowrap align-baseline text-[#01a4f3] font-normal leading-[inherit] tracking-normal",
                options?.badgeClassName
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute -inset-x-[0.2em] -inset-y-[0.1em] rounded-[min(var(--radius-sm),8px)]",
                  isSkillMention
                    ? isLockedSkillMention
                      ? "bg-violet-500/14 dark:bg-violet-400/16"
                      : "bg-pink-500/12 dark:bg-pink-400/14"
                    : "bg-[#01a4f3]/12 dark:bg-[#01a4f3]/16"
                )}
              />
              <span className="relative z-[1]">
                {isSkillMention ? (
                  <span>/{skillName}</span>
                ) : (
                  <>
                    <span className="relative inline-block align-baseline">
                      <span className="opacity-0">@</span>
                      <span className="pointer-events-none absolute inset-y-0 -left-[0.04em] inline-flex items-center [transform:translateY(0.01em)_scale(1.06)]">
                        {renderAppLogo(appName, "mention")}
                      </span>
                    </span>
                    <span>{appName}</span>
                  </>
                )}
              </span>
            </span>
          );
        } else {
          if (isSkillMention) {
            nodes.push(
              <span
                key={`${keyPrefix}-mention-${mentionIndex}`}
                className={cn(
                  isLockedSkillMention
                    ? "mx-[0.02em] inline-flex whitespace-nowrap items-center rounded-[min(var(--radius-sm),8px)] bg-violet-500/14 px-[0.24em] py-[0.08em] align-baseline text-violet-600 font-normal leading-[inherit] tracking-normal dark:bg-violet-400/16 dark:text-violet-300"
                    : "mx-[0.02em] inline-flex whitespace-nowrap items-center rounded-[min(var(--radius-sm),8px)] bg-pink-500/12 px-[0.24em] py-[0.08em] align-baseline text-pink-600 font-normal leading-[inherit] tracking-normal dark:bg-pink-400/14 dark:text-pink-300",
                  options?.badgeClassName
                )}
              >
                /{skillName}
              </span>
            );
          } else {
            nodes.push(
                <span
                  key={`${keyPrefix}-mention-${mentionIndex}`}
                  className={cn(
                    "mx-[0.02em] inline-flex whitespace-nowrap items-center gap-[0.24em] rounded-[min(var(--radius-sm),8px)] bg-[#01a4f3]/12 px-[0.24em] py-[0.08em] align-baseline text-[#01a4f3] font-normal leading-[inherit] tracking-normal dark:bg-[#01a4f3]/16",
                    options?.badgeClassName
                  )}
                >
                {renderAppLogo(appName, "mention")}
                <span>{appName}</span>
              </span>
            );
          }
        }
      } else {
        nodes.push(
          <span
            key={`${keyPrefix}-mention-${mentionIndex}`}
            className={cn(
              isSkillMention
                ? isLockedSkillMention
                  ? "mx-0.5 inline-flex items-center rounded-[min(var(--radius-sm),8px)] bg-violet-500/14 px-1.5 py-0.5 align-middle text-violet-600 dark:bg-violet-400/16 dark:text-violet-300"
                  : "mx-0.5 inline-flex items-center rounded-[min(var(--radius-sm),8px)] bg-pink-500/12 px-1.5 py-0.5 align-middle text-pink-600 dark:bg-pink-400/14 dark:text-pink-300"
                : "mx-0.5 inline-flex items-center rounded-[min(var(--radius-sm),8px)] bg-[#01a4f3]/12 px-1.5 py-0.5 align-middle text-[#01a4f3] dark:bg-[#01a4f3]/16",
              options?.badgeClassName
            )}
          >
            {!isSkillMention && options?.showLogo !== false ? (
              <span className="mr-1 inline-flex translate-y-[0.02em] align-middle">
                {renderAppLogo(appName)}
              </span>
            ) : null}
            <span>{isSkillMention ? `/${skillName}` : appName}</span>
          </span>
        );
      }

      mentionIndex += 1;
      cursor = end;
    }

    if (cursor < content.length) {
      nodes.push(content.slice(cursor));
    }

    return nodes.length > 0 ? nodes : content;
  };

  const renderComposerValue = () => {
    const hasOnlyLockedPrefix =
      !!lockedComposerPrefix &&
      value.startsWith(lockedComposerPrefix) &&
      value.slice(lockedComposerPrefix.length).length === 0;

    if (!value || hasOnlyLockedPrefix) {
      return (
        <>
          {lockedComposerPrefix ? (
            <span className="mr-[0.08em] inline-flex whitespace-nowrap items-center rounded-[min(var(--radius-sm),8px)] bg-violet-500/14 px-[0.24em] py-[0.08em] align-baseline text-violet-600 font-normal leading-[inherit] tracking-normal dark:bg-violet-400/16 dark:text-violet-300">
              {lockedComposerPrefix.trim()}
            </span>
          ) : null}
          <span className="ml-[0.28em] text-muted-foreground">
            Use / to add a skill or @ to connect an app.
          </span>
        </>
      );
    }

    const displayValue = value.endsWith("\n") ? `${value}\u200b` : value;

    return renderTextWithAppMentions(displayValue, "composer-inline", {
      badgeClassName: "",
      showLogo: false,
      plainInline: true,
      preserveComposerCaret: true,
      lockedSkillName: fixedSkillName,
    });
  };

  const renderAssistantContent = (content: string, messageId: number) => {
    const segments = parseAssistantContent(content);
    const hasCodeSegment = segments.some((segment) => segment.type === "code");

    if (!hasCodeSegment) {
      return (
        <p className="min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-0.5 py-1 text-sm text-foreground">
          {renderTextWithAppMentions(content, `assistant-inline-${messageId}`)}
        </p>
      );
    }

    return (
      <div className="w-full space-y-2">
        {segments.map((segment, index) => {
          if (segment.type === "text") {
            if (segment.value.trim().length === 0) return null;

            return (
              <p
                key={`assistant-text-${messageId}-${index}`}
                className="min-w-0 max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere] px-0.5 py-1 text-sm text-foreground"
              >
                {renderTextWithAppMentions(
                  segment.value,
                  `assistant-segment-${messageId}-${index}`
                )}
              </p>
            );
          }

          return (
            <Artifact key={`assistant-code-${messageId}-${index}`} className="w-full max-w-3xl">
              <ArtifactHeader>
                <div className="min-w-0">
                  <ArtifactTitle>
                    {segment.language ? `${segment.language} script` : "Code script"}
                  </ArtifactTitle>
                  <ArtifactDescription>Runnable code block</ArtifactDescription>
                </div>
                <ArtifactActions>
                  {(() => {
                    const artifactCopyKey = `artifact-copy-${messageId}-${index}`;
                    return (
                      <>
                  <ArtifactAction
                    icon={Play}
                    tooltip="Run code"
                    onClick={() =>
                      runCodeBlock(
                        segment.language,
                        segment.value,
                        `${messageId}-${index}`
                      )
                    }
                  />
                  <ArtifactAction
                    tooltip="Copy code"
                    onClick={() => copyWithFeedback(segment.value, artifactCopyKey)}
                  >
                    {renderCopyIcon(artifactCopyKey, "h-4 w-4")}
                  </ArtifactAction>
                  <ArtifactAction
                    icon={Download}
                    tooltip="Download code"
                    onClick={() =>
                      downloadCodeBlock(
                        segment.language,
                        segment.value,
                        messageId,
                        index
                      )
                    }
                  />
                      </>
                    );
                  })()}
                </ArtifactActions>
              </ArtifactHeader>
              <ArtifactContent className="p-0">
                <pre className="max-h-80 overflow-auto bg-muted/30 p-3 text-xs leading-5 text-foreground">
                  <code>{segment.value}</code>
                </pre>
                {codeRunOutput[`${messageId}-${index}`] && (
                  <div
                    className={cn(
                      "border-t px-3 py-2 text-xs whitespace-pre-wrap",
                      codeRunOutput[`${messageId}-${index}`].status === "error"
                        ? "border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-300"
                        : "border-border bg-background/60 text-muted-foreground"
                    )}
                  >
                    {codeRunOutput[`${messageId}-${index}`].output}
                  </div>
                )}
              </ArtifactContent>
            </Artifact>
          );
        })}
      </div>
    );
  };

  const editUserMessage = (messageId: number, content: string) => {
    const messageToEdit = messages.find(
      (message) => message.id === messageId && message.role === "user"
    );
    const messageAttachments = messageToEdit?.attachments ?? [];

    setEditingMessageId(messageId);
    setValue(content);
    setAttachedFiles(
      messageAttachments.map((attachment) => ({
        id: attachment.id,
        name: attachment.name,
        kind: attachment.kind,
        previewUrl: attachment.previewUrl,
      }))
    );
    setCommandMenu(null);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      const end = content.length;
      textareaRef.current.setSelectionRange(end, end);
      adjustHeight();
    });
  };

  const cancelEditingMessage = () => {
    setEditingMessageId(null);
    setValue(lockedComposerPrefix);
    setComposerScrollTop(0);
    setAttachedFiles([]);
    setCommandMenu(null);

    requestAnimationFrame(() => {
      adjustHeight(true);
      textareaRef.current?.focus();
    });
  };

  const setAssistantReaction = (
    messageId: number,
    reaction: "like" | "dislike"
  ) => {
    setAssistantFeedback((prev) => {
      if (prev[messageId] === reaction) {
        const next = { ...prev };
        delete next[messageId];
        return next;
      }

      return { ...prev, [messageId]: reaction };
    });
  };

  const retryAssistantMessage = useCallback(async (assistantMessageId: number) => {
    const currentMessages = messagesRef.current;
    const assistantIndex = currentMessages.findIndex(
      (message) => message.id === assistantMessageId && message.role === "assistant"
    );
    if (assistantIndex === -1) return;

    const previousUserMessage = [...currentMessages]
      .slice(0, assistantIndex)
      .reverse()
      .find((message) => message.role === "user");
    if (!previousUserMessage) return;

    // Clear the assistant message content and re-stream
    setMessages((prev) =>
      prev.map((m) => (m.id === assistantMessageId ? { ...m, content: "" } : m))
    );
    setIsResponding(true);

    const chatId = activeChatIdRef.current;
    if (!chatId) {
      setIsResponding(false);
      return;
    }

    try {
      const resp = await apiFetch(`/api/chats/${chatId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: previousUserMessage.content }),
      });

      if (!resp.ok || !resp.body) throw new Error("retry_failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (raw === "[DONE]") break;
          try {
            const chunk = JSON.parse(raw) as { content?: string };
            if (chunk.content) {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantMessageId
                    ? { ...m, content: m.content + chunk.content! }
                    : m
                )
              );
            }
          } catch { /* ignore */ }
        }
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMessageId
            ? { ...m, content: "Something went wrong. Please try again." }
            : m
        )
      );
    } finally {
      setIsResponding(false);
    }
  }, [apiFetch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (commandMenu && commandItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedCommandIndex((prev) => (prev + 1) % commandItems.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedCommandIndex((prev) => (prev - 1 + commandItems.length) % commandItems.length);
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        selectCommandItem(commandItems[highlightedCommandIndex] ?? commandItems[0]);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setCommandMenu(null);
        return;
      }
    }

    if (
      (e.key === "Backspace" || e.key === "Delete") &&
      !e.metaKey &&
      !e.ctrlKey &&
      !e.altKey
    ) {
      const selectionStart = e.currentTarget.selectionStart ?? 0;
      const selectionEnd = e.currentTarget.selectionEnd ?? selectionStart;
      if (lockedComposerPrefix && selectionStart <= lockedComposerPrefix.length) {
        e.preventDefault();
        requestAnimationFrame(() => {
          if (!textareaRef.current) return;
          textareaRef.current.setSelectionRange(
            lockedComposerPrefix.length,
            lockedComposerPrefix.length
          );
        });
        return;
      }

      if (selectionStart === selectionEnd) {
        const removal = removeWholeMentionAtCursor(
          value,
          selectionStart,
          e.key as "Backspace" | "Delete"
        );

        if (removal) {
          e.preventDefault();
          setValue(removal.nextValue);
          setCommandMenu(null);
          setHighlightedCommandIndex(0);

          requestAnimationFrame(() => {
            if (!textareaRef.current) return;
            textareaRef.current.focus();
            textareaRef.current.setSelectionRange(removal.nextCursor, removal.nextCursor);
            adjustHeight();
          });
          return;
        }
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  };

  const hasConversation = messages.length > 0 || isResponding;
  const showTelegramAgentSetup =
    enableCreateAgent && isTelegramMentioned && agentSetupMessageId !== null;
  const showGreeting = !hideGreeting && messages.length === 0 && !isResponding;
  const lastAssistantMessageId = useMemo(() => {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message?.role === "assistant" && message.content.trim().length > 0) {
        return message.id;
      }
    }
    return null;
  }, [messages]);
  const glassLayerBack =
    "bg-background/20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/15";
  const glassLayerFront =
    "bg-background/20 backdrop-blur-xl supports-[backdrop-filter]:bg-background/10";
  const glassBorder = "border-sidebar-border";

  return (
    <div
      data-chatbot-scope="true"
      className={cn(
        "mx-auto w-full max-w-4xl py-4 [&_[data-slot=button]]:rounded-lg",
        dockComposerToBottom && "flex h-full flex-col"
      )}
    >
      <input
        id={fileInputId}
        ref={fileInputRef}
        className="sr-only"
        type="file"
        multiple
        onChange={handleFileInputChange}
      />
      <div className={cn(dockComposerToBottom && "min-h-0 flex flex-1 flex-col")}>
        {showGreeting && (
          <div className="mb-5 flex flex-col items-center text-center">
            <h2 className="text-2xl font-semibold tracking-tight text-muted-foreground">
              {heroLine1}
              {heroTypingLine === 1 && (
                <span className="ml-0.5 inline-block h-[0.95em] w-[1.5px] translate-y-[1px] animate-pulse bg-muted-foreground align-middle" />
              )}
            </h2>
          </div>
        )}
        {hasConversation ? (
          <div
            className={cn(
              glassComposer && "relative mb-0 overflow-hidden rounded-t-2xl"
            )}
          >
          {glassComposer && (
            <div
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute inset-0 rounded-t-2xl border-x border-t border-b-0",
                glassBorder,
                glassLayerBack
              )}
            />
          )}
          <div
            ref={messagesViewportRef}
            className={cn(
              "space-y-3",
              glassComposer
                ? cn(
                    "relative z-10 max-h-[32vh] min-h-[9rem] overflow-y-auto rounded-t-2xl border-x border-t border-b-0 px-3 pt-3 pb-5",
                    glassBorder,
                    glassLayerFront
                  )
                : "mb-4",
              dockComposerToBottom && "min-h-0 flex-1 overflow-y-auto pr-1"
            )}
          >
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn("flex min-w-0 max-w-full", {
                "justify-end": message.role === "user",
                "justify-start": message.role === "assistant",
              })}
            >
              <div
                className={cn(
                  "flex min-w-0 max-w-[82%] flex-col",
                  message.role === "user" ? "ml-auto items-end" : "items-start"
                )}
              >
                {message.role === "user" ? (
                  <>
                    <div className="min-w-0 max-w-full rounded-xl bg-muted px-3 py-2 text-sm text-foreground">
                      <p className="origin-center max-w-full whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                        {editingMessageId === message.id
                          ? Array.from(message.content).map((char, index) => {
                              if (char === "\n") {
                                return <br key={`br-${message.id}-${index}`} />;
                              }

                              return (
                                <motion.span
                                  key={`char-${message.id}-${index}`}
                                  className="inline-block will-change-transform"
                                  animate={{
                                    rotate: [0, -0.8, 0.8, -0.55, 0],
                                    y: [0, -0.7, 0.45, -0.3, 0],
                                    scale: [1, 1.004, 1],
                                  }}
                                  transition={{
                                    duration: 0.95 + (index % 5) * 0.08,
                                    ease: "easeInOut",
                                    repeat: Number.POSITIVE_INFINITY,
                                    delay:
                                      (message.id % 7) * 0.03 + (index % 12) * 0.02,
                                  }}
                                >
                                  {char === " " ? "\u00A0" : char}
                                </motion.span>
                              );
                            })
                          : renderTextWithAppMentions(
                              message.content,
                              `user-inline-${message.id}`
                            )}
                      </p>
                    </div>
                    {message.attachments && message.attachments.length > 0 && (
                      <div className="mt-1.5 flex w-full flex-wrap gap-2">
                        {message.attachments.map((attachment) => (
                          <div
                            key={attachment.id}
                            className="w-32 overflow-hidden rounded-md border border-border/50 bg-background/85 sm:w-36"
                          >
                            {attachment.kind === "image" && attachment.previewUrl ? (
                              <Image
                                src={attachment.previewUrl}
                                alt={attachment.name}
                                width={144}
                                height={80}
                                unoptimized
                                className="h-20 w-full object-cover"
                              />
                            ) : (
                              <div className="flex h-20 flex-col items-center justify-center gap-1 text-muted-foreground">
                                {renderAttachmentPreviewAsset(attachment)}
                                <span className="text-[10px]">
                                  {getAttachmentKindLabel(attachment.kind)}
                                </span>
                              </div>
                            )}
                            <div className="truncate border-t border-border/50 px-1.5 py-1 text-[11px] text-muted-foreground">
                              {attachment.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  renderAssistantContent(message.content, message.id)
                )}

                <div
                  className={cn("mt-1 flex items-center gap-1", {
                    "justify-end": message.role === "user",
                    "justify-start": message.role === "assistant",
                  })}
                >
                  {message.role === "user" ? (
                    <>
                      {editingMessageId === message.id ? (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                aria-label="Cancel edit"
                                onClick={cancelEditingMessage}
                                className={cn(
                                  outputActionButtonBase,
                                  "text-red-500 hover:bg-red-500/10 hover:text-red-600"
                                )}
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                            }
                          />
                          <TooltipContent className="px-2 py-1 text-[10px] leading-none">
                            Cancel edit
                          </TooltipContent>
                        </Tooltip>
                      ) : (
                        <Tooltip>
                          <TooltipTrigger
                            render={
                              <button
                                type="button"
                                aria-label="Edit message"
                                onClick={() => editUserMessage(message.id, message.content)}
                                className={cn(
                                  outputActionButtonBase,
                                  "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                                )}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            }
                          />
                          <TooltipContent className="px-2 py-1 text-[10px] leading-none">
                            Edit message
                          </TooltipContent>
                        </Tooltip>
                      )}
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              aria-label="Copy message"
                              onClick={() =>
                                copyWithFeedback(message.content, `user-copy-${message.id}`)
                              }
                              className={cn(
                                outputActionButtonBase,
                                "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                            >
                              {renderCopyIcon(`user-copy-${message.id}`)}
                            </button>
                          }
                        />
                        <TooltipContent className="px-2 py-1 text-[10px] leading-none">
                          Copy message
                        </TooltipContent>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              aria-label="Copy reply"
                              onClick={() =>
                                copyWithFeedback(message.content, `assistant-copy-${message.id}`)
                              }
                              className={cn(
                                outputActionButtonBase,
                                "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                            >
                              {renderCopyIcon(`assistant-copy-${message.id}`)}
                            </button>
                          }
                        />
                        <TooltipContent className="px-2 py-1 text-[10px] leading-none">
                          Copy reply
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              aria-label="Like reply"
                              onClick={() => setAssistantReaction(message.id, "like")}
                              className={cn(
                                outputActionButtonBase,
                                assistantFeedback[message.id] === "like"
                                  ? "text-foreground"
                                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                        <TooltipContent className="px-2 py-1 text-[10px] leading-none">
                          Like reply
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              aria-label="Dislike reply"
                              onClick={() =>
                                setAssistantReaction(message.id, "dislike")
                              }
                              className={cn(
                                outputActionButtonBase,
                                assistantFeedback[message.id] === "dislike"
                                  ? "text-foreground"
                                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                        <TooltipContent className="px-2 py-1 text-[10px] leading-none">
                          Dislike reply
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger
                          render={
                            <button
                              type="button"
                              aria-label="Try again"
                              onClick={() => void retryAssistantMessage(message.id)}
                              className={cn(
                                outputActionButtonBase,
                                "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                              )}
                            >
                              <RefreshCcw className="h-3.5 w-3.5" />
                            </button>
                          }
                        />
                        <TooltipContent className="px-2 py-1 text-[10px] leading-none">
                          Try again
                        </TooltipContent>
                      </Tooltip>
                      {enableCreateAgent &&
                      message.id === lastAssistantMessageId &&
                      message.content.trim().length > 0 &&
                      !isResponding ? (
                        <button
                          type="button"
                          onClick={() => openAgentSetupFromPlan(message)}
                          disabled={creatingAgentMessageId !== null}
                          className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-[min(var(--radius-md),12px)] bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90 disabled:pointer-events-none disabled:opacity-60"
                        >
                          {creatingAgentMessageId === message.id ? (
                            <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Bot className="h-3.5 w-3.5" />
                          )}
                          Build Agent
                        </button>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
          {createAgentError ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
              {createAgentError}
            </div>
          ) : null}
          {isResponding && (
            <div className="text-sm text-muted-foreground">
              <span>Typing...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
          </div>
          </div>
        ) : (
          dockComposerToBottom && <div className="flex-1" />
        )}
      </div>

      {showTelegramAgentSetup ? (
        <div className="mb-3 rounded-xl border border-sidebar-border bg-sidebar p-3 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              {renderAppLogo("Telegram", "md")}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-medium text-foreground">
                    Telegram agent
                  </p>
                  <Badge
                    variant={telegramIntegration?.connected ? "green" : "neutral"}
                    size="sm"
                  >
                    {telegramIntegration?.connected ? "Connected" : "Not connected"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Customer messages go to this chat agent and replies return through your bot.
                </p>
              </div>
            </div>
            {!telegramIntegration?.connected ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => router.push("/apps/telegram")}
              >
                Connect Telegram
              </Button>
            ) : null}
          </div>

          {telegramIntegration?.connected ? (
            <div className="mt-3 grid gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">
                Telegram bot
              </label>
              <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                <select
                  value={selectedTelegramConnectionId}
                  onChange={(event) => setSelectedTelegramConnectionId(event.target.value)}
                  className="h-8 min-w-0 flex-1 rounded-md border border-sidebar-border bg-background/60 px-2 text-sm text-foreground outline-none transition-colors focus:border-primary"
                >
                  {telegramConnections.length === 0 ? (
                    <option value="">No connected bots found</option>
                  ) : (
                    telegramConnections.map((connection) => (
                      <option key={connection.id} value={connection.id}>
                        {connection.connection_name ||
                          connection.connected_account ||
                          "Telegram bot"}
                      </option>
                    ))
                  )}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 shrink-0"
                  onClick={() => router.push("/apps/telegram")}
                >
                  Add bot
                </Button>
              </div>
            </div>
          ) : null}

          <div className="mt-3 grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
            <Input
              value={telegramAgentName}
              onChange={(event) => setTelegramAgentName(event.target.value)}
              placeholder="Agent name"
              className="h-8 bg-background/60"
            />
            <div className="grid grid-cols-2 rounded-lg border border-sidebar-border bg-background/60 p-0.5">
              <button
                type="button"
                onClick={() => setTelegramAgentMode("atmet")}
                className={cn(
                  "h-7 rounded-md px-2 text-xs font-medium transition-colors",
                  telegramAgentMode === "atmet"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Atmet model
              </button>
              <button
                type="button"
                onClick={() => setTelegramAgentMode("agent_api")}
                className={cn(
                  "h-7 rounded-md px-2 text-xs font-medium transition-colors",
                  telegramAgentMode === "agent_api"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Agent API
              </button>
            </div>
          </div>

          {telegramAgentMode === "agent_api" ? (
            <Input
              value={telegramAgentApiUrl}
              onChange={(event) => setTelegramAgentApiUrl(event.target.value)}
              placeholder="https://your-agent-api.com/reply"
              className="mt-2 h-8 bg-background/60"
            />
          ) : null}

          <Textarea
            value={telegramAgentInstructions}
            onChange={(event) => setTelegramAgentInstructions(event.target.value)}
            className="mt-2 min-h-24 resize-none bg-background/60 text-sm"
            placeholder="Agent instructions"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <div className="min-h-5 text-xs">
              {telegramAgentError ? (
                <span className="text-destructive">{telegramAgentError}</span>
              ) : telegramAgentSuccess ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  {telegramAgentSuccess}
                </span>
              ) : null}
            </div>
            <Button
              type="button"
              size="sm"
              disabled={
                isCreatingTelegramAgent ||
                !telegramIntegration?.connected ||
                !selectedTelegramConnectionId
              }
              onClick={() => void createTelegramAgentFromChat()}
            >
              {isCreatingTelegramAgent ? (
                <RefreshCcw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Bot className="h-3.5 w-3.5" />
              )}
              Create Telegram agent
            </Button>
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          "p-0",
          hasConversation && "sticky bottom-4 z-20"
        )}
      >
        {connectedApps.length > 0 && (
          <div className="mb-1 flex min-h-8 items-center justify-start gap-2 px-1.5">
            <div className="flex items-center gap-1">
              {connectedApps.map((app) => (
                <div
                  key={app}
                  className="group inline-flex h-7 items-center gap-1.5 px-1 text-xs text-foreground"
                >
                  {renderAppLogo(app)}
                  <span className="max-w-24 truncate">{app}</span>
                  <button
                    type="button"
                    onClick={() => removeConnectedApp(app)}
                    className="-ml-0.5 inline-flex h-4 w-4 items-center justify-center rounded-sm text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100"
                    aria-label={`Remove ${app}`}
                  >
                    <X className="size-2.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
        <div
          className={cn(
            "relative transition-transform duration-300 ease-out",
            attachedFiles.length > 0 && "translate-y-[-10px]",
            glassComposer && hasConversation && "-mt-2"
          )}
        >
          <div
            className={cn(
              "overflow-hidden transition-all duration-300 ease-out",
              attachedFiles.length > 0
                ? "mb-2 max-h-40 opacity-100"
                : "mb-0 max-h-0 opacity-0"
            )}
          >
            <div className="relative z-10 p-2 sm:p-2.5">
              <div className="flex max-h-36 min-h-9 flex-wrap items-start gap-2 overflow-y-auto">
                {attachedFiles.map((attachment) => (
                  <div
                    key={attachment.id}
                    className="w-32 overflow-hidden rounded-lg border border-sidebar-border bg-background/85 sm:w-36"
                  >
                    {attachment.kind === "image" && attachment.previewUrl ? (
                      <Image
                        src={attachment.previewUrl}
                        alt={attachment.name}
                        width={144}
                        height={80}
                        unoptimized
                        className="h-20 w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-20 flex-col items-center justify-center gap-1 text-muted-foreground">
                        {renderAttachmentPreviewAsset(attachment)}
                        <span className="text-[10px]">
                          {getAttachmentKindLabel(attachment.kind)}
                        </span>
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-1 border-t border-sidebar-border px-2 py-1">
                      <span className="truncate text-[11px] text-muted-foreground" title={attachment.name}>
                        {attachment.name}
                      </span>
                      <button
                        type="button"
                        title="Remove file"
                        aria-label={`Remove ${attachment.name}`}
                        onClick={() => removeAttachedFile(attachment.id)}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 border",
              glassComposer
                ? hasConversation
                  ? cn("rounded-b-2xl border-x border-b border-t-0", glassBorder, glassLayerBack)
                  : cn("rounded-xl border", glassBorder, glassLayerBack)
                : "rounded-xl border border-sidebar-border bg-sidebar"
            )}
          />
          <div
            className={cn(
              "relative z-10 flex flex-col overflow-hidden border",
              glassComposer
                ? hasConversation
                  ? cn(
                      "rounded-b-2xl border-x border-b border-t-0",
                      glassBorder,
                      glassLayerFront
                    )
                  : cn("rounded-xl border", glassBorder, glassLayerFront)
                : "rounded-xl border border-sidebar-border bg-sidebar"
            )}
          >
            <div className="relative overflow-y-auto" style={{ maxHeight: "400px" }}>
              <div
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute inset-0 z-0 overflow-hidden px-4 pb-3 text-base text-foreground font-normal leading-normal tracking-normal md:text-sm",
                  "pt-3"
                )}
              >
                <div
                  className="whitespace-pre-wrap break-words"
                  style={{ transform: `translateY(-${composerScrollTop}px)` }}
                >
                  {renderComposerValue()}
                </div>
              </div>
              <Textarea
                className={cn(
                  "relative z-10 w-full resize-none border-none bg-transparent px-4 pb-3 text-transparent caret-foreground selection:bg-primary/20 selection:text-transparent focus-visible:ring-0 focus-visible:ring-offset-0 dark:bg-transparent",
                  "pt-3",
                  "min-h-[72px]"
                )}
                id={textareaId}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onSelect={handleComposerSelection}
                onScroll={handleComposerScroll}
                placeholder=""
                ref={textareaRef}
                value={value}
              />
            </div>

            <div className={cn("flex h-11 items-center", glassComposer ? "bg-transparent" : "bg-sidebar")}>
              <div className="absolute inset-x-2 bottom-1.5 flex items-center justify-between">
                <div className="flex min-w-0 items-center gap-1 overflow-x-auto pr-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-8 items-center gap-1 rounded-md pe-1.5 ps-1 text-xs hover:bg-muted focus-visible:ring-1 focus-visible:ring-offset-0" variant="ghost" />}><AnimatePresence mode="wait">
                                                                <motion.div
                                                                  animate={{
                                                                    opacity: 1,
                                                                    y: 0,
                                                                  }}
                                                                  className="flex items-center gap-1"
                                                                  exit={{
                                                                    opacity: 0,
                                                                    y: 5,
                                                                  }}
                                                                  initial={{
                                                                    opacity: 0,
                                                                    y: -5,
                                                                  }}
                                                                  key={selectedModel}
                                                                  transition={{
                                                                    duration: 0.15,
                                                                  }}
                                                                >
                                                                  {MODEL_ICONS[selectedModel]}
                                                                  {selectedModel}
                                                                  <ChevronDown className="h-3 w-3 opacity-50" />
                                                                </motion.div>
                                                              </AnimatePresence></DropdownMenuTrigger>
                    <DropdownMenuContent
                      className={cn(
                        "min-w-[10rem]",
                        "border-border bg-popover"
                      )}
                    >
                      {AI_MODELS.map((model) => (
                        <DropdownMenuItem
                          className="flex items-center justify-between gap-2"
                          key={model}
                          onSelect={() => setSelectedModel(model)}
                        >
                          <div className="flex items-center gap-2">
                            {MODEL_ICONS[model] || (
                              <Bot className="h-4 w-4 opacity-50" />
                            )}{" "}
                            {/* Use mapped SVG or fallback */}
                            <span>{model}</span>
                          </div>
                          {selectedModel === model && (
                            <Check className="h-4 w-4 text-primary" />
                          )}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="bg-border mx-0.5 h-4 w-px" />
                  <AnimatePresence initial={false}>
                    {activeTab !== "chat" && (
                      <motion.div
                        key="apps-button"
                        initial={{ opacity: 0, width: 0, x: -8 }}
                        animate={{ opacity: 1, width: "auto", x: 0 }}
                        exit={{ opacity: 0, width: 0, x: -8 }}
                        transition={{ duration: 0.22, ease: "easeOut" }}
                        className="overflow-hidden"
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            render={
                              <Button
                                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-8 items-center gap-1 rounded-md px-1.5 text-xs hover:bg-muted focus-visible:ring-1 focus-visible:ring-offset-0"
                                variant="ghost"
                              />
                            }
                          >
                            <span>Apps</span>
                            <Plus className="h-4 w-4 opacity-80" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className={cn("min-w-[12rem]", "border-border bg-popover")}
                          >
                            {availableIntegrations.length === 0 ? (
                              <DropdownMenuItem disabled className="text-muted-foreground">
                                No apps connected
                              </DropdownMenuItem>
                            ) : (
                              availableIntegrations.map((integration) => (
                                <DropdownMenuItem
                                  className="flex items-center justify-between gap-2"
                                  key={integration.slug}
                                  onSelect={() => insertAppMention(integration.name)}
                                >
                                  <div className="flex items-center gap-2">
                                    {renderAppLogo(integration.name, "md")}
                                    <span>{integration.name}</span>
                                  </div>
                                  {connectedApps.includes(integration.name) && (
                                    <Check className="h-4 w-4 text-primary" />
                                  )}
                                </DropdownMenuItem>
                              ))
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-8 items-center gap-1 rounded-md px-1.5 text-xs hover:bg-muted focus-visible:ring-1 focus-visible:ring-offset-0"
                          variant="ghost"
                        />
                      }
                    >
                      <span>Skills</span>
                      <Plus className="h-4 w-4 opacity-80" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className={cn("min-w-[12rem]", "border-border bg-popover")}>
                      <DropdownMenuItem
                        className="flex items-center justify-between gap-2"
                        key="no-skill"
                        onSelect={() => setSelectedSkill("No skill")}
                      >
                        <span>No skill</span>
                        {selectedSkill === "No skill" && <Check className="h-4 w-4 text-primary" />}
                      </DropdownMenuItem>
                      {availableSkillNames.length === 0 ? (
                        <DropdownMenuItem disabled className="text-muted-foreground">
                          No skills created yet
                        </DropdownMenuItem>
                      ) : (
                        availableSkillNames.map((skill) => (
                          <DropdownMenuItem
                            className="flex items-center justify-between gap-2"
                            key={skill}
                            onSelect={() => setSelectedSkill(skill)}
                          >
                            <span>{skill}</span>
                            {selectedSkill === skill && <Check className="h-4 w-4 text-primary" />}
                          </DropdownMenuItem>
                        ))
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          aria-label="Add options"
                          className={cn(
                            "text-muted-foreground hover:text-foreground focus-visible:ring-ring flex h-8 items-center gap-1 rounded-md px-1.5 text-xs hover:bg-muted focus-visible:ring-1 focus-visible:ring-offset-0"
                          )}
                          variant="ghost"
                        />
                      }
                    >
                      <span>Add</span>
                      <Plus className="h-4 w-4 transition-colors" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className={cn("min-w-[15rem]", "border-border bg-popover")}
                    >
                      <DropdownMenuItem
                        onPointerDown={(e) => {
                          if (e.button !== 0) return;
                          e.preventDefault();
                          openFilePicker();
                        }}
                        onSelect={(e) => e.preventDefault()}
                      >
                        <Upload className="h-4 w-4 opacity-70" />
                        Upload file
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="justify-between gap-3"
                        onSelect={() => {}}
                      >
                        <span className="flex min-w-0 items-center gap-2 whitespace-nowrap">
                          <Monitor className="h-4 w-4 opacity-70" />
                          Screen record
                        </span>
                        <Badge
                          variant="red"
                          size="sm"
                          className="pointer-events-none shrink-0"
                        >
                          Coming later
                        </Badge>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => onAddUserToChat?.()}
                        onSelect={() => onAddUserToChat?.()}
                      >
                        <UserPlus className="h-4 w-4 opacity-70" />
                        Manage chat users
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    aria-label="Send message"
                    className={cn(
                      "h-7 rounded-[min(var(--radius-md),12px)] bg-primary px-2.5 text-[0.8rem] font-medium text-primary-foreground hover:bg-primary/90"
                    )}
                    disabled={
                      lockedComposerPrefix
                        ? value.slice(lockedComposerPrefix.length).trim().length === 0
                        : !value.trim()
                    }
                    type="button"
                    onClick={() => void sendMessage()}
                    size="sm"
                  >
                    <span>Send</span>
                    <Kbd
                      className={cn(
                        "h-4 rounded-[calc(min(var(--radius-md),12px)*4/7)] border-transparent bg-primary-foreground/15 px-1 text-[10px]",
                        value.trim() ? "text-primary-foreground" : "text-primary-foreground/70"
                      )}
                    >
                      <CornerDownLeft className="h-2.5 w-2.5" />
                    </Kbd>
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {commandMenu && commandItems.length > 0 && (
            <div className="absolute bottom-[calc(100%+0.5rem)] left-3 z-50 min-w-40 max-h-56 overflow-x-hidden overflow-y-auto rounded-lg bg-popover p-1 text-popover-foreground shadow-md ring-1 ring-foreground/10">
              {commandItems.map((item, index) => (
                <button
                  key={`${commandMenu.type}-${item}`}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectCommandItem(item)}
                  className={cn(
                    "relative flex w-full cursor-default items-center justify-between gap-1.5 rounded-md px-1.5 py-1 text-sm outline-hidden transition-colors",
                    index === highlightedCommandIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-popover-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <span className="flex items-center gap-2">
                    {commandMenu.type === "skill" ? (
                      <span className="text-muted-foreground">/</span>
                    ) : (
                      renderAppLogo(item)
                    )}
                    <span>{item}</span>
                  </span>
                  {commandMenu.type === "app" && connectedApps.includes(item) && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
