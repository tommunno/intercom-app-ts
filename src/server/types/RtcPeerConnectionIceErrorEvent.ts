export interface RtcPeerConnectionIceErrorEvent {
  errorCode: number;
  errorText?: string;
  address?: string;
  url?: string;
}
