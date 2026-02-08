//Types:
import type {
  PeerConnectionInfo,
  RtcConfig,
  RtcPeerConnection,
  RtcPeerConnectionIceErrorEvent,
  RtcPeerConnectionIceEvent,
  TrackAndStream,
} from "../../types/index.js";
import type {
  IWebRtcManager,
  ILogger,
  WebRtcHandlers,
} from "../../contracts/index.js";
import type {
  ManagerStatus,
  RtcAnswerWire,
  RtcIceCandidateInitWire,
  RtcOfferWire,
  TurnServerCredentials,
} from "../../../shared/types/index.js";
//Constants:
import { ICE_SERVERS } from "../../../shared/constants/sharedConstants.js";
import { WEB_RTC_DISCONNECT_TIMEOUT_MS } from "../../constants/serverConstants.js";
//External libraries:
import wrtc from "@roamhq/wrtc";

export class WebRtcManager implements IWebRtcManager {
  private status: ManagerStatus = "IDLE";
  private handlers: WebRtcHandlers | null = null;
  private rtcConfig: RtcConfig | null = null;
  private turnServerCredentials: TurnServerCredentials | null = null;
  private clients = new Map<string, PeerConnectionInfo>();

  constructor(private logger: ILogger) {
    this.logger = this.logger.child({ context: "WebRtcManager" });
  }

  init(turnServerCredentials: TurnServerCredentials): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the WebRtcManager whilst its status is ${this.status}`,
      );
    }
    this.turnServerCredentials = turnServerCredentials;
    this.status = "INITIALIZED";
  }

  populate(turnServerUrl: string): void {
    if (this.status !== "INITIALIZED") {
      throw new Error(
        `Cannot populate the WebRtcManager whilst its status is ${this.status}`,
      );
    }
    this.createRtcConfig(turnServerUrl);
    this.status = "POPULATED";
  }

  start(): void {
    if (this.status !== "POPULATED") {
      throw new Error(
        `Cannot start the WebRtcManager whilst its status is ${this.status}`,
      );
    }
    // Trigger the check to ensure we are ready to roll
    void this.activeHandlers;
    this.status = "RUNNING";
  }

  setHandlers(handlers: WebRtcHandlers): void {
    this.handlers = handlers;
  }

  createPeerConnection(clientId: string): void {
    const notRunning = this.checkAndWarnIfNotRunning(
      "create new peer connection",
    );
    if (notRunning) return;
    if (!this.rtcConfig) {
      this.logger.error(
        `Unable to create new peerConnection because rtcConfig is null`,
      );
      return;
    }
    if (this.clients.has(clientId)) {
      this.logger.error(
        `Unable to create new peerConnection because clientId ${clientId} already exists`,
      );
      return;
    }
    const pc: RtcPeerConnection = new wrtc.RTCPeerConnection(this.rtcConfig);
    this.clients.set(clientId, {
      pc,
      closed: false,
      disconnectTimeoutId: null,
      remoteIceCandidates: [],
      rxTrackReceived: false,
      txTrackAdded: false,
    });
    this.attachPeerConnectionHandlers(clientId, pc);
  }

  private createRtcConfig(turnServerUrl: string): void {
    this.rtcConfig = {
      iceServers: [
        ...ICE_SERVERS,
        { urls: [turnServerUrl], ...this.turnServerCredentials },
      ],
      //Test: for forcing to turn server
      // iceTransportPolicy: "relay",
      //End test
    };
  }

  async processRemoteOffer(
    clientId: string,
    offer: RtcOfferWire,
  ): Promise<void> {
    const notRunning = this.checkAndWarnIfNotRunning("process offer");
    if (notRunning) return;

    const pcInfo = this.clients.get(clientId);
    if (!pcInfo) return;
    if (!this.pcStateValid(pcInfo)) return;

    const { pc } = pcInfo;

    try {
      const description = new wrtc.RTCSessionDescription(offer);
      await pc.setRemoteDescription(description);
    } catch (err) {
      this.logger.error(`setRemoteDescription failed for ${clientId}`, err);
      return;
    }
    const success = await this.drainRemoteIceCandidates(clientId, pcInfo);
    if (!success || !this.pcStateAndInfoValid(clientId, pcInfo)) return;

    const answer = await this.createAnswer(clientId, pcInfo);
    if (!answer || !this.pcStateAndInfoValid(clientId, pcInfo)) return;

    this.activeHandlers.onRtcAnswer(clientId, answer);
  }

  async processRemoteIceCandidate(
    clientId: string,
    candidate: RtcIceCandidateInitWire | null,
  ): Promise<void> {
    const notRunning = this.checkAndWarnIfNotRunning(
      "process remote ICE candidate",
    );
    if (notRunning) return;

    const pcInfo = this.clients.get(clientId);

    if (!pcInfo) return;
    if (!this.pcStateValid(pcInfo)) return;

    if (!pcInfo.pc.remoteDescription) {
      this.stashRemoteIceCandidate(clientId, pcInfo, candidate);
      return;
    }
    await this.addRemoteIceCandidate(clientId, pcInfo, candidate);
  }

  private async addRemoteIceCandidate(
    clientId: string,
    pcInfo: PeerConnectionInfo,
    candidate: RtcIceCandidateInitWire | null,
  ): Promise<void> {
    try {
      if (candidate === null) {
        // end-of-candidates signal
        return;
      }
      const ice = new wrtc.RTCIceCandidate(candidate);
      await pcInfo.pc.addIceCandidate(ice);
    } catch (err) {
      this.logger.error(
        `Unable to add remote ICE candidate for clientId ${clientId}`,
        err,
      );
    }
  }

  private async createAnswer(
    clientId: string,
    pcInfo: PeerConnectionInfo,
  ): Promise<RtcAnswerWire | null> {
    const { pc } = pcInfo;

    try {
      const answer = await pc.createAnswer();
      if (!this.pcStateAndInfoValid(clientId, pcInfo)) return null;

      await pc.setLocalDescription(answer);
      if (!this.pcStateAndInfoValid(clientId, pcInfo)) return null;

      const ld = pc.localDescription;
      const sdp = ld?.sdp ?? answer.sdp;

      if (!sdp) throw new Error("Answer SDP missing after setLocalDescription");

      return { type: "answer", sdp };
    } catch (err) {
      this.logger.error(
        `Failed to create/set local answer for clientId ${clientId}`,
        err,
      );
      return null;
    }
  }

  private attachPeerConnectionHandlers(
    clientId: string,
    pc: RtcPeerConnection,
  ): void {
    pc.onconnectionstatechange = () => {
      this.handlePeerConnectionStateChange(clientId, pc);
    };

    pc.onicecandidate = (event: RtcPeerConnectionIceEvent) => {
      this.handlePeerConnectionIceCandidate(clientId, pc, event);
    };

    pc.onicecandidateerror = (event: RtcPeerConnectionIceErrorEvent) => {
      this.handlePeerConnectionIceCandidateError(clientId, pc, event);
    };

    pc.oniceconnectionstatechange = () => {
      this.logger.info(
        `iceConnectionState for clientId ${clientId} is ${pc.iceConnectionState}`,
      );
    };

    pc.ontrack = (event) => {
      this.handlePeerConnectionOnTrack(clientId, pc, event);
    };
  }

  addTxTrackAndStream(clientId: string, trackAndStream: TrackAndStream): void {
    const pcInfo = this.clients.get(clientId);
    if (!pcInfo) {
      this.logger.warn(
        `Unable to add TX track for clientId ${clientId}: pcInfo cannot be found`,
      );
      return;
    }
    if (pcInfo.closed) {
      this.logger.warn(
        `Unable to add TX track for clientId ${clientId}: pcInfo is reporting as closed`,
      );
      return;
    }
    if (pcInfo.txTrackAdded) {
      this.logger.warn(
        `Dropping TX track for clientId ${clientId}: a track has already been added`,
      );
      return;
    }
    const { track, stream } = trackAndStream;
    try {
      pcInfo.pc.addTrack(track, stream);
      pcInfo.txTrackAdded = true;
      this.logger.success(`TX track added for clientId ${clientId}`);
    } catch (err) {
      this.logger.error(`addTrack failed`, err);
    }
  }

  closeClient(clientId: string): void {
    const pcInfo = this.clients.get(clientId);
    if (!pcInfo || pcInfo.closed) return;

    pcInfo.closed = true;
    this.teardownClient(clientId, pcInfo.pc);
  }

  private handlePeerConnectionStateChange(
    clientId: string,
    pc: RtcPeerConnection,
  ): void {
    const pcInfo = this.clients.get(clientId);
    // If we've already torn down / replaced this client, ignore stale events
    if (!pcInfo || pcInfo.pc !== pc || pcInfo.closed) return;

    this.logger.info(
      `peerConnection state is ${pc.connectionState} for clientId ${clientId}`,
    );

    switch (pc.connectionState) {
      case "connected":
        this.clearDisconnectTimeout(pcInfo);
        this.activeHandlers.onRtcConnected(clientId);
        break;

      case "disconnected":
        this.clearDisconnectTimeout(pcInfo);
        this.activeHandlers.onRtcDisconnected(clientId);
        pcInfo.disconnectTimeoutId = setTimeout(
          () => this.handleDisconnectTimeout(clientId, pc),
          WEB_RTC_DISCONNECT_TIMEOUT_MS,
        );
        break;

      case "failed":
        pcInfo.closed = true;
        this.teardownClient(clientId, pc);
        this.activeHandlers.onRtcFailed(clientId);
        break;

      case "closed":
        pcInfo.closed = true;
        this.teardownClient(clientId, pc);
        this.activeHandlers.onRtcClosed(clientId);
        break;
    }
  }

  private handlePeerConnectionIceCandidate(
    clientId: string,
    pc: RtcPeerConnection,
    event: RtcPeerConnectionIceEvent,
  ): void {
    const pcInfo = this.clients.get(clientId);
    if (!pcInfo || pcInfo.pc !== pc || pcInfo.closed || !event.candidate)
      return;

    this.activeHandlers.onRtcIceCandidate(clientId, event.candidate);
  }

  private handlePeerConnectionIceCandidateError(
    clientId: string,
    pc: RtcPeerConnection,
    event: RtcPeerConnectionIceErrorEvent,
  ): void {
    const pcInfo = this.clients.get(clientId);
    if (!pcInfo || pcInfo.pc !== pc || pcInfo.closed) return;
    // this.logger.warn(
    //   `ICE candidate error (${event.errorCode}) for ${clientId}`,
    //   `Address: ${event.address ?? "None"}, Url: ${event.url ?? "None"}, Message: ${event.errorText ?? ""}`,
    // );
  }

  private handlePeerConnectionOnTrack(
    clientId: string,
    pc: RtcPeerConnection,
    event: any,
  ): void {
    const pcInfo = this.clients.get(clientId);
    if (!pcInfo || pcInfo.pc !== pc || pcInfo.closed) return;

    if (pcInfo.rxTrackReceived) {
      this.logger.warn(
        `Dropping RX track for clientId ${clientId}: a track has already been received`,
      );
      return;
    }

    const track = event.track;
    if (!track) {
      this.logger.warn(
        `ontrack fired for ${clientId} but event.track was missing`,
      );
      return;
    }

    if (track.kind && track.kind !== "audio") {
      this.logger.info(
        `Ignoring non-audio track (${track.kind}) from ${clientId}`,
      );
      return;
    }

    this.logger.info(`Audio track received for clientId ${clientId}`);
    pcInfo.rxTrackReceived = true;
    this.activeHandlers.onRtcTrack(clientId, track);
  }

  private handleDisconnectTimeout(
    clientId: string,
    pc: RtcPeerConnection,
  ): void {
    const pcInfo = this.clients.get(clientId);
    if (!pcInfo || pcInfo.pc !== pc || pcInfo.closed) return;
    pcInfo.closed = true;
    this.teardownClient(clientId, pc);
    this.activeHandlers.onRtcFailed(clientId);
  }

  private clearDisconnectTimeout(pcInfo: PeerConnectionInfo): void {
    if (pcInfo.disconnectTimeoutId === null) return;
    clearTimeout(pcInfo.disconnectTimeoutId);
    pcInfo.disconnectTimeoutId = null;
  }

  private teardownClient(clientId: string, pc: RtcPeerConnection): void {
    this.logger.info(`Tearing down client ${clientId}`);

    pc.onconnectionstatechange = null;
    pc.onicecandidate = null;
    pc.onicecandidateerror = null;
    pc.oniceconnectionstatechange = null;
    pc.ontrack = null;

    try {
      pc.close();
    } catch {}

    const pcInfo = this.clients.get(clientId);
    if (!pcInfo) return;
    if (pcInfo.pc === pc) {
      this.clearDisconnectTimeout(pcInfo);
      pcInfo.remoteIceCandidates.length = 0;
      this.clients.delete(clientId);
    }
  }

  private stashRemoteIceCandidate(
    clientId: string,
    pcInfo: PeerConnectionInfo,
    candidate: RtcIceCandidateInitWire | null,
  ): void {
    if (pcInfo.remoteIceCandidates.length > 200) {
      this.logger.warn(
        `Too many queued ICE candidates for ${clientId}, dropping`,
      );
      pcInfo.remoteIceCandidates.length = 0;
      return;
    }
    pcInfo.remoteIceCandidates.push(candidate);
  }

  private async drainRemoteIceCandidates(
    clientId: string,
    pcInfo: PeerConnectionInfo,
  ): Promise<boolean> {
    const pending = pcInfo.remoteIceCandidates.splice(0);

    for (const cand of pending) {
      if (!this.pcStateAndInfoValid(clientId, pcInfo)) return false;
      await this.addRemoteIceCandidate(clientId, pcInfo, cand);
    }
    return true;
  }

  private pcStateAndInfoValid(
    clientId: string,
    pcInfo: PeerConnectionInfo,
  ): boolean {
    return this.pcStateValid(pcInfo) && this.pcInfoValid(clientId, pcInfo);
  }

  private pcStateValid(pcInfo: PeerConnectionInfo): boolean {
    if (pcInfo == null) return false;
    return (
      !pcInfo.closed &&
      pcInfo.pc.signalingState !== "closed" &&
      pcInfo.pc.connectionState !== "closed" &&
      pcInfo.pc.connectionState !== "failed"
    );
  }

  private pcInfoValid(clientId: string, pcInfo: PeerConnectionInfo): boolean {
    const foundPcInfo = this.clients.get(clientId);
    if (!foundPcInfo) return false;
    return foundPcInfo.pc === pcInfo.pc;
  }

  private get activeHandlers(): WebRtcHandlers {
    if (!this.handlers)
      throw new Error("WebRtcManager handlers not initialized!");
    return this.handlers;
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
