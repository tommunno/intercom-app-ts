import type {
  AdminAuthResult,
  AuthResult,
  LoginCredentials,
} from "../../../shared/types/index.js";
import type {
  DownloadLogsOptions,
  DownloadLogsResult,
  Servers,
  WebServerResolvedData,
} from "../../types/index.js";

export interface WebServerAdminInfo {
  httpsPort: number | null;
  httpPort: number;
  domainName: string | null;
  isSslCertValid: boolean;
}

export interface WebServerHandlers {
  onUserSoftLoginRequest: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AuthResult>;
  onAdminSoftLoginRequest: (
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ) => Promise<AdminAuthResult>;
  onDownloadLogsRequest: (
    sessionToken: string,
    options: DownloadLogsOptions,
  ) => DownloadLogsResult;
}

export interface IWebServerManager {
  init: () => Promise<Servers>;
  populate: (data: WebServerResolvedData) => void;
  start: () => void;
  setHandlers: (handlers: WebServerHandlers) => void;

  getAdminInfo: () => WebServerAdminInfo;
}
