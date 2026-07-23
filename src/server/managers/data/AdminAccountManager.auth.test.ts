import { beforeEach, describe, expect, test, vi } from "vitest";
import type {
  AdminAccountHandlers,
  IAdminAccountManager,
} from "../../contracts/index.js";
import { AdminAccountManager } from "./AdminAccountManager.js";
import { Logger } from "../base/Logger.js";
import { type LoginCredentials } from "../../../shared/types/index.js";

const ONE_DAY_MS = 24 * 60 * 60 * 1_000;
const VALID_SESSION_TOKEN = "valid-token";
const EXPIRED_SESSION_TOKEN = "expired-token";
const VALID_USERNAME = "test-admin";
const VALID_PASSWORD = "test-password";
const VALID_PASSWORD_HASH =
  "$2b$04$UPhlj3IP.r948WzNAfkkQe3i1NgVLI4kYWrW2viIHF405RxdfDSx2";

let adminAccountManager: IAdminAccountManager;
let mockHandlers: AdminAccountHandlers;

beforeEach(async () => {
  adminAccountManager = new AdminAccountManager(new Logger());
  mockHandlers = {
    onHeartbeat: vi.fn(),
    onStaleHeartbeat: vi.fn(),
    onSessionTokensCleanedUp: vi.fn(),
  };
  adminAccountManager.init();
  await adminAccountManager.populate({
    username: VALID_USERNAME,
    passwordHash: VALID_PASSWORD_HASH,
    sessionTokenInfos: [
      { token: VALID_SESSION_TOKEN, expiresAtMs: Date.now() + ONE_DAY_MS },
      { token: EXPIRED_SESSION_TOKEN, expiresAtMs: Date.now() - ONE_DAY_MS },
    ],
  });
  adminAccountManager.setHandlers(mockHandlers);
  adminAccountManager.start();

  return () => {
    if (adminAccountManager.status === "RUNNING") {
      adminAccountManager.stop();
    }
  };
});

describe("AdminAccountManager auth", () => {
  describe("softLogin", () => {
    test("authenticates with valid session token", async () => {
      const authResult = await adminAccountManager.softLogin(
        VALID_SESSION_TOKEN,
        { username: null, password: null },
      );

      expect(authResult).toEqual({
        success: true,
        message: "Login approved with session token",
        statusCode: 200,
        newSessionToken: null,
      });
      expect(
        adminAccountManager.validateSessionToken(VALID_SESSION_TOKEN),
      ).toBe(true);
    });

    test("rejects with expired session token (no login creds provided)", async () => {
      const authResult = await adminAccountManager.softLogin(
        EXPIRED_SESSION_TOKEN,
        {
          username: null,
          password: null,
        },
      );

      expect(authResult).toEqual({
        success: false,
        message: "Invalid session token",
        statusCode: 401,
      });
      expect(
        adminAccountManager.validateSessionToken(EXPIRED_SESSION_TOKEN),
      ).toBe(false);
    });

    // Use objects so null displays clearly in parameterised test names.
    test.for<{ sessionToken: string | null }>([
      { sessionToken: null },
      { sessionToken: VALID_SESSION_TOKEN },
      { sessionToken: EXPIRED_SESSION_TOKEN },
      { sessionToken: "invalid" },
    ])(
      "authenticates with valid credentials (sessionToken: $sessionToken)",
      async ({ sessionToken }) => {
        const authResult = await adminAccountManager.softLogin(sessionToken, {
          username: VALID_USERNAME,
          password: VALID_PASSWORD,
        });

        expect(authResult).toEqual({
          success: true,
          message: "Login approved with credentials",
          statusCode: 200,
          newSessionToken: expect.any(String),
        });

        if (!authResult.success || authResult.newSessionToken === null) {
          throw new Error("Expected successful login with a session token");
        }
        expect(
          adminAccountManager.validateSessionToken(authResult.newSessionToken),
        ).toBe(true);
      },
    );

    const parameterSets: {
      sessionToken: string | null;
      username: string | null;
      password: string | null;
    }[] = [];
    const tokens: (string | null)[] = [
      null,
      VALID_SESSION_TOKEN,
      EXPIRED_SESSION_TOKEN,
      "invalid",
    ];
    const loginCredentials: LoginCredentials[] = [
      { username: "invalid username", password: "invalid password" },
      { username: VALID_USERNAME, password: "invalid password" },
      { username: "invalid username", password: VALID_PASSWORD },
    ];
    loginCredentials.forEach(({ username, password }) => {
      tokens.forEach((sessionToken) => {
        parameterSets.push({ sessionToken, username, password });
      });
    });

    test.for(parameterSets)(
      "rejects with invalid credentials (sessionToken: $sessionToken, username: $username, password: $password)",
      async ({ sessionToken, username, password }) => {
        const authResult = await adminAccountManager.softLogin(sessionToken, {
          username,
          password,
        });

        expect(authResult).toEqual({
          success: false,
          message: "Incorrect username or password",
          statusCode: 401,
        });

        if (sessionToken !== null) {
          expect(adminAccountManager.validateSessionToken(sessionToken)).toBe(
            sessionToken === VALID_SESSION_TOKEN,
          );
        }
      },
    );

    test.for<LoginCredentials>([
      { username: VALID_USERNAME, password: null },
      { username: "invalid username", password: null },
      { username: null, password: VALID_PASSWORD },
      { username: null, password: "invalid password" },
    ])(
      "rejects with null credential (username: $username, password: $password)",
      async ({ username, password }) => {
        const authResult = await adminAccountManager.softLogin(null, {
          username,
          password,
        });

        expect(authResult).toEqual({
          success: false,
          message: "Missing credentials",
          statusCode: 400,
        });
      },
    );

    test("rejects with null credentials", async () => {
      const authResult = await adminAccountManager.softLogin(null, {
        username: null,
        password: null,
      });

      expect(authResult).toEqual({
        success: false,
        message: "No credentials or session token provided",
        statusCode: 400,
      });
    });
  });
});
