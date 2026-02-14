import type {
  Child,
  CreateCheckupInput,
  CreateChildInput,
  GrowthPoint,
  PredictionResult
} from "@child-growth/shared";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json"
    },
    ...init
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "요청 처리에 실패했습니다.");
  }

  return response.json() as Promise<T>;
}

export async function createChild(input: CreateChildInput): Promise<Child> {
  return request<Child>("/children", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listChildren(): Promise<Child[]> {
  const result = await request<{ items: Child[] }>("/children");
  return result.items;
}

export async function createCheckup(childId: string, input: CreateCheckupInput): Promise<void> {
  await request(`/children/${childId}/checkups`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getGrowth(childId: string): Promise<GrowthPoint[]> {
  const result = await request<{ points: GrowthPoint[] }>(`/children/${childId}/growth`);
  return result.points;
}

export async function getPrediction(childId: string): Promise<PredictionResult> {
  const result = await request<{ prediction: PredictionResult }>(`/children/${childId}/prediction`);
  return result.prediction;
}

export async function parseOcrText(
  childId: string,
  text: string
): Promise<{ heightCm?: number; weightKg?: number; headCircumferenceCm?: number; warnings: string[] }> {
  return request(`/children/${childId}/checkups/ocr-parse`, {
    method: "POST",
    body: JSON.stringify({ text })
  });
}

export async function uploadOcrFile(
  childId: string,
  file: { uri: string; name: string; type: string }
): Promise<{
  extractedBy: "local" | "provider";
  extractedTextPreview: string;
  parsed: { heightCm?: number; weightKg?: number; headCircumferenceCm?: number; warnings: string[] };
}> {
  const formData = new FormData();
  formData.append("file", {
    uri: file.uri,
    name: file.name,
    type: file.type
  } as unknown as Blob);

  const response = await fetch(`${API_BASE_URL}/children/${childId}/checkups/ocr-upload`, {
    method: "POST",
    body: formData
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "파일 OCR 업로드에 실패했습니다.");
  }

  return response.json() as Promise<{
    extractedBy: "local" | "provider";
    extractedTextPreview: string;
    parsed: { heightCm?: number; weightKg?: number; headCircumferenceCm?: number; warnings: string[] };
  }>;
}
