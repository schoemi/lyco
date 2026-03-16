import OpenAI, { APIError } from "openai";

// --- Interfaces ---

export interface LLMClientConfig {
  apiKey: string;
  baseURL?: string;
  model: string;
  timeoutMs: number;
  maxRetries: number;
}

export interface LLMMessage {
  role: "system" | "user";
  content: string;
}

export interface LLMClient {
  chat(messages: LLMMessage[]): Promise<string>;
}

// --- Factory ---

export function createLLMClient(configOverride?: Partial<LLMClientConfig>): LLMClient {
  const config: LLMClientConfig = {
    apiKey: configOverride?.apiKey ?? process.env.LLM_API_KEY ?? process.env.OPENAI_API_KEY ?? "",
    baseURL: configOverride?.baseURL ?? process.env.LLM_API_URL ?? undefined,
    model: configOverride?.model ?? process.env.LLM_MODEL ?? "gpt-4o-mini",
    timeoutMs: configOverride?.timeoutMs ?? 30000,
    maxRetries: configOverride?.maxRetries ?? 2,
  };

  if (!config.apiKey) {
    throw new Error("LLM_API_KEY ist nicht konfiguriert.");
  }

  const openai = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    timeout: config.timeoutMs,
    maxRetries: config.maxRetries,
  });

  return {
    async chat(messages: LLMMessage[]): Promise<string> {
      try {
        const response = await openai.chat.completions.create({
          model: config.model,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          response_format: { type: "json_object" },
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          throw new Error("LLM-Antwort enthält keinen Inhalt.");
        }

        return content;
      } catch (error) {
        if (error instanceof APIError) {
          console.error(
            `[LLMClient] API-Fehler: Status ${error.status} - ${error.message}`
          );
          throw new Error(
            `LLM-Anfrage fehlgeschlagen (Status ${error.status}): ${error.message}`
          );
        }

        if (error instanceof Error && error.message === "LLM-Antwort enthält keinen Inhalt.") {
          console.error(`[LLMClient] Leere Antwort vom LLM.`);
          throw error;
        }

        console.error(
          `[LLMClient] Unerwarteter Fehler: ${error instanceof Error ? error.message : String(error)}`
        );
        throw new Error(
          `LLM-Anfrage fehlgeschlagen: ${error instanceof Error ? error.message : "Unbekannter Fehler"}`
        );
      }
    },
  };
}
