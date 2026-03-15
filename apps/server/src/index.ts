import { Client } from "pg";
import { DATABASE_URL, ENVIRONMENT } from "@todo-list/config";

export const runtimeMode =
  ENVIRONMENT === "production" ? "production" : "development";

export const ensureDatabaseConnection = async () => {
  const client = new Client({
    connectionString: DATABASE_URL,
  });
  try {
    await client.connect();
    console.log("database connection established.");
  } catch (error) {
    console.error("Database is down:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
};
