export interface PanelWebRtcHandlers {}

export interface IPanelWebRtcManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: PanelWebRtcHandlers) => void;
}
