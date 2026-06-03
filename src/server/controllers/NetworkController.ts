//Types:
import type {
  WssDownstream,
  WssPayloads,
  WssUpstream,
} from "../../shared/protocols/index.js";
import type {
  AdminAuthResult,
  AdminWebServerInfo,
  AuthResult,
  LoginCredentials,
  ManagerStatus,
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
  IProcessStatsManager,
  NetworkHandlers,
  NetworkAdminInfos,
  SendAdminUpdateAndPopupsParams,
} from "../contracts/index.js";
import type {
  NetworkData,
  NetworkPopulateData,
  NetworkResolvedData,
  TurnServerResolvedData,
  WebServerResolvedData,
} from "../types/NetworkData.js";
import type { TrackAndStream } from "../types/TrackAndStream.js";
import type { WssMessageInfo } from "../types/WssMessageInfo.js";
import type { PortInfo, PortInfos } from "../types/PortInfo.js";
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
import type { RtcMediaStreamTrack } from "../types/wrtcShimTypes.js";

export class NetworkController implements INetworkController {
  private handlers: NetworkHandlers | null = null;

  constructor(
    private webServerManager: IWebServerManager,
    private wssManager: IWssManager,
    private webRtcManager: IWebRtcManager,
    private turnServerManager: ITurnServerManager,
    private processStatsManager: IProcessStatsManager,
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
    this.processStatsManager.init();
  }

  async populate(data: NetworkPopulateData): Promise<void> {
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
      this.logger.warn(`TURN disabled. Will not start the Turn Server`, true);
    }
    this.webRtcManager.start();
    this.processStatsManager.start();
  }

  setHandlers(handlers: NetworkHandlers): void {
    this.handlers = handlers;
  }

  getSaveSnapshot(): NetworkData | null {
    const turnServerSnap = this.turnServerManager.getSaveSnapshot();
    if (turnServerSnap === null) return null;
    if (turnServerSnap.ip === undefined) {
      return {};
    }
    return { turnServerIp: turnServerSnap.ip };
  }

  //WssManager:

  sendWssMessage<K extends WssDownstream>(
    type: K,
    payload: WssPayloads[K],
    clientIds: string[],
  ): void {
    this.wssManager.sendMessage(type, payload, clientIds);
  }

  sendAdminUpdateAndPopups(params: SendAdminUpdateAndPopupsParams): void {
    const { updateTarget, update, originClientId, loggedInClientIds } = params;

    this.sendWssMessage("ADMIN_UPDATE", update, loggedInClientIds);

    this.sendWssMessage(
      "ADMIN_POPUP",
      {
        type: "info",
        title: "Info",
        message: `Another admin has updated the ${updateTarget}`,
      },
      loggedInClientIds.filter((id) => id !== originClientId),
    );

    this.sendWssMessage(
      "ADMIN_POPUP",
      {
        type: "success",
        title: "Success",
        message: `Successfully updated the ${updateTarget}`,
      },
      [originClientId],
    );
  }

  //WssManager Helpers:
  sendUserLoginFailureMessage(clientId: string, message?: string): void {
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

  sendAdminLoginFailureMessage(clientId: string, message?: string): void {
    this.sendWssMessage(
      "ADMIN_LOGIN_RESPONSE",
      {
        success: false,
        message: message ?? "Internal server error",
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
    if (this.turnServerManager.status !== "RUNNING") {
      return null;
    }
    const credentials = this.turnServerManager.createClientCredentials();
    const port = this.turnServerManager.port;
    if (!credentials || port === null) return null;
    return {
      port,
      credentials,
    };
  }

  getAdminWebServerInfo(): AdminWebServerInfo {
    return this.createAdminWebServerInfo();
  }

  getAdminInfos(): NetworkAdminInfos {
    return { webServerInfo: this.createAdminWebServerInfo() };
  }

  getWssManagerStatus(): ManagerStatus {
    return this.wssManager.status;
  }

  //Private methods:

  private createAdminWebServerInfo(): AdminWebServerInfo {
    const { httpsPort, httpPort, domainName, isSslCertValid } =
      this.webServerManager.getAdminInfo();
    const { turnServerPort, isTurnServerOnline, ipv4Interfaces } =
      this.turnServerManager.getAdminInfo();
    const { cpuUsage, memoryUsage } = this.processStatsManager.stats;
    return {
      httpsPort,
      httpPort,
      turnServerPort,
      isTurnServerOnline,
      ipv4Interfaces,
      domainName,
      isSslCertValid,
      cpuUsage,
      memoryUsage,
    };
  }

  private get activeHandlers() {
    if (!this.handlers)
      throw new Error("NetworkController handlers not initialized!");
    return this.handlers;
  }

  private bindListeners(): void {
    this.webServerManager.setHandlers({
      onUserSoftLoginRequest: (s, l) => this.handleUserSoftLoginRequest(s, l),
      onAdminSoftLoginRequest: (s, l) => this.handleAdminSoftLoginRequest(s, l),
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

    this.processStatsManager.setHandlers({
      onProcessStatsUpdate: () => this.handleProcessStatsUpdate(),
    });
  }

  private async resolvePorts(
    data: NetworkPopulateData,
  ): Promise<NetworkResolvedData> {
    const { httpPort, httpsPort } = data.webServerData;
    const { port: turnPort } = data.turnServerData;
    const portInfos: PortInfos = {
      HTTP: {
        type: "HTTP",
        default: true,
        inputValue: httpPort,
        outputValue: DEFAULT_HTTP_PORT,
      },
      HTTPS: {
        type: "HTTPS",
        default: true,
        inputValue: httpsPort,
        outputValue: DEFAULT_HTTPS_PORT,
      },
      TURN: {
        type: "TURN",
        default: true,
        inputValue: turnPort,
        outputValue: DEFAULT_TURN_SERVER_PORT,
      },
    };
    const orderedPortInfos = [portInfos.HTTP, portInfos.HTTPS, portInfos.TURN];

    orderedPortInfos.forEach((portInfo, i) => {
      const { type, inputValue } = portInfo;
      const portsAlreadyAssigned = orderedPortInfos.slice(0, i);
      if (inputValue === undefined) {
        this.logger.info(
          `${type} port not provided, will attempt to use default port ${portInfo.outputValue}...`,
          true,
        );
      } else if (!validatePort(inputValue)) {
        this.logger.error(
          `${type} port ${inputValue} invalid, will attempt to use default port ${portInfo.outputValue}...`,
          true,
        );
      } else {
        portInfo.outputValue = inputValue;
        portInfo.default = false;
      }
      if (portInfo.outputValue !== null) {
        const result = this.doesPortClash(
          portInfo.outputValue,
          portsAlreadyAssigned,
        );
        if (result.clash) {
          this.logger.error(
            `${type} port ${portInfo.outputValue} clashes with ${result.clashesWith} port. Unable to run the ${type} server`,
            true,
          );
          portInfo.outputValue = null;
        }
      }
    });
    await this.nullifyUnavailablePortsInPlace(orderedPortInfos);

    const { HTTP: httpPortInfo } = portInfos;
    const { outputValue } = httpPortInfo;
    if (outputValue === null) {
      const portsToAvoid = new Set<number>();
      orderedPortInfos.forEach((p) => {
        if (p.type === "HTTP" || p.outputValue === null) return;
        portsToAvoid.add(p.outputValue);
      });
      const newPort = await findRandomAvailablePort(portsToAvoid);
      if (newPort !== null) {
        httpPortInfo.outputValue = newPort;
        httpPortInfo.default = false;
      } else {
        throw new Error(
          `NetworkController: Unable to find an available port for the HTTP server`,
        );
      }
    }
    this.logPortInfosSummary(orderedPortInfos);
    const resolvedData = this.createResolvedData(data, portInfos);
    return resolvedData;
  }

  private doesPortClash(
    port: number,
    portInfos: PortInfo<PortType>[],
  ): { clash: true; clashesWith: PortType } | { clash: false } {
    for (const portInfo of portInfos) {
      if (portInfo.outputValue !== null && portInfo.outputValue === port) {
        return { clash: true, clashesWith: portInfo.type };
      }
    }
    return { clash: false };
  }

  private async nullifyUnavailablePortsInPlace(
    portInfos: PortInfo<PortType>[],
  ): Promise<void> {
    for (const p of portInfos) {
      if (p.outputValue !== null) {
        const isUdp = p.type === "TURN";
        const result = await isPortAvailable(p.outputValue, isUdp);
        if (!result.isAvailable) {
          p.outputValue = null;
          this.logger.error(`${p.type} port is not free`, true, result.err);
        }
      }
    }
  }

  private logPortInfosSummary(portInfos: PortInfo<PortType>[]): void {
    let message = "Using ";
    portInfos.forEach((portInfo, i) => {
      const end =
        i < portInfos.length - 2
          ? ", "
          : i < portInfos.length - 1
            ? " and "
            : "";

      if (portInfo.outputValue === null) {
        message += `no port for the ${portInfo.type} server${end}`;
        return;
      }
      message += `${portInfo.default ? "default " : ""}${portInfo.type} port ${portInfo.outputValue}${end}`;
    });

    this.logger.info(message, true);
  }

  private createResolvedData(
    data: NetworkPopulateData,
    portInfos: PortInfos,
  ): NetworkResolvedData {
    const httpPort = portInfos.HTTP.outputValue;
    const httpsPort = portInfos.HTTPS.outputValue;
    const turnPort = portInfos.TURN.outputValue;

    if (httpPort === null) {
      throw new Error(
        `NetworkController: createResolvedData: Invariant violation: HTTP outputValue is null`,
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

  private async handleAdminSoftLoginRequest(
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ): Promise<AdminAuthResult> {
    const authResult = await this.activeHandlers.onAdminSoftLoginRequest(
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

  private handleRtcTrack(clientId: string, track: RtcMediaStreamTrack): void {
    this.activeHandlers.onRtcTrack(clientId, track);
  }

  //ProcessStatsManager:

  private handleProcessStatsUpdate(): void {
    this.activeHandlers.onProcessStatsUpdate();
  }
}
