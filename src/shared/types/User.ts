export interface BaseUser {
  id: number;
  username: string;
  password: string | null;
}

export interface User extends BaseUser {
  loggedIn: boolean;
  clientId: string | null;
  sessionTokenInUse: string | null;
  sessionTokens: string[];
}

export function dataIsBaseUser(data: unknown): data is BaseUser {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  return (
    typeof d.id === "number" &&
    typeof d.username === "string" &&
    (typeof d.password === "string" || d.password === null)
  );
}

//Checks types:
export function dataIsUser(data: unknown): data is User {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  if (!Array.isArray(d.sessionTokens)) return false;
  const everyElIsString = d.sessionTokens.every((el) => typeof el === "string");
  if (!everyElIsString) return false;

  return (
    dataIsBaseUser(data) &&
    typeof d.loggedIn === "boolean" &&
    (typeof d.clientId === "string" || d.clientId === null) &&
    (typeof d.sessionTokenInUse === "string" || d.sessionTokenInUse === null)
  );
}
