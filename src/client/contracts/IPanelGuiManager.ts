export interface PanelGuiManagerHandlers {
  onLoginAttempt(username: string, password: string): void;
}

export interface IPanelGuiManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: PanelGuiManagerHandlers) => void;
  setLoginError: (errMessage: string | null) => void;
  setLoginLoading: (isLoading: boolean) => void;
}
