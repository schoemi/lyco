import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { LLMMessage } from "@/lib/services/llm-client";

const mockCreate = vi.fn();
const mockConstructor = vi.fn();

// Mock the openai module with a proper class constructor
vi.mock("openai", () => {
  class MockOpenAI {
    chat = { completions: { create: mockCreate } };
    constructor(opts: Record<string, unknown>) {
      mockConstructor(opts);
    }
  }

  class APIError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "APIError";
      this.status = status;
    }
  }

  return { default: MockOpenAI, APIError };
});

describe("LLM-Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.LLM_API_KEY = "test-api-key";
    process.env.LLM_API_URL = "https://test.api.com";
    process.env.LLM_MODEL = "test-model";
    vi.resetModules();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  async function getCreateLLMClient() {
    const mod = await import("@/lib/services/llm-client");
    return mod.createLLMClient;
  }

  describe("createLLMClient", () => {
    it("creates client with env vars", async () => {
      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient();

      expect(mockConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "test-api-key",
          baseURL: "https://test.api.com",
          timeout: 30000,
          maxRetries: 2,
        })
      );
      expect(client).toHaveProperty("chat");
    });

    it("throws when LLM_API_KEY is missing", async () => {
      delete process.env.LLM_API_KEY;
      const createLLMClient = await getCreateLLMClient();
      expect(() => createLLMClient()).toThrow("LLM_API_KEY ist nicht konfiguriert.");
    });

    it("uses default model gpt-4o-mini when LLM_MODEL is not set", async () => {
      delete process.env.LLM_MODEL;
      const createLLMClient = await getCreateLLMClient();
      createLLMClient();
      expect(mockConstructor).toHaveBeenCalled();
    });

    it("accepts config overrides", async () => {
      const createLLMClient = await getCreateLLMClient();
      createLLMClient({
        apiKey: "override-key",
        baseURL: "https://override.api.com",
        model: "override-model",
        timeoutMs: 60000,
        maxRetries: 5,
      });

      expect(mockConstructor).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: "override-key",
          baseURL: "https://override.api.com",
          timeout: 60000,
          maxRetries: 5,
        })
      );
    });
  });

  describe("chat", () => {
    it("sends messages and returns content", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "LLM response text" } }],
      });

      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient();
      const messages: LLMMessage[] = [
        { role: "system", content: "You are a helper." },
        { role: "user", content: "Hello" },
      ];

      const result = await client.chat(messages);

      expect(result).toBe("LLM response text");
      expect(mockCreate).toHaveBeenCalledWith({
        model: "test-model",
        messages: [
          { role: "system", content: "You are a helper." },
          { role: "user", content: "Hello" },
        ],
        response_format: { type: "json_object" },
      });
    });

    it("throws when response has no content", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: null } }],
      });

      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient();

      await expect(
        client.chat([{ role: "user", content: "Hello" }])
      ).rejects.toThrow("LLM-Antwort enthält keinen Inhalt.");
    });

    it("throws when choices array is empty", async () => {
      mockCreate.mockResolvedValue({ choices: [] });

      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient();

      await expect(
        client.chat([{ role: "user", content: "Hello" }])
      ).rejects.toThrow("LLM-Antwort enthält keinen Inhalt.");
    });

    it("handles APIError with status code and logs it", async () => {
      const { APIError } = await import("openai");
      const apiError = new APIError(429, "Rate limit exceeded");
      mockCreate.mockRejectedValue(apiError);

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient();

      await expect(
        client.chat([{ role: "user", content: "Hello" }])
      ).rejects.toThrow("LLM-Anfrage fehlgeschlagen (Status 429)");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Status 429")
      );
      consoleSpy.mockRestore();
    });

    it("handles unexpected errors and logs them", async () => {
      mockCreate.mockRejectedValue(new Error("Network failure"));

      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient();

      await expect(
        client.chat([{ role: "user", content: "Hello" }])
      ).rejects.toThrow("LLM-Anfrage fehlgeschlagen: Network failure");

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Network failure")
      );
      consoleSpy.mockRestore();
    });
  });

  describe("responseFormat", () => {
    it("defaults to json_object when responseFormat is not specified", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"key":"value"}' } }],
      });

      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient();
      await client.chat([{ role: "user", content: "Hello" }]);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: "json_object" },
        })
      );
    });

    it("uses json_object when responseFormat is explicitly set to json_object", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: '{"key":"value"}' } }],
      });

      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient({ responseFormat: "json_object" });
      await client.chat([{ role: "user", content: "Hello" }]);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          response_format: { type: "json_object" },
        })
      );
    });

    it("omits response_format when responseFormat is text", async () => {
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: "Free text coach response" } }],
      });

      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient({ responseFormat: "text" });
      await client.chat([{ role: "user", content: "Give me singing tips" }]);

      const callArgs = mockCreate.mock.calls[0][0];
      expect(callArgs).not.toHaveProperty("response_format");
      expect(callArgs).toEqual({
        model: "test-model",
        messages: [{ role: "user", content: "Give me singing tips" }],
      });
    });

    it("returns text content correctly when responseFormat is text", async () => {
      const freeText = "This is a free text response with coaching tips.";
      mockCreate.mockResolvedValue({
        choices: [{ message: { content: freeText } }],
      });

      const createLLMClient = await getCreateLLMClient();
      const client = createLLMClient({ responseFormat: "text" });
      const result = await client.chat([{ role: "user", content: "Coach me" }]);

      expect(result).toBe(freeText);
    });
  });
});
