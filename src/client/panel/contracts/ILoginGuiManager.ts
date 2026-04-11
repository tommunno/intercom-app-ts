export interface LoginGuiManagerHandlers {
  onLoginAttempt(username: string, password: string): void;
}

export interface ILoginGuiManager {
  init: () => void;
  start: () => void;
  setHandlers: (handlers: LoginGuiManagerHandlers) => void;
  setLoginError: (errMessage: string | null) => void;
  setLoginLoading: (isLoading: boolean) => void;
  setLoginVisible: (isVisible: boolean) => void;
  shakeLogin: () => void;
}
