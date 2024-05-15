import UserNotifications

let APP_GROUP = "group.app.bsky"

class NotificationService: UNNotificationServiceExtension {
  var prefs = UserDefaults(suiteName: APP_GROUP)

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    guard var bestAttempt = createCopy(request.content),
          let reason = request.content.userInfo["reason"] as? String
    else {
      contentHandler(request.content)
      return
    }
    
    if reason == "chat-message" {
      mutateWithChatMessage(bestAttempt)
    }
    
    // The badge should always be incremented when in the background
    mutateWithBadge(bestAttempt)
    
    contentHandler(bestAttempt)
  }
  
  override func serviceExtensionTimeWillExpire() {
    // If for some reason the alloted time expires, we don't actually want to display a notification
  }
  
  func createCopy(_ content: UNNotificationContent) -> UNMutableNotificationContent? {
    return content.mutableCopy() as? UNMutableNotificationContent
  }
  
  func mutateWithBadge(_ content: UNMutableNotificationContent) {
    content.badge = 1
  }
  
  func mutateWithChatMessage(_ content: UNMutableNotificationContent) {
    if self.prefs?.bool(forKey: "playSoundChat") == true {
      mutateWithDmSound(content)
    }
  }
  
  func mutateWithDefaultSound(_ content: UNMutableNotificationContent) {
    content.sound = UNNotificationSound.default
  }
  
  func mutateWithDmSound(_ content: UNMutableNotificationContent) {
    content.sound = UNNotificationSound(named: UNNotificationSoundName(rawValue: "dm.aiff"))
  }
}
