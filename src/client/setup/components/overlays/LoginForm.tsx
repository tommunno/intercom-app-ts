import { useEffect, useEffectEvent, useRef, useState } from "react";
import { PasswordVisibilityToggle } from "../form/PasswordVisibilityToggle.jsx";
import logger from "../../../shared/logging/logger.js";
import { softLogin } from "../../helpers/index.js";
import setupWss from "../../managers/setupWss.js";

const log = logger.child({ context: "LoginForm" });

function shakeLogin(windowWrapperEl: HTMLDivElement): void {
  // Remove the class if it's already there
  windowWrapperEl.classList.remove("shake");

  // Force reflow so re-adding the class restarts the animation
  void windowWrapperEl.offsetWidth;

  // Add the class again
  windowWrapperEl.classList.add("shake");
}

type LoginFormScene = "idle" | "loading";

export interface LoginFormProps {
  onLogin: () => void;
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [scene, setScene] = useState<LoginFormScene>("loading");
  const [errMessage, setErrMessage] = useState<string | null>(null);
  const [passwordVisible, setPasswordVisible] = useState<boolean>(false);
  const windowWrapperRef = useRef<HTMLDivElement | null>(null);

  const onLoginEvent = useEffectEvent(onLogin);

  function hardLogin() {
    setupWss.connect();
    setupWss.send("ADMIN_LOGIN", null);
  }

  //Hard Login Response:
  useEffect(() => {
    const unsubscribe = setupWss.subscribe(
      "ADMIN_LOGIN_RESPONSE",
      (payload) => {
        if (!payload.success) {
          setErrMessage(payload.message);
          setScene("idle");
          if (windowWrapperRef.current) {
            shakeLogin(windowWrapperRef.current);
          }
          return;
        }
        //Successful hard login:
        onLoginEvent();
      },
    );
    return unsubscribe;
  }, []);

  //Auto login:
  useEffect(() => {
    let ignore = false;
    //Try automatic login on mount, using no credentials
    //(the server will use the sessionToken)
    const autoLogin = async () => {
      const result = await softLogin({
        username: null,
        password: null,
        logger: log,
      });
      if (ignore) {
        return;
      }
      if (!result.success) {
        setScene("idle");
        return;
      }
      log.success("Successful auto soft login");
      hardLogin();
    };
    autoLogin();
    return () => {
      ignore = true;
    };
  }, []);

  //Manual user login:
  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username: string = String(formData.get("username") ?? "");
    const password: string = String(formData.get("password") ?? "");
    if (username === "" || password === "") {
      setErrMessage("Please enter a username and password");
      if (windowWrapperRef.current) {
        shakeLogin(windowWrapperRef.current);
      }
      return;
    }
    setScene("loading");
    setPasswordVisible(false);
    const result = await softLogin({ username, password, logger: log });
    if (!result.success) {
      setErrMessage(result.message);
      setScene("idle");
      if (windowWrapperRef.current) {
        shakeLogin(windowWrapperRef.current);
      }
      return;
    }
    log.success("Successful soft login");
    setErrMessage(null);
    hardLogin();
  }

  return (
    <div className="modal-overlay-login-form">
      <div className="login-window-wrapper" ref={windowWrapperRef}>
        <div className="login-window">
          <form className="login-form" method="post" onSubmit={handleSubmit}>
            <h2 className="login-form-title">Admin login</h2>
            <div className="username-input-group input-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                name="username"
                autoComplete="username"
              />
            </div>
            <div className="password-input-group input-group">
              <label htmlFor="password">Password</label>
              <div className="password-input-wrapper">
                <input
                  type={passwordVisible ? "text" : "password"}
                  id="password"
                  name="password"
                  autoComplete="current-password"
                />
                <PasswordVisibilityToggle
                  visible={passwordVisible}
                  onToggle={() => setPasswordVisible((v) => !v)}
                />
              </div>
            </div>
            {errMessage !== null && (
              <p className="login-error-message">{errMessage}</p>
            )}
            <button
              type="submit"
              className="btn login-btn"
              disabled={scene === "loading"}
            >
              Login
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
