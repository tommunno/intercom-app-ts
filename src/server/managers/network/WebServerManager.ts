import type {
  IWebServerManager,
  WebServerHandlers,
  ILogger,
} from "../../contracts/index.js";

export class WebServerManager implements IWebServerManager {
  private handlers: WebServerHandlers | null = null;

  constructor(private logger: ILogger) {}

  init(): void {}

  start(): void {
    let result: string | boolean = "";
    if (this.handlers) result = this.handlers.onUserLoginRequest("abcdef");
    console.log(result);

    setTimeout(() => {
      if (this.handlers) result = this.handlers.onAdminLoginRequest("wxyzaabb");
      console.log(result);
    }, 2000);
  }

  setHandlers(handlers: WebServerHandlers) {
    this.handlers = handlers;
  }
}
