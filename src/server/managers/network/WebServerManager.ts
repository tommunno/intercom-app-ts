import type { IWebServerManager, ILogger } from "../../contracts/index.js";

export class WebServerManager implements IWebServerManager {
  constructor(private logger: ILogger) {}
}
