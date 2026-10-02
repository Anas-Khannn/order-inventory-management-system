import type { ApiErrorBody } from "@repo/shared";

const BASE = import.meta.env.VITE_API_URL ?? "/api";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

/** Set by the auth provider: the bearer token to send, and what to do when the server rejects it. */
let authToken: string | null = null;
let onUnauthorized: (() => void) | null = null;
export const setAuthToken = (token: string | null) => {
  authToken = token;
};
export const setUnauthorizedHandler = (handler: (() => void) | null) => {
  onUnauthorized = handler;
};

export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}), ...init.headers },
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "Cannot reach the server. Is the API running?");
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) {
    const e = (body as ApiErrorBody | null)?.error;
    // A signed-in request was rejected: the session expired or was revoked elsewhere.
    if (res.status === 401 && e?.code === "UNAUTHORIZED") onUnauthorized?.();
    throw new ApiError(res.status, e?.code ?? "UNKNOWN", e?.message ?? res.statusText, e?.details);
  }
  return body as T;
}
