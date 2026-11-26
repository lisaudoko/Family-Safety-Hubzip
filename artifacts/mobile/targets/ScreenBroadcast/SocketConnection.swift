import Foundation

/// Client side of the Unix-domain socket the Digital Village app listens on
/// (@livekit/react-native-webrtc's LKRNSocketConnection, file "rtc_SSFD" in the
/// shared App Group container). Adapted from the Jitsi broadcast-extension
/// sample that the LiveKit React Native SDK documents.
final class SocketConnection: NSObject {
  var didOpen: (() -> Void)?
  var didClose: ((Error?) -> Void)?
  var streamHasSpaceAvailable: (() -> Void)?

  private let filePath: String
  private var socketHandle: Int32 = -1
  private var address: sockaddr_un?

  private var inputStream: InputStream?
  private var outputStream: OutputStream?

  private var networkQueue: DispatchQueue?
  private var shouldKeepRunning = false

  init?(filePath path: String) {
    filePath = path
    socketHandle = Darwin.socket(AF_UNIX, SOCK_STREAM, 0)
    guard socketHandle != -1 else { return nil }
  }

  /// Returns false until the app has started listening (it does so when the
  /// child accepts and screen sharing begins), so the caller retries.
  func open() -> Bool {
    guard FileManager.default.fileExists(atPath: filePath) else { return false }
    guard setupAddress() else { return false }
    guard connectSocket() else { return false }

    setupStreams()
    inputStream?.open()
    outputStream?.open()
    return true
  }

  func close() {
    unscheduleStreams()

    inputStream?.delegate = nil
    outputStream?.delegate = nil

    inputStream?.close()
    outputStream?.close()

    inputStream = nil
    outputStream = nil
  }

  func writeToStream(buffer: UnsafePointer<UInt8>, maxLength length: Int) -> Int {
    outputStream?.write(buffer, maxLength: length) ?? 0
  }
}

extension SocketConnection: StreamDelegate {
  func stream(_ aStream: Stream, handle eventCode: Stream.Event) {
    switch eventCode {
    case .openCompleted:
      if aStream == outputStream {
        didOpen?()
      }
    case .hasBytesAvailable:
      if aStream == inputStream {
        var buffer: UInt8 = 0
        let numberOfBytesRead = inputStream?.read(&buffer, maxLength: 1)
        if numberOfBytesRead == 0 && aStream.streamStatus == .atEnd {
          // The app closed the socket: sharing was stopped from Digital Village.
          close()
          didClose?(nil)
        }
      }
    case .hasSpaceAvailable:
      if aStream == outputStream {
        streamHasSpaceAvailable?()
      }
    case .errorOccurred:
      close()
      didClose?(aStream.streamError)
    default:
      break
    }
  }
}

private extension SocketConnection {
  func setupAddress() -> Bool {
    var addr = sockaddr_un()
    guard filePath.utf8.count < MemoryLayout.size(ofValue: addr.sun_path) else {
      return false
    }

    addr.sun_family = sa_family_t(AF_UNIX)
    filePath.withCString { source in
      withUnsafeMutablePointer(to: &addr.sun_path.0) { destination in
        _ = strncpy(destination, source, filePath.utf8.count)
      }
    }

    address = addr
    return true
  }

  func connectSocket() -> Bool {
    guard var addr = address else { return false }

    let status = withUnsafePointer(to: &addr) { pointer in
      pointer.withMemoryRebound(to: sockaddr.self, capacity: 1) {
        Darwin.connect(socketHandle, $0, socklen_t(MemoryLayout<sockaddr_un>.size))
      }
    }
    return status == noErr
  }

  func setupStreams() {
    var readStream: Unmanaged<CFReadStream>?
    var writeStream: Unmanaged<CFWriteStream>?

    CFStreamCreatePairWithSocket(kCFAllocatorDefault, socketHandle, &readStream, &writeStream)

    inputStream = readStream?.takeRetainedValue()
    inputStream?.delegate = self
    inputStream?.setProperty(
      kCFBooleanTrue,
      forKey: Stream.PropertyKey(kCFStreamPropertyShouldCloseNativeSocket as String))

    outputStream = writeStream?.takeRetainedValue()
    outputStream?.delegate = self
    outputStream?.setProperty(
      kCFBooleanTrue,
      forKey: Stream.PropertyKey(kCFStreamPropertyShouldCloseNativeSocket as String))

    scheduleStreams()
  }

  func scheduleStreams() {
    shouldKeepRunning = true

    networkQueue = DispatchQueue.global(qos: .userInitiated)
    networkQueue?.async { [weak self] in
      self?.inputStream?.schedule(in: .current, forMode: .common)
      self?.outputStream?.schedule(in: .current, forMode: .common)
      RunLoop.current.run()

      var isRunning = false
      repeat {
        isRunning = (self?.shouldKeepRunning ?? false)
          && RunLoop.current.run(mode: .default, before: .distantFuture)
      } while isRunning
    }
  }

  func unscheduleStreams() {
    networkQueue?.sync { [weak self] in
      self?.inputStream?.remove(from: .current, forMode: .common)
      self?.outputStream?.remove(from: .current, forMode: .common)
    }
    shouldKeepRunning = false
  }
}
