import { z } from "zod";

export const createCheckupSchema = z.object({
  checkupDate: z.string().date(),
  heightCm: z.number().min(30).max(220),
  weightKg: z.number().min(1).max(200),
  headCircumferenceCm: z.number().min(20).max(80).optional(),
  notes: z.string().max(1000).optional(),
  source: z.enum(["manual", "ocr"]),
  ocrRawText: z.string().max(10000).optional()
});

export const ocrInputSchema = z.object({
  text: z.string().min(1).max(10000)
});

export type CreateCheckupDto = z.infer<typeof createCheckupSchema>;
export type OcrInputDto = z.infer<typeof ocrInputSchema>;
