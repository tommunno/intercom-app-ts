import type {
  IWebServerManager,
  WebServerHandlers,
  ILogger,
} from "../../contracts/index.js";
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import path from "path";
import type {
  LoginCredentials,
  HttpLoginResponse,
  HttpLoginRequest,
} from "../../../shared/types/index.js";
import { isStringAndNotEmpty, validatePort } from "../../../shared/helpers.js";

export class WebServerManager implements IWebServerManager {
  private handlers: WebServerHandlers | null = null;
  private app: Express = express();
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

    this.app.post(
      "/login",
      async (
        rq: Request<{}, HttpLoginResponse, HttpLoginRequest>,
        rs: Response<HttpLoginResponse>
      ) => {
        await this.handleUserLoginRequest(rq, rs);
      }
    );

    this.app.use((e: any, rq: Request, rs: Response, n: NextFunction) =>
      this.handleErrors(e, rq, rs, n)
    );
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;

    this.app.listen(this.httpPort, () => {
      this.logger.info(`Server running at http://localhost:${this.httpPort}`);
    });
  }

  async handleUserLoginRequest(
    req: Request<{}, HttpLoginResponse, HttpLoginRequest>,
    res: Response<HttpLoginResponse>
  ) {
    const rawToken = req.cookies.userSessionToken;
    let userSessionToken: string | null = null;
    if (isStringAndNotEmpty(rawToken)) userSessionToken = rawToken;
    else {
      this.logger.warn(
        "Received a login request with an invalid or missing token."
      );
    }

    const loginCredentials: LoginCredentials = {
      username: isStringAndNotEmpty(req.body.username)
        ? req.body.username
        : null,
      password: isStringAndNotEmpty(req.body.password)
        ? req.body.password
        : null,
    };

    if (
      (!loginCredentials.username || !loginCredentials.password) &&
      !userSessionToken
    ) {
      this.logger.warn(
        "Login attempt blocked: Missing username or password, and no valid sessionToken."
      );
      res.status(400).json({ success: false, message: "Missing credentials" });
      return;
    }

    const { success, message } = await this.activeHandlers.onUserLoginRequest(
      userSessionToken,
      loginCredentials
    );
    res.status(success ? 200 : 401).json({ success, message });
  }

  handleErrors(err: any, req: Request, res: Response, next: NextFunction) {
    if (err instanceof SyntaxError && "body" in err) {
      this.logger.error(`Bad JSON received from ${req.ip}`);
      return res
        .status(400)
        .json({ success: false, message: "Invalid JSON format" });
    }

    if (err.type === "entity.too.large" || err.status === 413) {
      this.logger.warn(`Payload too large attempt from ${req.ip}`);
      return res.status(413).json({
        success: false,
        message: "The request body is too large.",
      });
    }
    next(err);
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
    const httpPortValid = validatePort(httpPort);
    const httpsPortValid = validatePort(httpsPort);
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

  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("WebServerManager handlers not initialized!");
    return this.handlers;
  }
}
