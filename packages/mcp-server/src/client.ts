import type { Prototype, PrototypeWithAccessCode, UploadRequest } from "@protypic/shared";

export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

export class ProtypicClient {
  constructor(private baseUrl: string, private token: string) {}

  private async req<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${this.token}`,
        ...(init.headers || {}),
      },
    });
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      throw new ApiError(body.error || `Request failed (${res.status})`, res.status);
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  upload(req: UploadRequest): Promise<PrototypeWithAccessCode> {
    return this.req("/api/prototypes", { method: "POST", body: JSON.stringify(req) });
  }

  list(): Promise<{ prototypes: Prototype[] }> {
    return this.req("/api/prototypes", { method: "GET" });
  }

  get(id: string): Promise<Prototype> {
    return this.req(`/api/prototypes/${encodeURIComponent(id)}`, { method: "GET" });
  }

  delete(id: string): Promise<void> {
    return this.req(`/api/prototypes/${encodeURIComponent(id)}`, { method: "DELETE" });
  }
}
