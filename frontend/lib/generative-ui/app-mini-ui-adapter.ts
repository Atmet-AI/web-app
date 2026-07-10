import type { AppMiniUiRequest } from "@/lib/integrations/app-mini-ui"
import type { AtmetUiPayload } from "@/lib/generative-ui/schema"

export function appMiniUiToAtmetUi(
  request: AppMiniUiRequest
): AtmetUiPayload {
  return {
    type: "atmet_ui",
    version: 1,
    surface: "chat",
    appName: request.appName,
    appSlug: request.appSlug,
    component: {
      kind: "form",
      title: request.title,
      description: request.description,
      fields: request.fields.map((field) => ({
        id: field.id,
        label: field.label,
        type:
          field.type === "textarea"
            ? "textarea"
            : field.type === "select"
              ? "select"
              : field.id === "to"
                ? "email"
                : "text",
        placeholder: field.placeholder,
        value: field.value,
        required: field.required,
        options: field.options,
      })),
      submit: {
        label: request.submitLabel,
        action: {
          type: "chat_submit",
          app: request.appSlug,
          label: request.submitLabel,
          requiresConfirmation: false,
          params: {
            variant: request.variant,
            originalRequest: request.originalRequest,
          },
        },
      },
    },
  }
}
