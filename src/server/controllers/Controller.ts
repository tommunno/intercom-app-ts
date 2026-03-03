import type {
  IAudioController,
  IController,
  IDataController,
  ILogger,
  INetworkController,
} from "../contracts/index.js";
import type {
  AdminAuthResult,
  AudioInfo,
  AuthResult,
  HeartbeatRequestPayload,
  LoginCredentials,
  RtcAnswerWire,
  RtcIceCandidateInitWire,
} from "../../shared/types/index.js";
import {
  type WssPayloads,
  type WssUpstream,
  WSS_UPSTREAM,
} from "../../shared/protocols/index.js";
import type {
  DisconnectUserParams,
  LogoutClientParams,
  RtcMediaStreamTrack,
  WssCommandMap,
} from "../types/index.js";
import { validateServerConstants } from "../../shared/helpers.js";

export class Controller implements IController {
  private readonly wssCommands: WssCommandMap = {
    HEARTBEAT_RESPONSE: this.handleHeartbeatResponse.bind(this),
    USER_LOGIN: this.handleUserLogin.bind(this),
    USER_LOGOUT: this.handleUserLogout.bind(this),
    KEY_PRESS: this.handleKeyPress.bind(this),
    WEB_RTC_OFFER: this.handleWebRtcOffer.bind(this),
    WEB_RTC_CLIENT_ICE_CANDIDATE:
      this.handleWebRtcClientIceCandidate.bind(this),
    ADMIN_LOGIN: this.handleAdminLogin.bind(this),
  };
  constructor(
    private audioController: IAudioController,
    private networkController: INetworkController,
    private dataController: IDataController,
    private logger: ILogger,
  ) {
    this.logger = this.logger.child({ context: "Controller" });
  }

  async init(): Promise<void> {
    this.logger.info("Initializing");
    validateServerConstants();
    this.bindListeners();
    this.dataController.init();
    await this.networkController.init();
    this.audioController.init();
  }
  async start(): Promise<void> {
    this.logger.info("Starting");
    await this.dataController.start();
    const networkData = this.dataController.getNetworkData();
    const audioData = this.dataController.getAudioData();
    await this.networkController.populate(networkData);
    this.networkController.start();
    this.audioController.populate(audioData);
    this.audioController.start();
    //Test:
    // setTimeout(() => this.audioController.setRequestedSoundcardId(4), 10000);
    // setTimeout(() => this.audioController.setRequestedSoundcardId(3), 15000);
    //End test
  }

  private bindListeners(): void {
    this.audioController.setHandlers({
      onAudioInfoUpdate: (u, a) => this.handleAudioInfoUpdate(u, a),
      onAudioRestart: () => this.handleAudioRestart(),
    });

    this.networkController.setHandlers({
      //WebServer:
      onUserSoftLoginRequest: (s, l) => this.handleUserSoftLoginRequest(s, l),
      onAdminSoftLoginRequest: (s, l) => this.handleAdminSoftLoginRequest(s, l),
      //Wss:
      onMessage: this.handleWssMessage.bind(this),
      onClientDisconnect: (c) => this.handleClientDisconnect(c),
      onClientError: (c) => this.handleClientError(c),
      //WebRtc:
      onRtcConnected: (c) => this.handleRtcConnected(c),
      onRtcDisconnected: (c) => this.handleRtcDisconnected(c),
      onRtcClosed: (c) => this.handleRtcClosed(c),
      onRtcFailed: (c) => this.handleRtcFailed(c),
      onRtcAnswer: (c, a) => this.handleRtcAnswer(c, a),
      onRtcIceCandidate: (c, i) => this.handleRtcIceCandidate(c, i),
      onRtcTrack: (c, t) => this.handleRtcTrack(c, t),
    });

    this.dataController.setHandlers({
      onAccountHeartbeat: (c, p) => this.handleAccountHeartbeat(c, p),
      onStaleHeartbeat: (c) => this.handleStaleHeartbeat(c),
    });
  }

  //Returns true if success, false if error
  //If hardLogout=true, the sessionToken is removed as well
  //If notifyClient=true, the client will be told they have been logged out
  //loginTakeover tells the client whether they are being logged out due to a loginTakeover
  //If closeRtc=false, the WebRtc connection will not be closed
  //If afterAudioRestart=true, this means that this is happening as a result of an audio restart. Hence no reason to cleanup the audio controller
  private logoutClientIfLoggedIn({
    clientId,
    hardLogout = false,
    notifyClient = false,
    loginTakeover = false,
    closeRtc = true,
    afterAudioRestart = false,
  }: LogoutClientParams): boolean {
    let userId = this.dataController.isClientIdLoggedIn(clientId);
    if (userId === null) {
      //Client is not logged in, hence we will not do anything. This is not an error
      return true;
    }

    userId = this.dataController.logoutUser(clientId, hardLogout);
    if (userId === null) {
      this.logger.error(
        `An error has occured whilst logging out user with clientId ${clientId}. ${closeRtc ? "The WebRtc connection will be closed, but otherwise w" : "W"}ill not continue with logout`,
      );
      if (closeRtc) {
        this.networkController.closeRtcClient(clientId);
      }
      return false;
    }
    this.disconnectUser({
      userId,
      notifyClient,
      loginTakeover,
      clientId,
      closeRtc,
      afterAudioRestart,
    });
    return true;
  }

  //Returns true if success, false if error
  //If notifyClient=true, you must provide a clientId
  //loginTakeover tells the client whether they are being logged out due to a loginTakeover
  //If closeRtc=false, the WebRtc connection will not be closed
  //If afterAudioRestart=true, this means that this is happening as a result of an audio restart. Hence no reason to cleanup the audio controller
  private disconnectUser({
    userId,
    notifyClient,
    loginTakeover = false,
    clientId,
    closeRtc = true,
    afterAudioRestart = false,
  }: DisconnectUserParams): void {
    if (!afterAudioRestart) {
      this.audioController.removeRxTrack(userId);
    }
    if (closeRtc) {
      this.networkController.closeRtcClient(clientId);
    }
    if (notifyClient) {
      this.networkController.sendWssMessage(
        "USER_FORCE_LOGOUT",
        { loginTakeover },
        [clientId],
      );
    }
  }

  //Handle AudioController:
  private handleAudioInfoUpdate(userId: number, audioInfo: AudioInfo) {
    const clientId = this.dataController.isUserIdLoggedIn(userId);
    if (!clientId) return;
    this.networkController.sendWssMessage("USER_AUDIO_INFO_UPDATE", audioInfo, [
      clientId,
    ]);
  }

  private handleAudioRestart(): void {
    this.dataController.getLoggedInUserClientIds().forEach((clientId) => {
      this.logger.info(`Logging out clientId ${clientId}`);
      this.logoutClientIfLoggedIn({
        clientId,
        notifyClient: true,
        afterAudioRestart: true,
      });
    });
  }

  //Handle HTTP:

  //Client first makes Http request for a 'soft' login
  //If there is a valid sessionToken, success
  //If no valid sessionToken, but credentials are valid, success and a sessionToken is sent
  //No user is connected to audio matrix yet!
  private async handleUserSoftLoginRequest(
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ): Promise<AuthResult> {
    const result: AuthResult = await this.dataController.softLoginUser(
      sessionToken,
      loginCredentials,
    );
    //If a loginTakeover has taken place (meaning a client has been logged out to allow the new client to connect), disconnect the logged out client
    if (result.success && result.loginTakeover) {
      this.disconnectUser({
        userId: result.userId,
        loginTakeover: true,
        clientId: result.loggedOutClientId,
        notifyClient: true,
      });
    }
    return result;
  }

  //Admin first makes Http request for a 'soft' login
  //If there is a valid sessionToken, success
  //If no valid sessionToken, but credentials are valid, success and a sessionToken is sent
  private async handleAdminSoftLoginRequest(
    sessionToken: string | null,
    loginCredentials: LoginCredentials,
  ): Promise<AdminAuthResult> {
    const result: AdminAuthResult = await this.dataController.softLoginAdmin(
      sessionToken,
      loginCredentials,
    );
    return result;
  }

  //Handle Wss messages:

  private handleWssMessage<K extends WssUpstream>({
    type,
    payload,
    clientId,
    sessionToken,
  }: {
    type: K;
    payload: WssPayloads[K];
    clientId: string;
    sessionToken: string | null;
  }): void {
    const command = this.wssCommands[type];
    command(payload, clientId, sessionToken);
  }

  private handleClientDisconnect(clientId: string) {
    this.logoutClientIfLoggedIn({ clientId });
  }

  private handleClientError(clientId: string) {
    this.logoutClientIfLoggedIn({ clientId });
  }

  private handleHeartbeatResponse(
    { timestamp }: WssPayloads[typeof WSS_UPSTREAM.HEARTBEAT_RESPONSE],
    clientId: string,
    sessionToken: string | null,
  ): void {
    this.dataController.processHeartbeatResponse(timestamp, clientId);
  }

  //User requests 'hard' login via WS. The sessionToken is used for validation here.
  private handleUserLogin(
    _payload: WssPayloads[typeof WSS_UPSTREAM.USER_LOGIN],
    clientId: string,
    sessionToken: string | null,
  ): void {
    const result = this.dataController.loginUser(sessionToken, clientId);

    if (!result.success) {
      this.networkController.sendUserLoginFailureMessage(
        clientId,
        result.message,
      );
      return;
    }

    //Login Success:

    const { message, userId, loginTakeover } = result;

    const userInfo = this.dataController.getUserInfo(userId);
    const audioInfo = this.audioController.getAudioInfo(userId);
    const turnServerInfo = this.networkController.getTurnServerInfo();
    const trackAndStream = this.audioController.getTxTrackAndStream(userId);

    if (!userInfo || !audioInfo) {
      //An internal error has occured
      //This is logged inside of data and audio controller
      this.networkController.sendUserLoginFailureMessage(clientId);
      this.logoutClientIfLoggedIn({ clientId });
      return;
    }

    //If a loginTakeover has taken place (meaning a client has been logged out to allow the new client to connect), disconnect the logged out client
    if (loginTakeover) {
      this.disconnectUser({
        userId,
        notifyClient: true,
        loginTakeover,
        clientId: result.loggedOutClientId,
      });
    }

    //Connect new client:
    this.networkController.createRtcPeerConnection(clientId);
    if (trackAndStream) {
      this.networkController.addRtcTxTrackAndStream(clientId, trackAndStream);
    }

    this.networkController.sendWssMessage(
      "USER_LOGIN_RESPONSE",
      { success: true, message, userInfo, audioInfo, turnServerInfo },
      [clientId],
    );
  }

  private handleUserLogout(
    _payload: WssPayloads[typeof WSS_UPSTREAM.USER_LOGOUT],
    clientId: string,
    sessionToken: string | null,
  ): void {
    this.logger.info(`User logout request`);
    this.logoutClientIfLoggedIn({ clientId, hardLogout: true });
  }

  private handleKeyPress(
    keyPressInfo: WssPayloads[typeof WSS_UPSTREAM.KEY_PRESS],
    clientId: string,
    sessionToken: string | null,
  ): void {
    this.logger.info(`Key press request:`, keyPressInfo);

    const userId = this.isClientIdLoggedIn(clientId, "Ignored key press");
    if (userId === null) return;

    this.audioController.processKeyPress(userId, keyPressInfo);
  }

  private handleWebRtcOffer(
    offer: WssPayloads[typeof WSS_UPSTREAM.WEB_RTC_OFFER],
    clientId: string,
    sessionToken: string | null,
  ): void {
    const userId = this.isClientIdLoggedIn(clientId, "Offer will be dropped");
    if (userId === null) return;
    this.networkController.processRtcRemoteOffer(clientId, offer);
  }

  private handleWebRtcClientIceCandidate(
    candidate: WssPayloads[typeof WSS_UPSTREAM.WEB_RTC_CLIENT_ICE_CANDIDATE],
    clientId: string,
    sessionToken: string | null,
  ): void {
    const userId = this.isClientIdLoggedIn(
      clientId,
      "Client ICE candidate will be dropped",
    );
    if (userId === null) return;
    this.networkController.processRtcRemoteIceCandidate(clientId, candidate);
  }

  //Admin requests 'hard' login via WS. The sessionToken is used for validation here.
  private handleAdminLogin(
    _payload: WssPayloads[typeof WSS_UPSTREAM.ADMIN_LOGIN],
    clientId: string,
    sessionToken: string | null,
  ): void {
    const { success, message } = this.dataController.loginAdmin(
      sessionToken,
      clientId,
    );

    if (!success) {
      this.networkController.sendAdminLoginFailureMessage(clientId, message);
      return;
    }

    //Login Success:

    this.networkController.sendWssMessage(
      "ADMIN_LOGIN_RESPONSE",
      { success: true, message },
      [clientId],
    );
  }

  //Handle WebRtc:

  private handleRtcConnected(clientId: string): void {
    this.logger.success(`WebRtc connected for client ${clientId}`);
  }

  private handleRtcDisconnected(clientId: string): void {
    this.logger.warn(`WebRtc disconnected for client ${clientId}`);
  }

  private handleRtcClosed(clientId: string): void {
    this.logger.warn(`WebRtc closed for client ${clientId}`);
    this.logoutClientIfLoggedIn({
      clientId,
      notifyClient: true,
      closeRtc: false,
    });
  }

  private handleRtcFailed(clientId: string): void {
    this.logger.warn(`WebRtc failed for client ${clientId}`);
    this.logoutClientIfLoggedIn({
      clientId,
      notifyClient: true,
      closeRtc: false,
    });
  }

  private handleRtcAnswer(clientId: string, answer: RtcAnswerWire): void {
    const userId = this.isClientIdLoggedIn(
      clientId,
      "Answer will not be sent to client",
    );
    if (userId === null) return;
    this.networkController.sendWssMessage("WEB_RTC_ANSWER", answer, [clientId]);
  }

  private handleRtcIceCandidate(
    clientId: string,
    candidate: RtcIceCandidateInitWire | null,
  ): void {
    const userId = this.isClientIdLoggedIn(
      clientId,
      "ICE candidate will not be sent to client",
    );
    if (userId === null) return;

    this.networkController.sendWssMessage(
      "WEB_RTC_SERVER_ICE_CANDIDATE",
      candidate,
      [clientId],
    );
  }

  private handleRtcTrack(clientId: string, track: RtcMediaStreamTrack): void {
    const userId = this.dataController.isClientIdLoggedIn(clientId);
    if (userId === null) {
      this.logger.warn(
        `Unable to add track for clientId ${clientId}: the client is not logged in`,
      );
      return;
    }
    this.audioController.addRxTrack(userId, track);
  }

  //Handle Data Controller:
  private handleAccountHeartbeat(
    clientIds: string[],
    payload: HeartbeatRequestPayload,
  ): void {
    this.networkController.sendWssMessage(
      "HEARTBEAT_REQUEST",
      payload,
      clientIds,
    );
  }

  private handleStaleHeartbeat(clientId: string): void {
    this.logoutClientIfLoggedIn({ clientId, notifyClient: true });
  }

  //Helpers:
  private isClientIdLoggedIn(clientId: string, action: string): number | null {
    const userId = this.dataController.isClientIdLoggedIn(clientId);
    if (userId === null) {
      this.logger.warn(
        `${action}: client is not logged in (clientId=${clientId}).`,
      );
    }
    return userId;
  }
}
