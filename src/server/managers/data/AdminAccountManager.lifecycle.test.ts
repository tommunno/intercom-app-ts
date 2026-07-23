import { beforeEach, expect, test, describe, vi } from "vitest";
import { Logger } from "../base/Logger.js";
import { AdminAccountManager } from "./AdminAccountManager.js";
import type {
  AdminAccountHandlers,
  IAdminAccountManager,
} from "../../contracts/index.js";

let adminAccountManager: IAdminAccountManager;

let mockHandlers: AdminAccountHandlers;

beforeEach(() => {
  adminAccountManager = new AdminAccountManager(new Logger());
  mockHandlers = {
    onHeartbeat: vi.fn(),
    onStaleHeartbeat: vi.fn(),
    onSessionTokensCleanedUp: vi.fn(),
  };

  return () => {
    if (adminAccountManager.status === "RUNNING") {
      adminAccountManager.stop();
    }
  };
});

describe("AdminAccountManager lifecycles", () => {
  describe("when IDLE", () => {
    test("initializes", () => {
      expect(adminAccountManager.status).toBe("IDLE");
      adminAccountManager.init();
      expect(adminAccountManager.status).toBe("INITIALIZED");
    });

    test("throws error if populate is called", async () => {
      expect(adminAccountManager.status).toBe("IDLE");
      await expect(
        adminAccountManager.populate({}),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot populate the AdminAccountManager whilst its status is IDLE]`,
      );
      expect(adminAccountManager.status).toBe("IDLE");
    });

    test("throws error if start is called", () => {
      expect(adminAccountManager.status).toBe("IDLE");
      expect(() => {
        adminAccountManager.start();
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot start the AdminAccountManager whilst its status is IDLE]`,
      );
      expect(adminAccountManager.status).toBe("IDLE");
    });

    test("status is IDLE if stop is called", () => {
      expect(adminAccountManager.status).toBe("IDLE");
      adminAccountManager.stop();
      expect(adminAccountManager.status).toBe("IDLE");
    });
  });

  describe("when INITIALIZED", () => {
    beforeEach(() => {
      adminAccountManager.init();
    });

    test("throws error if init is called", () => {
      expect(adminAccountManager.status).toBe("INITIALIZED");
      expect(() => {
        adminAccountManager.init();
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot initialize the AdminAccountManager whilst its status is INITIALIZED]`,
      );
      expect(adminAccountManager.status).toBe("INITIALIZED");
    });

    test("populates", async () => {
      expect(adminAccountManager.status).toBe("INITIALIZED");
      await adminAccountManager.populate({});
      expect(adminAccountManager.status).toBe("POPULATED");
    });

    test("throws error if start is called", () => {
      expect(adminAccountManager.status).toBe("INITIALIZED");
      expect(() => {
        adminAccountManager.start();
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot start the AdminAccountManager whilst its status is INITIALIZED]`,
      );
      expect(adminAccountManager.status).toBe("INITIALIZED");
    });

    test("status is INITIALIZED if stop is called", () => {
      expect(adminAccountManager.status).toBe("INITIALIZED");
      adminAccountManager.stop();
      expect(adminAccountManager.status).toBe("INITIALIZED");
    });
  });

  describe("when POPULATED", () => {
    beforeEach(async () => {
      adminAccountManager.init();
      await adminAccountManager.populate({});
    });

    test("throws error if init is called", () => {
      expect(adminAccountManager.status).toBe("POPULATED");
      expect(() => {
        adminAccountManager.init();
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot initialize the AdminAccountManager whilst its status is POPULATED]`,
      );
      expect(adminAccountManager.status).toBe("POPULATED");
    });

    test("throws error if populate is called", async () => {
      expect(adminAccountManager.status).toBe("POPULATED");
      await expect(
        adminAccountManager.populate({}),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot populate the AdminAccountManager whilst its status is POPULATED]`,
      );
      expect(adminAccountManager.status).toBe("POPULATED");
    });

    test("starts", () => {
      expect(adminAccountManager.status).toBe("POPULATED");
      adminAccountManager.setHandlers(mockHandlers);
      adminAccountManager.start();
      expect(adminAccountManager.status).toBe("RUNNING");
    });

    test("status is POPULATED if stop is called", () => {
      expect(adminAccountManager.status).toBe("POPULATED");
      adminAccountManager.stop();
      expect(adminAccountManager.status).toBe("POPULATED");
    });

    test("throws error if starting when handlers aren't initialised", () => {
      expect(adminAccountManager.status).toBe("POPULATED");
      expect(() => {
        adminAccountManager.start();
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: AdminAccountManager handlers not initialized!]`,
      );
      expect(adminAccountManager.status).toBe("POPULATED");
    });
  });

  describe("when RUNNING", () => {
    beforeEach(async () => {
      adminAccountManager.init();
      await adminAccountManager.populate({});
      adminAccountManager.setHandlers(mockHandlers);
      adminAccountManager.start();
    });

    test("throws error if init is called", () => {
      expect(adminAccountManager.status).toBe("RUNNING");
      expect(() => {
        adminAccountManager.init();
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot initialize the AdminAccountManager whilst its status is RUNNING]`,
      );
      expect(adminAccountManager.status).toBe("RUNNING");
    });

    test("throws error if populate is called", async () => {
      expect(adminAccountManager.status).toBe("RUNNING");
      await expect(
        adminAccountManager.populate({}),
      ).rejects.toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot populate the AdminAccountManager whilst its status is RUNNING]`,
      );
      expect(adminAccountManager.status).toBe("RUNNING");
    });

    test("throws error if start is called", () => {
      expect(adminAccountManager.status).toBe("RUNNING");
      expect(() => {
        adminAccountManager.start();
      }).toThrowErrorMatchingInlineSnapshot(
        `[Error: Cannot start the AdminAccountManager whilst its status is RUNNING]`,
      );
      expect(adminAccountManager.status).toBe("RUNNING");
    });

    test("stops", () => {
      expect(adminAccountManager.status).toBe("RUNNING");
      adminAccountManager.stop();
      expect(adminAccountManager.status).toBe("IDLE");
    });
  });
});
