import type {
  HttpLoginRequest,
  HttpLoginResponse,
} from "../../../shared/types/index.js";

export interface IHttpManager {
  init: () => void;
  start: () => void;
  softLoginUser: (request: HttpLoginRequest) => Promise<HttpLoginResponse>;
  softLoginAdmin: (request: HttpLoginRequest) => Promise<HttpLoginResponse>;
}
