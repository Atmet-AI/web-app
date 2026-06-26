import { NextResponse } from "next/server"

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ data }, { status })
}

export function err(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status })
}

export const Errors = {
  unauthorized: (message = "Authentication required.") => err("unauthorized", message, 401),
  forbidden: (message = "You do not have permission to perform this action.") => err("forbidden", message, 403),
  notFound: (resource = "Resource") => err("not_found", `${resource} not found.`, 404),
  conflict: (message: string) => err("conflict", message, 409),
  badRequest: (message: string) => err("bad_request", message, 400),
  validationError: (message: string) => err("validation_error", message, 400),
  internal: () => err("internal_error", "An unexpected error occurred.", 500),
}
