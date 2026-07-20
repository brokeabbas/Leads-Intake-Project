import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: env("DATABASE_URL"),
    // Optional: some setups need a shadow DB URL for migrate dev.
    // shadowDatabaseUrl: env("SHADOW_DATABASE_URL"),
  },
});
