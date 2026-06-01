import { useBannersInfo } from "../../hooks/index.js";

export function Banners() {
  const bannersInfo = useBannersInfo();
  const {
    audioLossDetected,
    soundcardDevicesErr,
    httpsErr,
    turnErr,
    sslWarning,
  } = bannersInfo;
  const anyBanner = Object.values(bannersInfo).some((b) => b);

  return (
    <div className={`banners${anyBanner ? " visible" : ""}`}>
      <div className={`banner error${audioLossDetected ? " visible" : ""}`}>
        <span className="error-icon">❌</span>
        <span className="banner-text">
          <strong className="banner-title">
            No audio was detected from the soundcard.
          </strong>
          <span className="banner-message">
            Restarting the Audio Engine may resolve the issue.
          </span>
        </span>
        <button className="btn button-bar-btn restart-btn">
          Restart Audio Engine
        </button>
      </div>
      <div className={`banner error${soundcardDevicesErr ? " visible" : ""}`}>
        <span className="error-icon">❌</span>
        <span className="banner-text">
          <strong className="banner-title">
            No valid soundcard devices were found.
          </strong>
          <span className="banner-message">
            A valid device needs at least one input and one output. You may need
            to create an Aggregate Device in Audio MIDI Setup, then restart the
            Audio Engine.{" "}
            <a className="link" href="/docs">
              Need help? See docs.
            </a>
          </span>
        </span>
        <button className="btn button-bar-btn restart-btn">
          Restart Audio Engine
        </button>
      </div>
      <div className={`banner error${httpsErr || turnErr ? " visible" : ""}`}>
        <span className="error-icon">❌</span>
        <span className="banner-text">
          <strong className="banner-title">
            {`The ${httpsErr ? "HTTPS server" : ""} ${httpsErr && turnErr ? "and TURN server were" : turnErr ? "TURN server was" : "was"} unable to start.`}
          </strong>
          <span className="banner-message">
            {`${httpsErr && turnErr ? "Their ports are" : "The port is"} already in use. Please update the relevant port variable${httpsErr && turnErr ? "s" : ""} in `}
            <code className="code">.env</code> and restart the app.{" "}
            <a className="link" href="/docs">
              Need help? See docs.
            </a>
          </span>
        </span>
      </div>
      <div className={`banner warning${sslWarning ? " visible" : ""}`}>
        <span className="warning-icon">⚠️</span>

        <span className="banner-text">
          <strong className="banner-title">
            A valid SSL certificate is recommended for trusted browser access.
          </strong>

          <span className="banner-message">
            Place <code className="code">server.cert</code> and{" "}
            <code className="code">server.key</code> in the project root{" "}
            <code className="code">certs</code> folder.{" "}
            <a className="link" href="/docs">
              Need help? See docs.
            </a>
          </span>
        </span>
      </div>
    </div>
  );
}
