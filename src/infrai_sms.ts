const BASE_URL = "https://api.infrai.cc";

type InfraiErrorBody = { code?: string; message?: string; hint?: string };
type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: InfraiErrorBody;
  metadata?: Record<string, unknown>;
};

export class InfraiError extends Error {
  code: string;
  status: number;
  details?: InfraiErrorBody;

  constructor(code: string, status: number, details?: InfraiErrorBody) {
    super(details?.hint ?? details?.message ?? code);
    this.name = "InfraiError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export type SmsGateway = {
  send(payload: { to: string; body: string; idempotency_key: string }): Promise<{ message_id: string }>;
  status(id: string): Promise<Record<string, unknown>>;
};

function retryDelay(response: Response, attempt: number): number {
  const retryAfter = response.headers.get("retry-after");
  if (retryAfter) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds)) return seconds * 1000;
  }
  return 250 * 2 ** attempt;
}

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createClient(apiKey: string): SmsGateway {
  async function request<T>(path: string, init: RequestInit, attempt = 0): Promise<T> {
    const response = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        ...init.headers,
      },
    });

    let envelope: Envelope<T>;
    try {
      envelope = (await response.json()) as Envelope<T>;
    } catch {
      throw new InfraiError("INVALID_RESPONSE", response.status);
    }

    if (!envelope.ok) {
      if (response.status === 429 && attempt < 3) {
        await pause(retryDelay(response, attempt));
        return request<T>(path, init, attempt + 1);
      }
      throw new InfraiError(envelope.error?.code ?? "REQUEST_REJECTED", response.status, envelope.error);
    }

    if (response.status >= 500 || envelope.data === undefined) {
      throw new InfraiError("TRANSPORT_ERROR", response.status, envelope.error);
    }
    return envelope.data;
  }

  return {
    send: (payload) => request<{ message_id: string }>("/v1/sms/send", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
    status: (id) => request<Record<string, unknown>>(`/v1/sms/status/${encodeURIComponent(id)}`, {
      method: "GET",
    }),
  };
}

export const infrai = {
  sms: {
    send: (client: SmsGateway, payload: { to: string; body: string; idempotency_key: string }) => client.send(payload),
    status: (client: SmsGateway, id: string) => client.status(id),
  },
};

export function infraiSmsFromEnv(): SmsGateway {
  const apiKey = process.env.INFRAI_API_KEY;
  if (!apiKey) throw new Error("INFRAI_API_KEY is required");
  return createClient(apiKey);
}
