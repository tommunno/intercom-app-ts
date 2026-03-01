//Types:
import type {
  WssDownstream,
  WssPayloads,
  WssUpstream,
} from "../../shared/protocols/index.js";
import type {
  AuthResult,
  LoginCredentials,
  RtcAnswerWire,
  RtcIceCandidateInitWire,
  RtcOfferWire,
  TurnServerInfo,
} from "../../shared/types/index.js";
import type {
  INetworkController,
  ILogger,
  IWebServerManager,
  IWssManager,
  IWebRtcManager,
  ITurnServerManager,
  NetworkHandlers,
} from "../contracts/index.js";
import type {
  NetworkData,
  NetworkResolvedData,
  TurnServerResolvedData,
  WebServerResolvedData,
} from "../types/NetworkData.js";
import type { TrackAndStream } from "../types/TrackAndStream.js";
import type { WssMessageInfo } from "../types/WssMessageInfo.js";
import type { PortInfo } from "../types/PortInfo.js";
//Constants:
import {
  DEFAULT_HTTP_PORT,
  DEFAULT_HTTPS_PORT,
  DEFAULT_TURN_SERVER_PORT,
} from "../constants/serverConstants.js";
import type { PortType } from "../types/PortType.js";
import {
  findRandomAvailablePort,
  isPortAvailable,
  validatePort,
} from "../serverHelpers.js";

export class NetworkController implements INetworkController {
  private handlers: NetworkHandlers | null = null;

  constructor(
    private webServerManager: IWebServerManager,
    private wssManager: IWssManager,
    private webRtcManager: IWebRtcManager,
    private turnServerManager: ITurnServerManager,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "NetworkController" });
  }

  async init(): Promise<void> {
    this.bindListeners();
    const servers = await this.webServerManager.init();
    this.wssManager.init(servers);
    const serverCreds = this.turnServerManager.init();
    this.webRtcManager.init(serverCreds);
  }

  async populate(data: NetworkData): Promise<void> {
    const resolvedData = await this.resolvePorts(data);
    this.webServerManager.populate(resolvedData.webServerResolvedData);
    let url: string | null = null;
    const { turnServerResolvedData: turnData } = resolvedData;
    if (turnData) {
      url = this.turnServerManager.populate(turnData);
    }
    this.webRtcManager.populate(url);
  }

  start(): void {
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.webServerManager.start();
    this.wssManager.start();
    if (this.turnServerManager.status === "POPULATED") {
      this.turnServerManager.start();
    } else {
      this.logger.warn(`Will not start the Turn Server`);
    }
    this.webRtcManager.start();
  }

  setHandlers(handlers: NetworkHandlers): void {
    this.handlers = handlers;
  }

  //WssManager:

  sendWssMessage<K extends WssDownstream>(
    type: K,
    payload: WssPayloads[K],
    clientIds: string[],
  ): void {
    this.wssManager.sendMessage(type, payload, clientIds);
  }

  //WssManager Helpers:
  sendLoginFailureMessage(clientId: string, message?: string): void {
    this.sendWssMessage(
      "USER_LOGIN_RESPONSE",
      {
        success: false,
        message: message ?? "Internal server error",
        userInfo: null,
        audioInfo: null,
        turnServerInfo: null,
      },
      [clientId],
    );
  }

  //WebRtcManager:

  createRtcPeerConnection(clientId: string): void {
    this.webRtcManager.createPeerConnection(clientId);
  }

  processRtcRemoteOffer(clientId: string, offer: RtcOfferWire): void {
    this.webRtcManager.processRemoteOffer(clientId, offer);
  }

  processRtcRemoteIceCandidate(
    clientId: string,
    candidate: RtcIceCandidateInitWire | null,
  ): void {
    this.webRtcManager.processRemoteIceCandidate(clientId, candidate);
  }

  addRtcTxTrackAndStream(
    clientId: string,
    trackAndStream: TrackAndStream,
  ): void {
    this.webRtcManager.addTxTrackAndStream(clientId, trackAndStream);
  }

  closeRtcClient(clientId: string): void {
    this.webRtcManager.closeClient(clientId);
  }

  getTurnServerInfo(): TurnServerInfo | null {
    if (this.turnServerManager.status === "RUNNING") {
      const credentials = this.turnServerManager.createClientCredentials();
      if (!credentials) return null;
      return {
        port: this.turnServerManager.port,
        credentials,
      };
    }
    return null;
  }

  //Private methods:
  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("NetworkController handlers not initialized!");
    return this.handlers;
  }

  private bindListeners(): void {
    this.webServerManager.setHandlers({
      onUserSoftLoginRequest: (s, l) => this.handleUserSoftLoginRequest(s, l),
    });

    this.wssManager.setHandlers({
      onMessage: this.handleWssMessage.bind(this),
      onClientDisconnect: (c) => this.handleClientDisconnect(c),
      onClientError: (c) => this.handleClientError(c),
    });

    this.webRtcManager.setHandlers({
      onRtcConnected: (c) => this.handleRtcConnected(c),
      onRtcDisconnected: (c) => this.handleRtcDisconnected(c),
      onRtcClosed: (c) => this.handleRtcClosed(c),
      onRtcFailed: (c) => this.handleRtcFailed(c),
      onRtcAnswer: (c, a) => this.handleRtcAnswer(c, a),
      onRtcIceCandidate: (c, i) => this.handleRtcIceCandidate(c, i),
      onRtcTrack: (c, t) => this.handleRtcTrack(c, t),
    });

    this.turnServerManager.setHandlers({});
  }

  private async resolvePorts(data: NetworkData): Promise<NetworkResolvedData> {
    const portInfos: PortInfo[] = [
      { type: "HTTP", default: true, value: DEFAULT_HTTP_PORT },
      { type: "HTTPS", default: true, value: DEFAULT_HTTPS_PORT },
      { type: "TURN", default: true, value: DEFAULT_TURN_SERVER_PORT },
    ];
    let { httpPort, httpsPort } = data.webServerData;
    let { port: turnPort } = data.turnServerData;
    [httpPort, httpsPort, turnPort].forEach((port, i) => {
      const portInfo = portInfos[i];
      if (!portInfo) {
        throw new Error(
          `NetworkController: resolvePorts: Invariant violation: can not find portInfo for index ${i}`,
        );
      }
      if (port === undefined) {
        this.logger.info(
          `${portInfo.type} port not provided, will attempt to use default port ${portInfo.value}...`,
        );
      } else if (!validatePort(port)) {
        this.logger.error(
          `${portInfo.type} port ${port} invalid, will attempt to use default port ${portInfo.value}...`,
        );
      } else {
        const portsAlreadyAssigned = portInfos.slice(0, i);
        let result = this.doesPortClash(port, portsAlreadyAssigned);
        if (!result.clash) {
          portInfo.value = port;
          portInfo.default = false;
        } else {
          this.logger.error(
            `${portInfo.type} port ${port} clashes with ${result.clashesWith} port. Unable to run the ${portInfo.type} server`,
          );
          portInfo.value = null;
        }
      }
    });
    await this.nullifyUnavailablePortsInPlace(portInfos);
    const httpPortInfo = portInfos.find((p) => p.type === "HTTP");
    if (!httpPortInfo) {
      throw new Error(
        `resolvePorts: Invariant violation: can not find httpPortInfo`,
      );
    }
    if (httpPortInfo.value === null) {
      const portsToAvoid = new Set<number>();
      portInfos.forEach((portInfo) => {
        if (portInfo.type === "HTTP" || portInfo.value === null) return;
        portsToAvoid.add(portInfo.value);
      });
      const newPort = await findRandomAvailablePort(portsToAvoid);
      if (newPort !== null) {
        httpPortInfo.value = newPort;
        httpPortInfo.default = false;
      } else {
        throw new Error(
          `NetworkController: Unable to find an available port for the HTTP server`,
        );
      }
    }
    this.logPortInfosSummary(portInfos);
    const resolvedData = this.createResolvedData(data, portInfos);
    return resolvedData;
  }

  private doesPortClash(
    port: number,
    portInfos: PortInfo[],
  ): { clash: true; clashesWith: PortType } | { clash: false } {
    for (const portInfo of portInfos) {
      if (portInfo.value === port) {
        return { clash: true, clashesWith: portInfo.type };
      }
    }
    return { clash: false };
  }

  private async nullifyUnavailablePortsInPlace(
    portInfos: PortInfo[],
  ): Promise<void> {
    for (const p of portInfos) {
      if (p.value !== null) {
        const result = await isPortAvailable(p.value);
        if (!result.isAvailable) {
          p.value = null;
          this.logger.error(`${p.type} port is not free`, result.err);
        }
      }
    }
  }

  private logPortInfosSummary(portInfos: PortInfo[]): void {
    let message = "Using ";
    portInfos.forEach((portInfo, i) => {
      const end =
        i < portInfos.length - 2
          ? ", "
          : i < portInfos.length - 1
            ? " and "
            : "";

      if (portInfo.value === null) {
        message += `no port for the ${portInfo.type} server${end}`;
        return;
      }
      message += `${portInfo.default ? "default " : ""}${portInfo.type} port ${portInfo.value}${end}`;
    });

    this.logger.info(message);
  }

  private createResolvedData(
    data: NetworkData,
    portInfos: PortInfo[],
  ): NetworkResolvedData {
    const httpPort = portInfos.find((p) => p.type === "HTTP")?.value;
    const httpsPort = portInfos.find((p) => p.type === "HTTPS")?.value;
    const turnPort = portInfos.find((p) => p.type === "TURN")?.value;

    if (
      httpPort === undefined ||
      httpPort === null ||
      httpsPort === undefined ||
      turnPort === undefined
    ) {
      throw new Error(
        `NetworkController: createResolvedData: can not find ports from portInfos: httpPort: ${httpPort}, httpsPort: ${httpsPort}, turnPort: ${turnPort}`,
      );
    }
    const webServerResolvedData: WebServerResolvedData = {
      httpPort,
      httpsPort,
    };
    let turnServerResolvedData: TurnServerResolvedData | null;
    if (turnPort === null) {
      turnServerResolvedData = null;
    } else {
      turnServerResolvedData = { port: turnPort };
      if (data.turnServerData.ip !== undefined) {
        turnServerResolvedData.ip = data.turnServerData.ip;
      }
    }
    return { webServerResolvedData, turnServerResolvedData };
  }

  //Http Manager:

  private async handleUserSoftLoginRequest(
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ): Promise<AuthResult> {
    const authResult = await this.activeHandlers.onUserSoftLoginRequest(
      sessionToken,
      loginCredentials,
    );
    return authResult;
  }

  //WssManager:

  private handleWssMessage<K extends WssUpstream>(
    messageInfo: WssMessageInfo<K>,
  ): void {
    this.activeHandlers.onMessage(messageInfo);
  }

  private handleClientDisconnect(clientId: string) {
    this.activeHandlers.onClientDisconnect(clientId);
  }

  private handleClientError(clientId: string) {
    this.activeHandlers.onClientError(clientId);
  }

  //WebRtcManager:

  private handleRtcConnected(clientId: string): void {
    this.activeHandlers.onRtcConnected(clientId);
  }

  private handleRtcDisconnected(clientId: string): void {
    this.activeHandlers.onRtcDisconnected(clientId);
  }

  private handleRtcClosed(clientId: string): void {
    this.activeHandlers.onRtcClosed(clientId);
  }

  private handleRtcFailed(clientId: string): void {
    this.activeHandlers.onRtcFailed(clientId);
  }

  private handleRtcAnswer(clientId: string, answer: RtcAnswerWire): void {
    this.activeHandlers.onRtcAnswer(clientId, answer);
  }

  private handleRtcIceCandidate(
    clientId: string,
    candidate: RtcIceCandidateInitWire | null,
  ): void {
    this.activeHandlers.onRtcIceCandidate(clientId, candidate);
  }

  private handleRtcTrack(clientId: string, track: any): void {
    this.activeHandlers.onRtcTrack(clientId, track);
  }
}
