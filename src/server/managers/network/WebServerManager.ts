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
  ManagerStatus,
} from "../../../shared/types/index.js";

//Helpers:
import {
  isAddressLocalhost,
  isStringAndNotEmpty,
} from "../../../shared/helpers.js";
import type { Servers, WebServerResolvedData } from "../../types/index.js";

//Constants:
import {
  CERT_DIR,
  KEY_FILE,
  CERT_FILE,
  WEB_SERVER_DIR,
  SESSION_DURATION_MS,
  DEFAULT_HTTPS_PORT,
  DEFAULT_HTTP_PORT,
  GENERATED_KEY_FILE,
  GENERATED_CERT_FILE,
  APP_NAME,
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
import http from "http";
import https, { type ServerOptions } from "https";
import fs from "fs";
import { TLSSocket } from "tls";
import selfsigned, { type CertificateField } from "selfsigned";
import crypto from "crypto";

export class WebServerManager implements IWebServerManager {
  private status: ManagerStatus = "IDLE";
  private handlers: WebServerHandlers | null = null;

  private app: Express = express();
  private httpPort: number = DEFAULT_HTTP_PORT;
  private httpsPort: number | null = DEFAULT_HTTPS_PORT;

  private httpServer: http.Server | null = null;
  private httpsServer: https.Server | null = null;
  private readonly certPath: string = path.join(process.cwd(), CERT_DIR);

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WebServerManager" });
  }

  async init(): Promise<Servers> {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the WebServerManager whilst its status is ${this.status}`,
      );
    }

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
        rs: Response<HttpLoginResponse>,
      ) => {
        await this.handleUserLoginRequest(rq, rs);
      },
    );

    this.app.use((e: any, rq: Request, rs: Response, n: NextFunction) =>
      this.handleErrors(e, rq, rs, n),
    );

    await this.attemptHttpsInit();
    this.httpServer = http.createServer(this.app);
    this.status = "INITIALIZED";
    return {
      http: this.httpServer,
      https: this.httpsServer,
    };
  }

  populate({ httpPort, httpsPort }: WebServerResolvedData): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the WebServerManager whilst its status is ${this.status}`,
      );
    }
    this.setPorts(httpPort, httpsPort);
    this.status = "POPULATED";
  }

  start(): void {
    if (this.status !== "POPULATED") {
      throw new Error(
        `Cannot start the WebServerManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.status = "RUNNING";

    if (this.httpServer) {
      this.httpServer.on("error", (err) => this.handleListenError("HTTP", err));
      this.httpServer.listen(this.httpPort, () => {
        this.logger.success(
          `HTTP Server running at http://localhost:${this.httpPort}`,
        );
      });
    }
    if (this.httpsServer && this.httpsPort !== null) {
      this.httpsServer.on("error", (err) =>
        this.handleListenError("HTTPS", err),
      );
      this.httpsServer.listen(this.httpsPort, () => {
        this.logger.success(
          `HTTPS Server running at https://localhost:${this.httpsPort}`,
        );
      });
    }
  }

  setHandlers(handlers: WebServerHandlers): void {
    this.handlers = handlers;
  }

  private async attemptHttpsInit(): Promise<void> {
    try {
      const keyPath = path.join(this.certPath, KEY_FILE);
      const certPath = path.join(this.certPath, CERT_FILE);

      if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
        const options: ServerOptions = {
          key: fs.readFileSync(keyPath),
          cert: fs.readFileSync(certPath),
        };
        this.httpsServer = https.createServer(options, this.app);
        this.logger.success("User provided SSL files are valid");
        return;
      } else {
        this.logger.warn(
          `User provided SSL files not found in ${CERT_DIR} folder: ${this.certPath}. Falling back to self-signed...`,
        );
      }
    } catch (error) {
      this.logger.error(
        "Provided SSL certificate failed to load/parse. Falling back to self-signed...",
        error,
      );
    }

    const genKeyPath = path.join(this.certPath, GENERATED_KEY_FILE);
    const genCertPath = path.join(this.certPath, GENERATED_CERT_FILE);
    const existingGenCertSuccess = this.attemptGeneratedCert(
      genKeyPath,
      genCertPath,
    );
    if (existingGenCertSuccess) return;
    this.logger.warn(
      "No valid SSL certificates found. Generating new self-signed certificate...",
    );
    const newGenCertSuccess = await this.generateNewCert(
      genKeyPath,
      genCertPath,
    );
    if (newGenCertSuccess) return;
    this.logger.error("Unable to start HTTPS server");
  }

  //Returns success
  private attemptGeneratedCert(
    generatedKeyPath: string,
    generatedCertPath: string,
  ): boolean {
    try {
      if (
        fs.existsSync(generatedKeyPath) &&
        fs.existsSync(generatedCertPath) &&
        !this.isCertExpired(generatedCertPath)
      ) {
        const options: ServerOptions = {
          key: fs.readFileSync(generatedKeyPath),
          cert: fs.readFileSync(generatedCertPath),
        };
        this.httpsServer = https.createServer(options, this.app);
        this.logger.warn(
          "Valid self-signed certificate loaded. For full browser trust, please install your own trusted certificate",
        );
        return true;
      }
      return false;
    } catch (error) {
      this.logger.error(
        "Generated self-signed certificate could not be used",
        error,
      );
      return false;
    }
  }

  private isCertExpired(certPath: string): boolean {
    try {
      const certPem = fs.readFileSync(certPath, "utf8");
      const x509 = new crypto.X509Certificate(certPem);
      const now = new Date();
      const expiry = new Date(x509.validTo);
      return expiry < now;
    } catch (err) {
      this.logger.error("Failed to check certificate expiration");
      return true; // Assume invalid if unreadable or broken
    }
  }

  private async generateNewCert(
    generatedKeyPath: string,
    generatedCertPath: string,
  ): Promise<boolean> {
    try {
      if (!fs.existsSync(this.certPath)) {
        fs.mkdirSync(this.certPath, { recursive: true });
      }
      const attrs: CertificateField[] = [
        { name: "commonName", value: "localhost" },
        { name: "organizationName", value: APP_NAME },
      ];
      //Defaults to keySize of 2048, expires in 365 days:
      const pems = await selfsigned.generate(attrs, {
        algorithm: "sha256",
        extensions: [
          {
            name: "subjectAltName",
            altNames: [
              { type: 2, value: "localhost" }, // DNS
              { type: 7, ip: "127.0.0.1" }, // IP
            ],
          },
        ],
      });
      const key = pems.private;
      const cert = pems.cert;

      fs.writeFileSync(generatedKeyPath, key);
      fs.writeFileSync(generatedCertPath, cert);
      this.logger.success("Saved generated self-signed certificate");
      this.httpsServer = https.createServer({ key, cert }, this.app);
      this.logger.warn(
        "Valid self-signed certificate being used. For full browser trust, please install your own trusted certificate",
      );
      return true;
    } catch (error) {
      this.logger.error("Unable to generate a new certificate", error);
      return false;
    }
  }

  private restrictToLocalhost(req: Request, res: Response, next: NextFunction) {
    const isHttps = req.socket instanceof TLSSocket && req.socket.encrypted;
    const remoteAddress = req.socket.remoteAddress;
    const isLocalhost = isAddressLocalhost(remoteAddress);

    if (!isLocalhost && !isHttps) {
      this.logger.warn(
        `Blocked external HTTP access attempt from ${remoteAddress}`,
      );
      if (!this.httpsServer || this.httpsPort === null) {
        return res
          .status(403)
          .send("HTTPS required, but HTTPS is not available.");
      }
      return res.redirect(
        308,
        `https://${req.hostname}:${this.httpsPort}${req.originalUrl}`,
      );
    }
    next();
  }

  private handleListenError(
    label: "HTTP" | "HTTPS",
    err: NodeJS.ErrnoException,
  ): void {
    if (err.code === "EADDRINUSE") {
      this.logger.error(
        `${label} server failed to listen: port ${
          label === "HTTP" ? this.httpPort : (this.httpsPort ?? "unknown")
        } is already in use.`,
      );
      return;
    }
    this.logger.error(`${label} server listen error`, err);
  }

  private async handleUserLoginRequest(
    req: Request<{}, HttpLoginResponse, HttpLoginRequest>,
    res: Response<HttpLoginResponse>,
  ) {
    const rawToken = req.cookies.userSessionToken;
    let userSessionToken: string | null = null;

    if (isStringAndNotEmpty(rawToken)) userSessionToken = rawToken;

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
        "Login attempt blocked: Missing username or password, and no valid sessionToken.",
      );
      res.status(400).json({ success: false, message: "Missing credentials" });
      return;
    }

    const result = await this.activeHandlers.onUserSoftLoginRequest(
      userSessionToken,
      loginCredentials,
    );
    const { success, message, statusCode } = result;

    if (success && result.newSessionToken) {
      res.cookie("userSessionToken", result.newSessionToken, {
        httpOnly: true,
        secure: req.socket instanceof TLSSocket && req.socket.encrypted,
        sameSite: "strict",
        maxAge: SESSION_DURATION_MS,
      });
    }

    res.status(statusCode).json({ success, message });
  }

  private handleErrors(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
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

  private setPorts(httpPort: number, httpsPort: number | null): void {
    //Validation is done in NetworkController
    this.httpPort = httpPort;
    this.httpsPort = httpsPort;
    if (httpsPort === null) {
      this.logger.warn(`HTTPS disabled. No HTTPS server will be created`);
    }
  }

  private get activeHandlers(): WebServerHandlers {
    if (!this.handlers)
      throw new Error("WebServerManager handlers not initialized!");
    return this.handlers;
  }
}
