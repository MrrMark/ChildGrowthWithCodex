import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { childrenRoutes } from "./routes/children";
import { checkupRoutes } from "./routes/checkups";
import { insightRoutes } from "./routes/insights";
import { registerErrorHandler } from "./plugins/errorHandler";
import { createChildGrowthService } from "./services";

export async function createApp() {
  const app = Fastify({
    logger: true
  });
  const childGrowthService = await createChildGrowthService();

  app.register(cors, {
    origin: true
  });
  app.register(multipart, {
    limits: {
      files: 1,
      fileSize: 8 * 1024 * 1024,
      fields: 10
    }
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.register(childrenRoutes(childGrowthService));
  app.register(checkupRoutes(childGrowthService));
  app.register(insightRoutes(childGrowthService));

  registerErrorHandler(app);

  return app;
}
