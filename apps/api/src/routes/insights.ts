import type { FastifyInstance } from "fastify";
import { childIdParamSchema } from "../schemas/params";
import type { ChildGrowthService } from "../services/childGrowthService";

export function insightRoutes(childGrowthService: ChildGrowthService) {
  return async function registerInsightRoutes(app: FastifyInstance): Promise<void> {
    app.get("/children/:childId/growth", async (request) => {
      const { childId } = childIdParamSchema.parse(request.params);
      return childGrowthService.getGrowth(childId);
    });

    app.get("/children/:childId/prediction", async (request) => {
      const { childId } = childIdParamSchema.parse(request.params);
      return childGrowthService.getPrediction(childId);
    });
  };
}
