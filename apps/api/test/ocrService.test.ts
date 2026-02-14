import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { parseCheckupFile, parseCheckupText } from "../src/services/ocrService";
import { BadRequestError } from "../src/services/errors";

function makeFile(mimeType: string, text: string) {
  return {
    filename: "sample.file",
    mimeType,
    buffer: Buffer.from(text, "utf8")
  };
}

describe("ocrService", () => {
  const originalApiKey = process.env.OCR_SPACE_API_KEY;
  const originalEndpoint = process.env.OCR_SPACE_ENDPOINT;
  const originalLanguage = process.env.OCR_SPACE_LANGUAGE;

  beforeEach(() => {
    vi.restoreAllMocks();
    delete process.env.OCR_SPACE_API_KEY;
    delete process.env.OCR_SPACE_ENDPOINT;
    delete process.env.OCR_SPACE_LANGUAGE;
  });

  afterEach(() => {
    process.env.OCR_SPACE_API_KEY = originalApiKey;
    process.env.OCR_SPACE_ENDPOINT = originalEndpoint;
    process.env.OCR_SPACE_LANGUAGE = originalLanguage;
    vi.restoreAllMocks();
  });

  it("parses Korean text values", () => {
    const result = parseCheckupText("키: 94.2 체중: 14.1 머리둘레: 49.5");
    expect(result.heightCm).toBe(94.2);
    expect(result.weightKg).toBe(14.1);
    expect(result.headCircumferenceCm).toBe(49.5);
    expect(result.warnings).toHaveLength(0);
  });

  it("returns warnings when fields are missing", () => {
    const result = parseCheckupText("키: 90.1");
    expect(result.heightCm).toBe(90.1);
    expect(result.weightKg).toBeUndefined();
    expect(result.warnings.length).toBeGreaterThan(0);
  });

  it("uses local parsing for text/plain file", async () => {
    const result = await parseCheckupFile(makeFile("text/plain", "키: 91.2\n체중: 13.0"));
    expect(result.extractedBy).toBe("local");
    expect(result.extractedText).toContain("키: 91.2");
    expect(result.parsed.heightCm).toBe(91.2);
    expect(result.parsed.weightKg).toBe(13);
  });

  it("throws on empty uploaded file", async () => {
    await expect(
      parseCheckupFile({ filename: "empty.txt", mimeType: "text/plain", buffer: Buffer.alloc(0) })
    ).rejects.toBeInstanceOf(BadRequestError);
  });

  it("throws when OCR_SPACE_API_KEY is missing for image/pdf", async () => {
    await expect(parseCheckupFile(makeFile("image/png", "binary"))).rejects.toThrow(
      "OCR API key is missing"
    );
  });

  it("throws on OCR provider HTTP error", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 500,
        json: async () => ({})
      })) as unknown as typeof fetch
    );

    await expect(parseCheckupFile(makeFile("image/png", "binary"))).rejects.toThrow(
      "OCR provider call failed"
    );
  });

  it("throws on OCR provider processing error", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          IsErroredOnProcessing: true,
          ErrorMessage: ["File failed"]
        })
      })) as unknown as typeof fetch
    );

    await expect(parseCheckupFile(makeFile("application/pdf", "binary"))).rejects.toThrow(
      "OCR provider processing error"
    );
  });

  it("throws when OCR provider returns empty text", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          IsErroredOnProcessing: false,
          ParsedResults: [{ ParsedText: "" }]
        })
      })) as unknown as typeof fetch
    );

    await expect(parseCheckupFile(makeFile("image/jpeg", "binary"))).rejects.toThrow(
      "OCR provider returned empty text"
    );
  });

  it("returns parsed data when OCR provider succeeds", async () => {
    process.env.OCR_SPACE_API_KEY = "test-key";
    process.env.OCR_SPACE_LANGUAGE = "kor";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          IsErroredOnProcessing: false,
          ParsedResults: [{ ParsedText: "키: 97.3\n체중: 15.2\n머리둘레: 49.7" }]
        })
      })) as unknown as typeof fetch
    );

    const result = await parseCheckupFile(makeFile("image/png", "binary"));
    expect(result.extractedBy).toBe("provider");
    expect(result.parsed.heightCm).toBe(97.3);
    expect(result.parsed.weightKg).toBe(15.2);
    expect(result.parsed.headCircumferenceCm).toBe(49.7);
  });
});
