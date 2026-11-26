import Foundation
import ReplayKit

private enum BroadcastConstants {
  /// Must match RTCAppGroupIdentifier in the app's Info.plist (app.json).
  static let appGroupIdentifier = "group.com.iriemom.digitalvillage"
  /// Socket file the app listens on (@livekit/react-native-webrtc).
  static let socketFileName = "rtc_SSFD"
}

/// Entry point iOS runs when the child starts a broadcast to Digital Village.
/// It only forwards video frames to the app; nothing is saved, and audio is
/// never captured.
final class SampleHandler: RPBroadcastSampleHandler {
  private var connection: SocketConnection?
  private var uploader: SampleUploader?
  private var connectTimer: DispatchSourceTimer?

  private var socketFilePath: String {
    FileManager.default
      .containerURL(forSecurityApplicationGroupIdentifier: BroadcastConstants.appGroupIdentifier)?
      .appendingPathComponent(BroadcastConstants.socketFileName)
      .path ?? ""
  }

  override init() {
    super.init()
    if let connection = SocketConnection(filePath: socketFilePath) {
      self.connection = connection
      uploader = SampleUploader(connection: connection)
      connection.didClose = { [weak self] error in
        // The app stopped sharing (or the connection failed): end the broadcast
        // so the red recording indicator goes away.
        self?.finishBroadcastWithError(
          error ?? NSError(
            domain: RPRecordingErrorDomain,
            code: 10001,
            userInfo: [NSLocalizedDescriptionKey: "Screen sharing stopped."]))
      }
    }
  }

  override func broadcastStarted(withSetupInfo setupInfo: [String: NSObject]?) {
    guard connection != nil else {
      finishBroadcastWithError(
        NSError(
          domain: RPRecordingErrorDomain,
          code: 10002,
          userInfo: [NSLocalizedDescriptionKey: "Open Digital Village and accept the request first."]))
      return
    }
    openConnectionWhenAppIsReady()
  }

  override func broadcastFinished() {
    connectTimer?.cancel()
    connection?.close()
  }

  override func processSampleBuffer(_ sampleBuffer: CMSampleBuffer, with sampleBufferType: RPSampleBufferType) {
    // Video only: app and microphone audio are ignored.
    if sampleBufferType == .video {
      uploader?.send(sample: sampleBuffer)
    }
  }

  /// The app starts listening a moment after the child accepts; retry briefly.
  private func openConnectionWhenAppIsReady() {
    let timer = DispatchSource.makeTimerSource(queue: DispatchQueue(label: "com.iriemom.digitalvillage.broadcast.connect"))
    var attempts = 0
    timer.schedule(deadline: .now(), repeating: .milliseconds(200), leeway: .milliseconds(100))
    timer.setEventHandler { [weak self] in
      guard let self else { return }
      attempts += 1
      if self.connection?.open() == true {
        timer.cancel()
      } else if attempts > 75 {  // ~15 seconds
        timer.cancel()
        self.finishBroadcastWithError(
          NSError(
            domain: RPRecordingErrorDomain,
            code: 10003,
            userInfo: [NSLocalizedDescriptionKey: "Couldn't connect to Digital Village. Please try again."]))
      }
    }
    connectTimer = timer
    timer.resume()
  }
}
