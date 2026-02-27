import type {
  ManagerStatus,
  RtcAnswerWire,
  RtcIceCandidateInitWire,
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
  private remoteIceCandidates: (RtcIceCandidateInitWire | null)[] = [];
  private closed: boolean = false;
  private disconnectTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private audioEl: HTMLAudioElement | null = null;
  private localStream: MediaStream | null = null;
  //Mic starts off muted (true). If the localStream is not created by the time a mute request is received, then pendingMicMute will be set to the new mute state, and set once the localStream is created:
  private pendingMicMute: boolean = true;

  constructor(private logger: IClientLogger) {
    this.logger = this.logger.child({ context: "PanelWebRtcManager" });
  }

  init(): void {
    if (this.status !== "IDLE") {
      throw new Error(
        `Cannot initialize the PanelWebRtcManager whilst its status is ${this.status}`,
      );
    }
    this.ensureAudioEl();
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
    this.attachPeerConnectionHandlers();
    const result = await this.attachAudioToPeerConnection();
    if (!result) return;
    await this.sendOffer();
  }

  setMicMute(muted: boolean): void {
    const message = `set mic ${muted ? "muted" : "unmuted"}`;
    const notRunning = this.checkAndWarnIfNotRunning(message);
    if (notRunning) return;

    if (!this.localStream) {
      this.logger.info(
        `setMicMute: local stream does not exist yet. Request to ${muted ? "" : "un"}mute mic will be queued`,
      );
      this.pendingMicMute = muted;
      return;
    }
    const audioTrack = this.localStream.getAudioTracks()[0]; // Get the first audio track (microphone)
    if (!audioTrack) {
      this.logger.error(`Unable to ${message}: there is no audio track`);
      return;
    }
    this.logger.info(`${muted ? "M" : "Unm"}uting microphone`);
    audioTrack.enabled = !muted;
  }

  private ensureAudioEl(): HTMLAudioElement {
    if (this.audioEl) return this.audioEl;

    const el = document.createElement("audio");
    el.autoplay = true;
    el.style.display = "none";
    document.body.appendChild(el);

    this.audioEl = el;
    return el;
  }

  private async attachAudioToPeerConnection(): Promise<boolean> {
    const pc = this.getPeerConnection("attachAudioToPeerConnection");
    if (!pc) return false;

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: false,
        audio: true,
      });
      this.setMicMute(this.pendingMicMute);
    } catch (err) {
      this.logger.error("Error in getting user media", err);
      this.activeHandlers.onErrorMessage(
        "Microphone Access Denied: Please ensure your microphone is connected and that you have granted permission in your browser settings",
      );
      return false;
    }

    for (const track of this.localStream.getTracks()) {
      pc.addTrack(track, this.localStream);
    }

    pc.ontrack = async (event) => {
      const el = this.ensureAudioEl();
      const [stream] = event.streams;
      if (!stream) return;

      el.srcObject = stream;

      try {
        await el.play();
      } catch {
        this.logger.error("Unable to play audio");
      }
    };
    return true;
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

      this.activeHandlers.onRtcOffer({ type: "offer", sdp: ld.sdp });
    } catch (err) {
      this.logger.error(`Unable to send offer`, err);
    }
  }

  async processRemoteAnswer(answer: RtcAnswerWire): Promise<void> {
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

  async processRemoteIceCandidate(
    candidate: RtcIceCandidateInitWire | null,
  ): Promise<void> {
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

  private async addRemoteIceCandidate(
    candidate: RtcIceCandidateInitWire | null,
  ): Promise<void> {
    const pc = this.getPeerConnection("addRemoteIceCandidate");
    if (!pc || this.closed === true) return;

    try {
      if (candidate === null) {
        // end-of-candidates signal
        return;
      }
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
    if (this.closed) return;

    const c = event.candidate;
    if (!c) return;

    const wire: RtcIceCandidateInitWire = {
      candidate: c.candidate,
      sdpMLineIndex: c.sdpMLineIndex ?? null,
      sdpMid: c.sdpMid ?? null,
      usernameFragment: c.usernameFragment ?? null,
    };
    this.activeHandlers.onRtcIceCandidate(wire);
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

    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    if (this.audioEl) this.audioEl.srcObject = null;

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

  private stashRemoteIceCandidate(
    candidate: RtcIceCandidateInitWire | null,
  ): void {
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
