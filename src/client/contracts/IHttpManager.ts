import type { HttpLoginRequest } from "../../shared/types/HttpLoginRequest.js";
import type { HttpLoginResponse } from "../../shared/types/HttpLoginResponse.js";

export interface IHttpManager {
  init: () => void;
  start: () => void;
  softLoginUser: (request: HttpLoginRequest) => Promise<HttpLoginResponse>;
  softLoginAdmin: (request: HttpLoginRequest) => Promise<HttpLoginResponse>;
}
