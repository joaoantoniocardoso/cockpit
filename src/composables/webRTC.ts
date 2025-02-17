/* eslint-disable jsdoc/no-undefined-types */ // TODO: Fix RTCConfiguration is unknown

import { type Ref, ref, watch } from 'vue'

import * as Connection from '@/libs/connection/connection'
import { Session } from '@/libs/webrtc/session'
import { Signaller } from '@/libs/webrtc/signaller'
import type { Stream } from '@/libs/webrtc/signalling_protocol'

/**
 *
 */
interface startStreamReturn {
  /**
   * A list of Available WebRTC streams from Mavlink Camera Manager to be chosen from
   */
  availableStreams: Ref<Array<Stream>>
  /**
   * MediaStream object, if WebRTC stream is chosen
   */
  mediaStream: Ref<MediaStream | undefined>
  /**
   * Current status of the signalling
   */
  signallerStatus: Ref<string>
  /**
   * Current status of the stream
   */
  streamStatus: Ref<string>
}

/**
 *
 */
export class WebRTCManager {
  private availableStreams: Ref<Array<Stream>> = ref(new Array<Stream>())
  private mediaStream: Ref<MediaStream | undefined> = ref()
  private signallerStatus: Ref<string> = ref('waiting...')
  private streamStatus: Ref<string> = ref('waiting...')
  private consumerId: string | undefined
  private streamName: string | undefined
  private session: Session | undefined
  private rtcConfiguration: RTCConfiguration

  private hasEnded = false
  private signaller: Signaller
  private waitingForAvailableStreamsAnswer = false
  private waitingForSessionStart = false

  /**
   *
   * @param {Connection.URI} webRTCSignallingURI
   * @param {RTCConfiguration} rtcConfiguration
   */
  constructor(webRTCSignallingURI: Connection.URI, rtcConfiguration: RTCConfiguration) {
    console.debug('[WebRTC] Trying to connect to signalling server.')
    this.rtcConfiguration = rtcConfiguration
    this.signaller = new Signaller(
      webRTCSignallingURI,
      true,
      (): void => {
        this.startConsumer()
      },
      (status: string): void => this.updateSignallerStatus(status)
    )
  }

  /**
   *
   * @param {string} reason
   */
  public close(reason: string): void {
    this.stopSession(reason)
    this.signaller.end(reason)
    this.hasEnded = true
  }

  /**
   *
   * @param { Ref<Stream | undefined> } selectedStream - Stream to receive stream from
   * @returns { startStreamReturn }
   */
  public startStream(selectedStream: Ref<Stream | undefined>): startStreamReturn {
    watch(selectedStream, (newStream, oldStream) => {
      if (newStream?.id === oldStream?.id) {
        return
      }

      const msg = `Selected stream changed from "${oldStream?.id}" to "${newStream?.id}".`
      console.debug('[WebRTC] ' + msg)
      if (oldStream !== undefined) {
        this.stopSession(msg)
      }
      if (newStream !== undefined) {
        this.streamName = newStream.name
        this.startSession()
      }
    })

    return {
      availableStreams: this.availableStreams,
      mediaStream: this.mediaStream,
      signallerStatus: this.signallerStatus,
      streamStatus: this.streamStatus,
    }
  }

  /**
   *
   * @param {string} newStatus
   */
  private updateStreamStatus(newStatus: string): void {
    console.debug(`[WebRTC] Stream status updated from "${this.streamStatus.value}" to "${newStatus}"`)
    const time = new Date().toTimeString().split(' ').first()
    this.streamStatus.value = `${newStatus} (${time})`
  }

  /**
   *
   * @param {string} newStatus
   */
  private updateSignallerStatus(newStatus: string): void {
    console.debug(`[WebRTC] Signaller status updated from "${this.signallerStatus.value}" to "${newStatus}"`)
    const time = new Date().toTimeString().split(' ').first()
    this.signallerStatus.value = `${newStatus} (${time})`
  }

  /**
   *
   */
  private startConsumer(): void {
    this.hasEnded = false
    // Requests a new consumer ID
    if (this.consumerId === undefined) {
      this.signaller.requestConsumerId(
        (newConsumerId: string): void => {
          this.consumerId = newConsumerId
        },
        (newStatus: string): void => this.updateStreamStatus(newStatus)
      )
    }

    this.availableStreams.value = []
    this.updateStreamsAvailable()
  }

  /**
   *
   */
  private updateStreamsAvailable(): void {
    if (this.waitingForAvailableStreamsAnswer) {
      this.signaller.requestStreams()
      return
    }
    if (this.hasEnded) {
      this.waitingForAvailableStreamsAnswer = false
      return
    }
    this.waitingForAvailableStreamsAnswer = true

    // Asks for available streams, which will trigger the consumer "onAvailableStreams" callback
    window.setTimeout(() => {
      if (!this.waitingForAvailableStreamsAnswer) {
        return
      }

      // Register the parser to update the list of streams when the signaller receives the answer
      this.signaller.parseAvailableStreamsAnswer((availableStreams): void => {
        if (!this.waitingForAvailableStreamsAnswer) {
          return
        }
        this.waitingForAvailableStreamsAnswer = false
        this.availableStreams.value = availableStreams

        this.updateStreamsAvailable()
      })

      this.signaller.requestStreams()
    }, 1000)
  }

  /**
   *
   * @param {RTCTrackEvent} event
   */
  private onTrackAdded(event: RTCTrackEvent): void {
    const [remoteStream] = event.streams
    this.mediaStream.value = remoteStream

    // Assign 'motion' contentHint to media stream video tracks, so it performs better on low bandwith situations
    // More on that here: https://developer.mozilla.org/en-US/docs/Web/API/MediaStreamTrack/contentHint
    const videoTracks = this.mediaStream.value.getVideoTracks().filter((t) => t.kind === 'video')
    videoTracks.forEach((track) => {
      if (!('contentHint' in track)) {
        console.error('MediaStreamTrack contentHint attribute not supported.')
        return
      }
      track.contentHint = 'motion'
    })

    console.groupCollapsed('[WebRTC] Track added')
    console.debug('Event:', event)
    console.debug('Settings:', event.track.getSettings?.())
    console.debug('Constraints:', event.track.getConstraints?.())
    console.debug('Capabilities:', event.track.getCapabilities?.())
    console.groupEnd()
  }

  /**
   *
   * @param {Stream} stream
   * @param {string} consumerId
   */
  private requestSession(stream: Stream, consumerId: string): void {
    console.debug(`[WebRTC] Requesting stream:`, stream)

    // Requests a new Session ID
    this.signaller.requestSessionId(
      consumerId,
      stream.id,
      (receivedSessionId: string): void => {
        this.onSessionIdReceived(stream, stream.id, receivedSessionId)
      },
      (newStatus: string): void => this.updateStreamStatus(newStatus)
    )

    this.hasEnded = false
  }

  /**
   *
   */
  private startSession(): void {
    if (this.waitingForSessionStart) {
      return
    }
    this.waitingForSessionStart = true

    window.setTimeout(() => {
      if (!this.waitingForSessionStart) {
        return
      }

      const stream = this.availableStreams.value.find((s) => {
        return s.name === this.streamName
      })
      if (stream === undefined) {
        const error = `Failed to start a new Session with "${this.streamName}". Reason: not available`
        console.error('[WebRTC] ' + error)
        this.updateStreamStatus(error)

        this.waitingForSessionStart = false
        this.startSession()
        return
      }

      const msg = `Starting session with producer "${stream.id}" ("${this.streamName}")`
      this.updateStreamStatus(msg)
      console.debug('[WebRTC] ' + msg)

      if (this.consumerId === undefined) {
        const error =
          'Failed to start a new Session with producer' +
          `"${stream.id}" ("${this.streamName}"). Reason: undefined consumerId`
        console.error('[WebRTC] ' + error)
        this.updateStreamStatus(error)

        this.startConsumer()
        this.startSession()
        return
      }

      this.requestSession(stream, this.consumerId)

      this.waitingForSessionStart = false
    }, 1000)
  }

  /**
   *
   * @param {string} reason
   */
  private onSessionClosed(reason: string): void {
    this.stopSession(reason)
    this.consumerId = undefined
    this.startConsumer()
    this.startSession()
  }

  /**
   *
   * @param {Stream} stream
   * @param {string} producerId
   * @param {string} receivedSessionId
   */
  private onSessionIdReceived(stream: Stream, producerId: string, receivedSessionId: string): void {
    // Create a new Session with the received Session ID
    this.session = new Session(
      receivedSessionId,
      this.consumerId!,
      stream,
      this.signaller,
      this.rtcConfiguration,
      (event: RTCTrackEvent): void => this.onTrackAdded(event),
      (_sessionId, reason) => this.onSessionClosed(reason)
    )

    // Registers Session callback for the Signaller endSession parser
    this.signaller.parseEndSessionQuestion(
      this.consumerId!,
      producerId,
      this.session.id,
      (sessionId, reason) => {
        console.debug(`[WebRTC] Session ${sessionId} ended. Reason: ${reason}`)
        this.session = undefined
        this.hasEnded = true
      },
      (newStatus: string): void => this.updateSignallerStatus(newStatus)
    )

    // Registers Session callbacks for the Signaller Negotiation parser
    this.signaller.parseNegotiation(
      this.consumerId!,
      producerId,
      this.session.id,
      this.session.onIncomingICE.bind(this.session),
      this.session.onIncomingSDP.bind(this.session),
      (newStatus: string): void => this.updateSignallerStatus(newStatus)
    )

    const msg = `Session ${this.session.id} successfully started`
    console.debug('[WebRTC] ' + msg)
    this.updateStreamStatus(msg)
  }

  /**
   *
   * @param {string} reason
   */
  private stopSession(reason: string): void {
    if (this.session === undefined) {
      console.debug('[WebRTC] Stopping an undefined session, probably it was already stopped?')
      return
    }
    const msg = `Stopping session ${this.session.id}. Reason: ${reason}`
    this.updateStreamStatus(msg)
    console.debug('[WebRTC] ' + msg)

    this.session.end()
    this.session = undefined
    this.hasEnded = true
  }
}
