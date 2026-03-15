import { DATABASE_URL } from "@todo-list/config";
import { drizzle } from "drizzle-orm/node-postgres";

export const db = drizzle(DATABASE_URL!);
export { and, eq } from "drizzle-orm";
