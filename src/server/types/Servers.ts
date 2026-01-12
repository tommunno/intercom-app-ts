import http from "http";
import https from "https";

export interface Servers {
  http: http.Server | null;
  https: https.Server | null;
}
