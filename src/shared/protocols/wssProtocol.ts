import type { MaybePromise } from "../types/MaybePromise.js";

export const WSS_TYPE = {
  USER_LOGIN: "USER_LOGIN",
  ADMIN_LOGIN: "ADMIN_LOGIN",
} as const;

export interface WssPayloads {
  [WSS_TYPE.USER_LOGIN]: { myNumber: number };
  [WSS_TYPE.ADMIN_LOGIN]: { myString: string };
}

export type WssCommandMap = {
  [K in keyof WssPayloads]: (
    data: WssPayloads[K],
    clientId: string
  ) => MaybePromise<void>;
};
