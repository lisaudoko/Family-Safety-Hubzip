import CoreImage
import Foundation
import ReplayKit

/// Encodes screen frames as JPEG and sends each one to the app framed as an
/// HTTP message with Content-Length / Buffer-Width / Buffer-Height /
/// Buffer-Orientation headers: the format LKRNScreenCapturer in
/// @livekit/react-native-webrtc parses. Adapted from the Jitsi sample.
final class SampleUploader {
  private static let imageContext = CIContext(options: nil)
  private static let chunkLength = 10 * 1024

  @Atomic private var isReady = false
  private let connection: SocketConnection

  private var dataToSend: Data?
  private var byteIndex = 0

  private let serialQueue = DispatchQueue(label: "com.iriemom.digitalvillage.broadcast.uploader")

  init(connection: SocketConnection) {
    self.connection = connection
    setupConnection()
  }

  /// Drops the frame (returns false) while the previous one is still being sent,
  /// which keeps memory flat inside the extension's tight limit.
  @discardableResult
  func send(sample buffer: CMSampleBuffer) -> Bool {
    guard isReady else { return false }

    isReady = false

    dataToSend = prepare(sample: buffer)
    byteIndex = 0

    serialQueue.async { [weak self] in
      self?.sendDataChunk()
    }
    return true
  }
}

private extension SampleUploader {
  func setupConnection() {
    connection.didOpen = { [weak self] in
      self?.isReady = true
    }
    connection.streamHasSpaceAvailable = { [weak self] in
      self?.serialQueue.async {
        if let success = self?.sendDataChunk() {
          self?.isReady = !success
        }
      }
    }
  }

  /// Sends the next chunk of the current frame. Returns true while more of the
  /// frame remains (so the uploader isn't ready for a new frame yet).
  @discardableResult
  func sendDataChunk() -> Bool {
    guard let dataToSend = dataToSend else { return false }

    var bytesLeft = dataToSend.count - byteIndex
    var length = min(bytesLeft, SampleUploader.chunkLength)

    length = dataToSend[byteIndex..<(byteIndex + length)].withUnsafeBytes { raw in
      guard let pointer = raw.bindMemory(to: UInt8.self).baseAddress else { return 0 }
      return connection.writeToStream(buffer: pointer, maxLength: length)
    }

    if length > 0 {
      byteIndex += length
      bytesLeft -= length

      if bytesLeft == 0 {
        self.dataToSend = nil
        byteIndex = 0
      }
    }

    return true
  }

  func prepare(sample buffer: CMSampleBuffer) -> Data? {
    guard let imageBuffer = CMSampleBufferGetImageBuffer(buffer) else { return nil }

    CVPixelBufferLockBaseAddress(imageBuffer, .readOnly)

    // Half resolution keeps the extension well inside its memory limit and is
    // plenty for a parent watching on a phone.
    let scaleFactor = 2.0
    let width = CVPixelBufferGetWidth(imageBuffer) / Int(scaleFactor)
    let height = CVPixelBufferGetHeight(imageBuffer) / Int(scaleFactor)
    let orientation =
      (CMGetAttachment(buffer, key: RPVideoSampleOrientationKey as CFString, attachmentModeOut: nil)
        as? NSNumber)?.uintValue ?? 0

    let scaleTransform = CGAffineTransform(scaleX: CGFloat(1.0 / scaleFactor), y: CGFloat(1.0 / scaleFactor))
    let bufferData = jpegData(from: imageBuffer, scale: scaleTransform)

    CVPixelBufferUnlockBaseAddress(imageBuffer, .readOnly)

    guard let messageData = bufferData else { return nil }

    let message = CFHTTPMessageCreateResponse(nil, 200, nil, kCFHTTPVersion1_1).takeRetainedValue()
    CFHTTPMessageSetHeaderFieldValue(message, "Content-Length" as CFString, String(messageData.count) as CFString)
    CFHTTPMessageSetHeaderFieldValue(message, "Buffer-Width" as CFString, String(width) as CFString)
    CFHTTPMessageSetHeaderFieldValue(message, "Buffer-Height" as CFString, String(height) as CFString)
    CFHTTPMessageSetHeaderFieldValue(message, "Buffer-Orientation" as CFString, String(orientation) as CFString)
    CFHTTPMessageSetBody(message, messageData as CFData)

    return CFHTTPMessageCopySerializedMessage(message)?.takeRetainedValue() as Data?
  }

  func jpegData(from buffer: CVPixelBuffer, scale: CGAffineTransform) -> Data? {
    let image = CIImage(cvPixelBuffer: buffer).transformed(by: scale)
    guard let colorSpace = image.colorSpace else { return nil }

    let options: [CIImageRepresentationOption: Any] = [
      CIImageRepresentationOption(rawValue: kCGImageDestinationLossyCompressionQuality as String): 0.8,
    ]
    return SampleUploader.imageContext.jpegRepresentation(of: image, colorSpace: colorSpace, options: options)
  }
}
