export class GroqAPIError extends Error {
  status?: number;
  reason?: string;

  constructor(message: string, options?: { status?: number; reason?: string }) {
    super(message);
    this.name = "GroqAPIError";
    this.status = options?.status;
    this.reason = options?.reason;
  }
}

const model = process.env.GROQ_MODEL ?? "llama-3.1-8b-instant";

export type GroqChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function extractErrorInfo(payload: unknown) {
  const parsed = payload as {
    error?: {
      message?: string;
      type?: string;
      code?: string;
    };
  };

  const message = parsed.error?.message ?? "Groq API request failed.";
  const reason = parsed.error?.code ?? parsed.error?.type ?? "UNKNOWN_ERROR";

  return { message, reason };
}

export function explainGroqError(error: unknown) {
  if (error instanceof GroqAPIError) {
    const reason = (error.reason ?? "").toLowerCase();

    if (error.status === 401 || reason.includes("invalid_api_key")) {
      return "Groq API key is invalid. Replace GROQ_API_KEY in .env.local with a valid key from Groq Console.";
    }

    if (error.status === 429 || reason.includes("rate_limit")) {
      return "Groq quota or rate limit is exhausted. Check usage limits or billing in Groq Console.";
    }

    if (error.status === 402 || reason.includes("insufficient_quota")) {
      return "Groq account quota is insufficient. Add credits or upgrade your Groq plan.";
    }

    return `Groq request failed (${error.reason ?? "unknown"}). ${error.message}`;
  }

  return "Groq service is unavailable right now. Check your network connection and API configuration.";
}

export async function callGroqChat(
  messages: GroqChatMessage[],
  options?: {
    temperature?: number;
  },
) {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    throw new GroqAPIError("Add GROQ_API_KEY to your environment variables.", {
      reason: "MISSING_API_KEY",
    });
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: options?.temperature ?? 0.4,
      messages,
    }),
  });

  if (!response.ok) {
    let message = "Groq API request failed.";
    let reason = "HTTP_ERROR";

    try {
      const payload = await response.json();
      const parsed = extractErrorInfo(payload);
      message = parsed.message;
      reason = parsed.reason;
    } catch {
      message = await response.text();
    }

    throw new GroqAPIError(message, { status: response.status, reason });
  }

  const data = (await response.json()) as {
    choices?: Array<{
      message?: {
        content?: string;
      };
    }>;
  };

  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

export async function callGroqAPI(prompt: string) {
  return callGroqChat([{ role: "user", content: prompt }]);
}
