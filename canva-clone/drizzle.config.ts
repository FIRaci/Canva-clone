import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";
import path from "path";

config({ path: path.resolve(process.cwd(), ".env.local") });
config({ path: path.resolve(process.cwd(), "../.env.local"), override: false });

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is missing. Add it to canva-clone/.env.local or ../.env.local before running drizzle-kit.",
  );
}

export default defineConfig({
  schema: "./src/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
