import type { FastifyError, FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { BadRequestError, ConflictError, NotFoundError } from "../services/errors";

export function registerErrorHandler(app: FastifyInstance): void {
  app.setErrorHandler((error: FastifyError, _request: FastifyRequest, reply: FastifyReply) => {
    if (error instanceof ZodError) {
      reply.status(400).send({
        code: "VALIDATION_ERROR",
        errors: error.issues.map((issue) => ({
          field: issue.path.join("."),
          message: issue.message
        }))
      });
      return;
    }

    if (error instanceof NotFoundError) {
      reply.status(404).send({
        code: "NOT_FOUND",
        message: error.message
      });
      return;
    }

    if (error instanceof ConflictError) {
      reply.status(409).send({
        code: "CONFLICT",
        message: error.message
      });
      return;
    }

    if (error instanceof BadRequestError) {
      reply.status(400).send({
        code: "BAD_REQUEST",
        message: error.message
      });
      return;
    }

    const maybePgError = error as { code?: string; detail?: string };
    if (maybePgError.code === "23505") {
      reply.status(409).send({
        code: "CONFLICT",
        message: "동일 날짜의 검진 기록이 이미 존재합니다.",
        detail: maybePgError.detail
      });
      return;
    }

    app.log.error(error);
    reply.status(500).send({
      code: "INTERNAL_SERVER_ERROR",
      message: "예상치 못한 오류가 발생했습니다."
    });
  });
}
