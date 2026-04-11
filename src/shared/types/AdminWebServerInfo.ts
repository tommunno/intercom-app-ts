import { dataIsObject, dataIsType, dataIsTypeAOrB } from "../helpers.js";
import { dataIsIpv4Interfaces, type Ipv4Interfaces } from "./Ipv4Interfaces.js";

export interface AdminWebServerInfo {
  httpsPort: number | null;
  httpPort: number;
  turnServerPort: number | null;
  isTurnServerOnline: boolean;
  ipv4Interfaces: Ipv4Interfaces;
  domainName: string | null;
  isSslCertValid: boolean;
  cpuUsage: number | null;
  memoryUsage: number | null;
}

export function dataIsAdminWebServerInfo(
  data: unknown,
): data is AdminWebServerInfo {
  return (
    dataIsObject(data) &&
    dataIsTypeAOrB("number", "null", data.httpsPort) &&
    dataIsType("number", data.httpPort) &&
    dataIsTypeAOrB("number", "null", data.turnServerPort) &&
    dataIsType("boolean", data.isTurnServerOnline) &&
    dataIsIpv4Interfaces(data.ipv4Interfaces) &&
    dataIsTypeAOrB("string", "null", data.domainName) &&
    dataIsType("boolean", data.isSslCertValid) &&
    dataIsTypeAOrB("number", "null", data.cpuUsage) &&
    dataIsTypeAOrB("number", "null", data.memoryUsage)
  );
}
