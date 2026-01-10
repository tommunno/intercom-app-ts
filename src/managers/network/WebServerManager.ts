import { IWebServerManager, ILogger } from "../../contracts";

export class WebServerManager implements IWebServerManager {
  constructor(private logger: ILogger) {}
}
