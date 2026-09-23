export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiClientError";
  }
}

export class NetworkError extends Error {
  constructor() {
    super("network");
    this.name = "NetworkError";
  }
}

export interface ApiOptions {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
  token?: string | null;
  signal?: AbortSignal;
}

let memoryAuthToken: string | null = null;

export function setAuthToken(token: string | null) {
  memoryAuthToken = token;
  if (typeof window !== "undefined") {
    try {
      if (token) {
        localStorage.setItem("taf_auth_token", token);
      } else {
        localStorage.removeItem("taf_auth_token");
      }
    } catch {}
  }
}

export function getAuthToken(): string | null {
  if (memoryAuthToken) return memoryAuthToken;
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("taf_auth_token");
      if (stored) {
        memoryAuthToken = stored;
        return stored;
      }
    } catch {}
  }
  return null;
}

/**
 * Same-origin fetch. Mini App calls send `Authorization: Bearer <token>`; the web admin relies on the
 * httpOnly session cookie (sent automatically) and/or the stored Bearer token. Errors are normalised to ApiClientError / NetworkError.
 */
export async function apiFetch<T>(path: string, opts: ApiOptions = {}): Promise<T> {
  let res: Response;
  const token = opts.token !== undefined ? opts.token : getAuthToken();
  try {
    res = await fetch(path, {
      method: opts.method ?? "GET",
      headers: {
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin",
      signal: opts.signal,
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e;
    throw new NetworkError();
  }

  const data = await res.json().catch(() => null);
  if (!res.ok) {
    const err = (data as { error?: { code?: string; message?: string } } | null)?.error;
    throw new ApiClientError(res.status, err?.code ?? "ERROR", err?.message ?? "Something went wrong");
  }
  return data as T;
}
