import type {
  ManagerStatus,
  TurnServerInfo,
} from "../../shared/types/index.js";

import { ICE_SERVERS } from "../../shared/constants/sharedConstants.js";

import type {
  IClientLogger,
  IPanelWebRtcManager,
  PanelWebRtcHandlers,
} from "../contracts/index.js";
import { PANEL_WEB_RTC_DISCONNECT_TIMEOUT_MS } from "../constants/clientConstants.js";

export class PanelWebRtcManager implements IPanelWebRtcManager {
  private status: ManagerStatus = "IDLE";
  private handlers: PanelWebRtcHandlers | null = null;
  private peerConnection: RTCPeerConnection | null = null;
  private remoteIceCandidates: any[] = [];
  private closed: boolean = false;
  private disconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "PanelWebRtcManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the PanelWebRtcManager whilst its status is ${this.status}`,
      );
    }
    this.status = "INITIALIZED";
  }

  start(): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot start the PanelWebRtcManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;

    this.status = "RUNNING";
  }

  setHandlers(handlers: PanelWebRtcHandlers): void {
    this.handlers = handlers;
  }

  async connect(info: TurnServerInfo): Promise<void> {
    const notRunning = this.checkAndWarnIfNotRunning("connect");
    if (notRunning) return;

    this.closed = false;
    this.remoteIceCandidates.length = 0;
    this.clearDisconnectTimeout();
    if (this.peerConnection) this.teardownPeerConnection();

    this.logger.info(`Connecting...`);
    const config = this.createRtcConfig(info);
    this.peerConnection = new RTCPeerConnection(config);
    //Test:
    this.peerConnection.createDataChannel("test-liveness");
    //End test
    this.attachPeerConnectionHandlers();
    await this.sendOffer();
  }

  private createRtcConfig(info: TurnServerInfo): RTCConfiguration {
    const { username, credential } = info.credentials;

    const rtcConfig: RTCConfiguration = {
      iceServers: [
        ...ICE_SERVERS,
        {
          urls: [`turn:${window.location.hostname}:${info.port}`],
          username,
          credential,
        },
      ],
      //Test: for forcing to turn server
      // iceTransportPolicy: "relay",
      //End test
    };
    return rtcConfig;
  }

  private attachPeerConnectionHandlers(): void {
    const pc = this.getPeerConnection("attachPeerConnectionHandlers");
    if (!pc) return;

    pc.onconnectionstatechange = () => {
      this.handlePeerConnectionStateChange();
    };

    pc.onicecandidate = (event) => {
      this.handlePeerConnectionIceCandidate(event);
    };

    pc.onicecandidateerror = (event) => {
      this.handlePeerConnectionIceCandidateError(event);
    };

    pc.oniceconnectionstatechange = () => {
      this.logger.info(`iceConnectionState is ${pc.iceConnectionState}`);
    };
  }

  private async sendOffer(): Promise<void> {
    const pc = this.getPeerConnection("sendOffer");
    if (!pc || this.closed) return;

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (!this.pcStateValid()) return;
      const ld = pc.localDescription;
      if (!ld)
        throw new Error("localDescription is null after setLocalDescription");

      this.activeHandlers.onRtcOffer(ld);
    } catch (err) {
      this.logger.error(`Unable to send offer`, err);
    }
  }

  async processRemoteAnswer(answer: any): Promise<void> {
    const notRunning = this.checkAndWarnIfNotRunning("process answer");
    if (notRunning) return;

    const pc = this.getPeerConnection("processRemoteAnswer");
    if (!pc || this.closed === true) return;

    if (!this.pcStateValid()) return;

    try {
      const description = new RTCSessionDescription(answer);
      await pc.setRemoteDescription(description);
    } catch (err) {
      this.logger.error(`setRemoteDescription failed`, err);
      return;
    }
    await this.drainRemoteIceCandidates();
  }

  async processRemoteIceCandidate(candidate: any): Promise<void> {
    const notRunning = this.checkAndWarnIfNotRunning(
      "process remote ICE candidate",
    );
    if (notRunning) return;

    const pc = this.getPeerConnection("processRemoteIceCandidate");
    if (!pc || this.closed === true) return;

    if (!this.pcStateValid()) return;

    if (!pc.remoteDescription) {
      this.stashRemoteIceCandidate(candidate);
      return;
    }
    await this.addRemoteIceCandidate(candidate);
  }

  private async addRemoteIceCandidate(candidate: any): Promise<void> {
    const pc = this.getPeerConnection("addRemoteIceCandidate");
    if (!pc || this.closed === true) return;

    try {
      const ice = new RTCIceCandidate(candidate);
      await pc.addIceCandidate(ice);
    } catch (err) {
      this.logger.error(`Unable to add remote ICE candidate`, err);
    }
  }

  private handlePeerConnectionStateChange(): void {
    const pc = this.getPeerConnection("handlePeerConnectionStateChange");
    if (!pc || this.closed === true) return;

    this.logger.info(`peerConnection state is ${pc.connectionState}`);

    switch (pc.connectionState) {
      case "connected":
        this.clearDisconnectTimeout();
        this.activeHandlers.onRtcConnected();
        break;

      case "disconnected":
        this.clearDisconnectTimeout();
        this.activeHandlers.onRtcDisconnected();
        this.disconnectTimeoutId = setTimeout(
          () => this.handleDisconnectTimeout(),
          PANEL_WEB_RTC_DISCONNECT_TIMEOUT_MS,
        );
        break;

      case "failed":
        this.closed = true;
        this.teardownPeerConnection();
        this.activeHandlers.onRtcFailed();
        break;

      case "closed":
        this.closed = true;
        this.teardownPeerConnection();
        this.activeHandlers.onRtcClosed();
        break;
    }
  }

  private handlePeerConnectionIceCandidate(
    event: RTCPeerConnectionIceEvent,
  ): void {
    if (this.closed || !event.candidate) return;

    this.activeHandlers.onRtcIceCandidate(event.candidate);
  }

  private handlePeerConnectionIceCandidateError(
    event: RTCPeerConnectionIceErrorEvent,
  ): void {
    if (this.closed) return;

    // this.logger.warn(`ICE candidate error (${event.errorCode})`, event);
  }

  private handleDisconnectTimeout(): void {
    if (this.closed) return;

    this.closed = true;
    this.teardownPeerConnection();
    this.activeHandlers.onRtcFailed();
  }

  private clearDisconnectTimeout(): void {
    if (this.disconnectTimeoutId === null) return;
    clearTimeout(this.disconnectTimeoutId);
    this.disconnectTimeoutId = null;
  }

  private teardownPeerConnection(): void {
    const pc = this.getPeerConnection("teardownPeerConnection");
    if (!pc) return;

    pc.onconnectionstatechange = null;
    pc.onicecandidate = null;
    pc.onicecandidateerror = null;
    pc.oniceconnectionstatechange = null;
    pc.ontrack = null;

    try {
      pc.close();
    } catch {}

    this.clearDisconnectTimeout();
    this.remoteIceCandidates.length = 0;
    this.peerConnection = null;
  }

  private stashRemoteIceCandidate(candidate: any): void {
    if (this.remoteIceCandidates.length > 200) {
      this.logger.warn(`Too many queued ICE candidates, dropping`);
      this.remoteIceCandidates.length = 0;
      return;
    }
    this.remoteIceCandidates.push(candidate);
  }

  private async drainRemoteIceCandidates(): Promise<void> {
    const pending = this.remoteIceCandidates.splice(0);

    for (const cand of pending) {
      if (!this.pcStateValid()) return;
      await this.addRemoteIceCandidate(cand);
    }
  }

  private pcStateValid(): boolean {
    const pc = this.peerConnection;
    if (!pc) return false;
    return (
      !this.closed &&
      pc.signalingState !== "closed" &&
      pc.connectionState !== "closed" &&
      pc.connectionState !== "failed"
    );
  }

  private get activeHandlers(): PanelWebRtcHandlers {
    if (!this.handlers)
      throw new Error("PanelWebRtcManager handlers not initialized!");
    return this.handlers;
  }

  private getPeerConnection(subContext: string): RTCPeerConnection | null {
    if (!this.peerConnection) {
      this.logger.warn(
        `${subContext}: Unable to get peerConnection: peerConnection is null`,
      );
      return null;
    }
    return this.peerConnection;
  }

  private checkAndWarnIfNotRunning(action: string): boolean {
    if (this.status !== "RUNNING") {
      this.logger.error(
        `Unable to ${action} because the status is ${this.status}`,
      );
      return true;
    }
    return false;
  }
}
