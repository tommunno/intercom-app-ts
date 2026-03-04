export interface AdminLoggedInClientInfo {
  clientId: string;
  sessionToken: string;
  lastHeartbeatResponse: number | null;
}
