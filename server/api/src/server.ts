import { app } from "./app.ts";
import { env } from "./config/config.ts";
import { connectDB } from "./config/dbConnect.ts";
import { logger } from "./utils/logger.ts";

async function start() {
  await connectDB();

  app.listen(env.PORT, () => {
    logger.info(`Server is running on port ${env.PORT}`);
  });
}

start().catch((err) => {
  logger.error({ err }, "Failed to start server");
  process.exit(1);
});
