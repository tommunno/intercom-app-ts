import { dataIsObject } from "../helpers.js";

// eslint-disable-next-line
export interface Ipv4Interfaces {}

//Add in validation here!
export function dataIsIpv4Interfaces(data: unknown): data is Ipv4Interfaces {
  return dataIsObject(data);
}
