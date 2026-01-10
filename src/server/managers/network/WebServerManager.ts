import type {
  IWebServerManager,
  WebServerHandlers,
  ILogger,
} from "../../contracts/index.js";
import express, { raw } from "express";
import cookieParser from "cookie-parser";
import path from "path";
import type { LoginCredentials } from "../../../shared/types/index.js";

export class WebServerManager implements IWebServerManager {
  private handlers: WebServerHandlers | null = null;
  private app = express();
  private httpPort: number = 80;
  private httpsPort: number = 443;

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WebServerManager" });
  }

  init(): void {
    // Serve static files from the 'public' folder
    this.app.use(express.static(path.join(process.cwd(), "public")));
    this.app.use(cookieParser());
    this.app.use(express.json());

    this.app.post("/login", async (req, res) => {
      const rawToken = req.cookies.userSessionToken;
      let userSessionToken: string | null = null;
      if (typeof rawToken === "string" && rawToken.trim() !== "") {
        userSessionToken = rawToken;
      } else {
        this.logger.warn(
          "Received a login request with an invalid or missing token."
        );
      }

      let loginCredentials: LoginCredentials = {
        username: null,
        password: null,
      };

      // Check username
      if (
        typeof req.body.username === "string" &&
        req.body.username.trim() !== ""
      ) {
        loginCredentials.username = req.body.username;
      }

      // Check password
      if (
        typeof req.body.password === "string" &&
        req.body.password.trim() !== ""
      ) {
        loginCredentials.password = req.body.password;
      }

      // Final Verification before calling the Handler
      if (
        (!loginCredentials.username || !loginCredentials.password) &&
        !userSessionToken
      ) {
        this.logger.warn(
          "Login attempt blocked: Missing username or password, and no valid sessionToken."
        );
        return res
          .status(400)
          .json({ success: false, message: "Missing credentials" });
      }

      const { success, message } = await this.activeHandlers.onUserLoginRequest(
        userSessionToken,
        loginCredentials
      );
      res.status(success ? 200 : 401).json({ success, message });
    });

    this.app.use((err: any, req: any, res: any, next: any) => {
      if (err instanceof SyntaxError && "body" in err) {
        this.logger.error("Bad JSON received");
        return res
          .status(400)
          .json({ success: false, message: "Invalid JSON format" });
      }
      next(err);
    });
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;

    this.app.listen(this.httpPort, () => {
      this.logger.info(`Server running at http://localhost:${this.httpPort}`);
    });
  }

  setHandlers(handlers: WebServerHandlers) {
    this.handlers = handlers;
  }

  setPorts(httpPort: number, httpsPort: number): boolean {
    if (httpPort === httpsPort) {
      this.logger.error(
        `HTTP and HTTPS ports cannot be the same (${httpPort})`
      );
      return false;
    }
    const httpPortValid = this.validatePort(httpPort);
    const httpsPortValid = this.validatePort(httpsPort);
    if (!httpPortValid)
      this.logger.warn(`Invalid httpPort number of ${httpPort}`);
    if (!httpsPortValid)
      this.logger.warn(`Invalid httpsPort number of ${httpsPort}`);
    if (httpPortValid && httpsPortValid) {
      this.httpPort = httpPort;
      this.httpsPort = httpsPort;
      return true;
    }
    return false;
  }

  private validatePort(port: number) {
    return (
      Number.isInteger(port) &&
      (port >= 1025 || port === 80 || port === 443) &&
      port <= 65535
    );
  }

  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("WebServerManager handlers not initialized!");
    return this.handlers;
  }
}
