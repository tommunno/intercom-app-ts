//Types:
import type {
  IWebServerManager,
  WebServerHandlers,
  ILogger,
} from "../../contracts/index.js";
import type {
  LoginCredentials,
  HttpLoginResponse,
  HttpLoginRequest,
  ManagerState,
} from "../../../shared/types/index.js";

//Helpers:
import { isStringAndNotEmpty, validatePort } from "../../../shared/helpers.js";

//Constants:
import {
  HTTP_PORT,
  HTTPS_PORT,
  CERT_DIR,
  KEY_FILE,
  CERT_FILE,
  WEB_SERVER_DIR,
  SESSION_DURATION_MS,
} from "../../constants/serverConstants.js";

//External Libraries:
import express, {
  type Express,
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cookieParser from "cookie-parser";
import path from "path";
import https from "https";
import fs from "fs";
import { TLSSocket } from "tls";

export class WebServerManager implements IWebServerManager {
  private state: ManagerState = "IDLE";
  private handlers: WebServerHandlers | null = null;
  private app: Express = express();
  private httpPort: number = HTTP_PORT;
  private httpsPort: number = HTTPS_PORT;
  private isRunning: boolean = false;

  private httpsServer: https.Server | null = null;
  private readonly certPath: string = path.join(process.cwd(), CERT_DIR);

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WebServerManager" });
  }

  init(): void {
    if (this.state !== "IDLE")
      throw new Error(
        `Cannot initialize the WebServerManager whilst its state is ${this.state}`
      );

    // Guard: Only allow external traffic if it's secure
    this.app.use((rq: Request, rs: Response, n: NextFunction) => {
      this.restrictToLocalhost(rq, rs, n);
    });

    // Serve static files from the 'public' folder
    this.app.use(express.static(path.join(process.cwd(), WEB_SERVER_DIR)));
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
    if (this.state !== "INITIALIZED")
      throw new Error(
        `Cannot start the WebServerManager whilst its state is ${this.state}`
      );
    // Trigger the check to ensure we are ready to roll
    const ready = this.activeHandlers;

    this.app.listen(this.httpPort, () => {
      this.logger.info(
        `HTTP Server running at http://localhost:${this.httpPort}`
      );
    });

    this.attemptHttpsStart();
    this.isRunning = true;
  }

  private attemptHttpsStart(): void {
    try {
      const keyPath = path.join(this.certPath, KEY_FILE);
      const certPath = path.join(this.certPath, CERT_FILE);

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        const options = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };

        this.httpsServer = https.createServer(options, this.app);

        this.httpsServer.listen(this.httpsPort, () => {
          this.logger.info(
            `HTTPS Server running at https://localhost:${this.httpsPort}`
          );
        });
      } else {
        this.logger.warn(
          `HTTPS skipped: Certificates not found in ${CERT_DIR} folder: ${this.certPath}`
        );
      }
    } catch (error) {
      this.logger.error("Failed to start HTTPS server", error);
    }
  }

  private restrictToLocalhost(req: Request, res: Response, next: NextFunction) {
    const isHttps = req.socket instanceof TLSSocket && req.socket.encrypted;
    const remoteAddress = req.socket.remoteAddress;
    const isLocalhost =
      remoteAddress === "127.0.0.1" ||
      remoteAddress === "::1" ||
      remoteAddress === "::ffff:127.0.0.1";

    if (!isLocalhost && !isHttps) {
      this.logger.warn(
        `Blocked external HTTP access attempt from ${remoteAddress}`
      );
      if (!this.httpsServer) {
        return res
          .status(403)
          .send("HTTPS required, but HTTPS is not available.");
      }
      console.log("Got to here");
      return res.redirect(
        308,
        `https://${req.hostname}:${this.httpsPort}${req.originalUrl}`
      );
    }
    next();
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

    const { success, message, statusCode, newSessionToken } =
      await this.activeHandlers.onUserLoginRequest(
        userSessionToken,
        loginCredentials
      );
    if (newSessionToken) {
      res.cookie("userSessionToken", newSessionToken, {
        httpOnly: true,
        secure: req.socket instanceof TLSSocket && req.socket.encrypted,
        sameSite: "strict",
        maxAge: SESSION_DURATION_MS,
      });
    }

    res.status(statusCode).json({ success, message });
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
    if (this.isRunning) {
      this.logger.warn(
        `Cannot set http and https ports, because the server is running`
      );
      return false;
    }
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
