import type { FastifyInstance } from "fastify";
import { createCheckupSchema, ocrInputSchema } from "../schemas/checkup";
import { childIdParamSchema } from "../schemas/params";
import type { ChildGrowthService } from "../services/childGrowthService";
import { parseCheckupFile, parseCheckupText } from "../services/ocrService";
import { BadRequestError } from "../services/errors";

export function checkupRoutes(childGrowthService: ChildGrowthService) {
  return async function registerCheckupRoutes(app: FastifyInstance): Promise<void> {
    app.post("/children/:childId/checkups", async (request, reply) => {
      const { childId } = childIdParamSchema.parse(request.params);
      const input = createCheckupSchema.parse(request.body);
      const checkup = await childGrowthService.createCheckup(childId, input);

      reply.status(201);
      return checkup;
    });

    app.post("/children/:childId/checkups/ocr-parse", async (request) => {
      const { childId } = childIdParamSchema.parse(request.params);
      await childGrowthService.getChildByIdOrThrow(childId);

      const input = ocrInputSchema.parse(request.body);
      return parseCheckupText(input.text);
    });

    app.post("/children/:childId/checkups/ocr-upload", async (request) => {
      const { childId } = childIdParamSchema.parse(request.params);
      await childGrowthService.getChildByIdOrThrow(childId);

      let uploadedFile;
      try {
        uploadedFile = await request.file();
      } catch {
        throw new BadRequestError("multipart/form-data 형식의 file 업로드가 필요합니다.");
      }

      if (!uploadedFile) {
        throw new BadRequestError("업로드할 파일이 없습니다.");
      }

      const buffer = await uploadedFile.toBuffer();
      const result = await parseCheckupFile({
        filename: uploadedFile.filename,
        mimeType: uploadedFile.mimetype,
        buffer
      });

      return {
        ...result,
        extractedTextPreview: result.extractedText.slice(0, 1000)
      };
    });
  };
}
