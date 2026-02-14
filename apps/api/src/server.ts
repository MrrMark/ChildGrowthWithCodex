import { createApp } from "./app";

async function start() {
  const app = await createApp();
  const port = Number(process.env.PORT ?? 4000);
  await app.listen({
    host: "0.0.0.0",
    port
  });
}

start().catch((error) => {
  console.error(error);
  process.exit(1);
});
