import { dataIsObject, dataIsType } from "../helpers.js";

export interface TurnServerCredentials {
  username: string;
  credential: string;
}

export function dataIsTurnServerCredentials(
  data: unknown,
): data is TurnServerCredentials {
  return (
    dataIsObject(data) &&
    dataIsType("string", data.username) &&
    dataIsType("string", data.credential)
  );
}
