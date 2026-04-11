import { useState } from "react";
import { useWebServerInfo } from "../../hooks/useWebServerInfo.js";

export function WebServerSection() {
  const [isHidden, setIsHidden] = useState<boolean>(false);
  const {
    httpsPort,
    httpPort,
    turnServerPort,
    isTurnServerOnline,
    // ipv4Interfaces,
    domainName,
    isSslCertValid,
    cpuUsage,
    memoryUsage,
  } = useWebServerInfo();
  const noHttps = httpsPort === null;
  const noTurn = turnServerPort === null;
  const localOrNoDomain = domainName === "localhost" || domainName === null;
  const noCpuUsage = cpuUsage === null;
  const noMemoryUsage = memoryUsage === null;
  const cpuColor = noCpuUsage
    ? ""
    : cpuUsage < 25
      ? " green"
      : cpuUsage < 60
        ? " orange"
        : " red";
  const memoryColor = noMemoryUsage
    ? ""
    : memoryUsage < 150
      ? " green"
      : memoryUsage < 250
        ? " orange"
        : " red";

  return (
    <div className={`web-server-section section${isHidden ? " hidden" : ""}`}>
      <h2
        className="web-server-section-title section-title"
        onClick={() => setIsHidden((h) => !h)}
      >
        Web Server: <span className="expanding-arrow closed">&#9660;</span>
        <span className="expanding-arrow open">&#9650;</span>
      </h2>

      <div className="web-server-inner-section inner-section not-table">
        <div className="web-server-info-title">
          <h2>Info</h2>
        </div>
        <p className="client-webpage-url-label label">Client Web Page URL:</p>
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className="client-webpage-url value"
        >
          <pre>{noHttps ? "http:" : "https:"}//</pre>
          <span className="client-webpage-url-ip-separator">+</span>
          <pre className="client-webpage-url-ip">
            {noHttps ? "localhost" : "Your Server IP"}
          </pre>
          <span className="client-webpage-url-port-separator">+</span>
          <pre className="client-webpage-url-port">
            :{noHttps ? httpPort : httpsPort}
          </pre>
        </a>
        <p className="HTTPS-port-label label">HTTPS Port:</p>
        <p className={`HTTPS-port value ${noHttps ? "red" : "green"}`}>
          {noHttps ? "Port already in use" : httpsPort}
        </p>
        <p className="HTTP-port-label label">
          HTTP Port:
          <span className="label-darker"> (only works on localhost)</span>
        </p>
        <p className="HTTP-port value green">{httpPort}</p>
        <p className="turn-server-port-label label">TURN Server Port:</p>
        <p
          className={`turn-server-port value ${noTurn || !isTurnServerOnline ? "red" : "green"}`}
        >
          <span className="turn-server-port-number">
            {noTurn ? "Port already in use" : turnServerPort}
          </span>
          <span className="turn-server-port-status">
            {isTurnServerOnline ? "" : noTurn ? "" : " (Offline)"}
          </span>
        </p>
        <p className="turn-server-ip-label label">TURN Server IP:</p>
        <form className="turn-server-ip value">
          <select
            id="turn-server-ip-select"
            name="turn-server-ip-select"
            disabled
          >
            <option value="">Not currently supported</option>
          </select>
          <button className="btn change-turn-server-ip-btn" disabled>
            Change IP
          </button>
        </form>
        <p className="domain-name-label label">Domain Name:</p>
        <p
          className={`domain-name value ${localOrNoDomain ? "orange" : "green"}`}
        >
          {localOrNoDomain ? "None" : domainName}
        </p>
        <p className="valid-ssl-certificate-label label">
          Valid SSL Certificate:
        </p>
        <p
          className={`valid-ssl-certificate value ${isSslCertValid ? "green" : "orange"}`}
        >
          {isSslCertValid ? "Yes" : "No"}
        </p>
        <p className="cpu-usage-label label">CPU Usage:</p>
        <p className={`cpu-usage value${cpuColor}`}>
          {noCpuUsage ? "..." : cpuUsage + "%"}
        </p>
        <p className="memory-usage-label label">Memory Usage:</p>
        <p className={`memory-usage value${memoryColor}`}>
          {noMemoryUsage ? "..." : memoryUsage + " MB"}
        </p>
      </div>
    </div>
  );
}
