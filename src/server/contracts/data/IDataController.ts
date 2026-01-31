import type {
  AuthResult,
  HeartbeatRequestPayload,
  LoginCredentials,
  UserInfo,
} from "../../../shared/types/index.js";
import type { AudioData } from "../../types/AudioData.js";
import type { NetworkData } from "../../types/NetworkData.js";
import type { WssSendMessage } from "../../types/WssSendMessage.js";

export interface DataHandlers {
  onAccountHeartbeat(
    clientIds: string[],
    payload: HeartbeatRequestPayload,
  ): void;
  onStaleHeartbeat(clientId: string): void;
}

export interface IDataController {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: DataHandlers) => void;

  softLoginUser: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AuthResult>;

  loginUser: (sessionToken: string | null, clientId: string) => AuthResult;

  logoutUser(userId: number, hardLogout?: boolean): number | null;
  logoutUser(clientId: string, hardLogout?: boolean): number | null;

  //Returns userId if successful:
  isClientIdLoggedIn: (clientId: string) => number | null;
  //Returns clientId if successful:
  isUserIdLoggedIn: (userId: number) => string | null;
  getUserInfo: (userId: number) => UserInfo | null;
  processHeartbeatResponse: (timestamp: number, clientId: string) => void;

  getNetworkData: () => NetworkData;
  getAudioData: () => AudioData;
}
