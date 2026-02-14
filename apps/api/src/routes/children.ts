import type { FastifyInstance } from "fastify";
import { createChildSchema } from "../schemas/child";
import type { ChildGrowthService } from "../services/childGrowthService";

export function childrenRoutes(childGrowthService: ChildGrowthService) {
  return async function registerChildrenRoutes(app: FastifyInstance): Promise<void> {
    app.get("/children", async () => {
      return {
        items: await childGrowthService.listChildren()
      };
    });

    app.post("/children", async (request, reply) => {
      const input = createChildSchema.parse(request.body);
      const child = await childGrowthService.createChild(input);

      reply.status(201);
      return child;
    });
  };
}
