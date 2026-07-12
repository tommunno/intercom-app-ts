import type { Migration } from "../types/index.js";
import { initialSchema } from "./migrations/index.js";

export const migrations = [
  initialSchema,
] as const satisfies readonly Migration[];
