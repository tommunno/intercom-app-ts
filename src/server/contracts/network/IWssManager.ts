import type { Servers } from "../../types/index.js";

export interface IWssManager {
  init(servers: Servers): void;
  start(): void;
}
