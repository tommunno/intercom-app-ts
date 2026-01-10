import {
  type IWebServerManager,
  type WebServerEvents,
  type ILogger,
  WebServerEvent,
} from "../../contracts/index.js";
import { TypedEmitter } from "tiny-typed-emitter";

export class WebServerManager
  extends TypedEmitter<WebServerEvents>
  implements IWebServerManager
{
  constructor(private logger: ILogger) {
    super();
  }

  init(): void {}

  start(): void {
    const userLoginRequestResult = this.emit(
      WebServerEvent.UserLoginRequest,
      "abcdef"
    );

    setTimeout(() => {
      const adminLoginRequestResult = this.emit(
        WebServerEvent.AdminLoginRequest,
        "ghijkl"
      );
    }, 2000);
  }
}
