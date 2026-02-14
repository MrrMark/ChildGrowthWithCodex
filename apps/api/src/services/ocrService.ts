import { round } from "../utils/math";
import { BadRequestError } from "./errors";

export interface OcrParseResult {
  heightCm?: number;
  weightKg?: number;
  headCircumferenceCm?: number;
  warnings: string[];
}

export interface UploadedOcrFile {
  filename: string;
  mimeType: string;
  buffer: Buffer;
}

export interface OcrUploadParseResponse {
  extractedText: string;
  extractedBy: "local" | "provider";
  parsed: OcrParseResult;
}

interface OcrSpaceParsedResult {
  ParsedText?: string;
}

interface OcrSpaceResponse {
  OCRExitCode?: number;
  IsErroredOnProcessing?: boolean;
  ErrorMessage?: string[] | string;
  ErrorDetails?: string;
  ParsedResults?: OcrSpaceParsedResult[];
}

function parseMeasure(text: string, label: string): number | undefined {
  const regex = new RegExp(`${label}\\s*[:=]?\\s*(\\d{2,3}(?:\\.\\d)?)`, "i");
  const match = text.match(regex);
  if (!match) {
    return undefined;
  }
  return round(Number(match[1]));
}

export function parseCheckupText(text: string): OcrParseResult {
  const warnings: string[] = [];
  const heightCm = parseMeasure(text, "(?:height|키)");
  const weightKg = parseMeasure(text, "(?:weight|체중)");
  const headCircumferenceCm = parseMeasure(text, "(?:head|머리둘레)");

  if (heightCm === undefined) {
    warnings.push("키를 자동 추출하지 못했습니다. 수기로 보정해 주세요.");
  }

  if (weightKg === undefined) {
    warnings.push("체중을 자동 추출하지 못했습니다. 수기로 보정해 주세요.");
  }

  return {
    heightCm,
    weightKg,
    headCircumferenceCm,
    warnings
  };
}

function isTextMimeType(mimeType: string): boolean {
  return mimeType.startsWith("text/");
}

function stringifyOcrSpaceError(error: OcrSpaceResponse): string {
  const message =
    typeof error.ErrorMessage === "string"
      ? error.ErrorMessage
      : Array.isArray(error.ErrorMessage)
        ? error.ErrorMessage.join(", ")
        : "unknown_error";
  return `${message}${error.ErrorDetails ? ` (${error.ErrorDetails})` : ""}`;
}

async function extractTextFromProvider(file: UploadedOcrFile): Promise<string> {
  const apiKey = process.env.OCR_SPACE_API_KEY;
  if (!apiKey) {
    throw new BadRequestError(
      "OCR API key is missing. Set OCR_SPACE_API_KEY or upload a text file."
    );
  }

  const endpoint = process.env.OCR_SPACE_ENDPOINT ?? "https://api.ocr.space/parse/image";
  const language = process.env.OCR_SPACE_LANGUAGE ?? "kor";
  const dataUri = `data:${file.mimeType};base64,${file.buffer.toString("base64")}`;
  const filetype = file.mimeType.includes("pdf")
    ? "PDF"
    : file.mimeType.includes("jpeg") || file.mimeType.includes("jpg")
      ? "JPG"
      : "PNG";

  const body = new URLSearchParams({
    apikey: apiKey,
    language,
    base64Image: dataUri,
    isOverlayRequired: "false",
    filetype,
    OCREngine: "2"
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    throw new BadRequestError(`OCR provider call failed: HTTP ${response.status}`);
  }

  const payload = (await response.json()) as OcrSpaceResponse;
  if (payload.IsErroredOnProcessing) {
    throw new BadRequestError(`OCR provider processing error: ${stringifyOcrSpaceError(payload)}`);
  }

  const extractedText = (payload.ParsedResults ?? [])
    .map((result) => result.ParsedText?.trim() ?? "")
    .filter((text) => text.length > 0)
    .join("\n");

  if (!extractedText) {
    throw new BadRequestError("OCR provider returned empty text.");
  }

  return extractedText;
}

export async function parseCheckupFile(file: UploadedOcrFile): Promise<OcrUploadParseResponse> {
  if (!file.buffer || file.buffer.length === 0) {
    throw new BadRequestError("업로드 파일이 비어 있습니다.");
  }

  let extractedText: string;
  let extractedBy: "local" | "provider";

  if (isTextMimeType(file.mimeType)) {
    extractedText = file.buffer.toString("utf8");
    extractedBy = "local";
  } else {
    extractedText = await extractTextFromProvider(file);
    extractedBy = "provider";
  }

  const parsed = parseCheckupText(extractedText);
  return { extractedText, extractedBy, parsed };
}
