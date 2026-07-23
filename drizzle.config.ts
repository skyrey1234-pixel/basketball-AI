import { defineConfig } from "drizzle-kit";

// `drizzle-kit generate` only reads the schema to produce migration files and
// does not open a database connection, so DATABASE_URL may legitimately be
// absent at build time. Connection-based commands (migrate/push/studio) still
// require it and will surface their own error if the URL is empty.
const connectionString = process.env.DATABASE_URL ?? "";

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
