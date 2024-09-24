import UIKit

class ShareViewController: UIViewController {
  // This allows other forks to use this extension while also changing their
  // scheme.
  let appScheme = Bundle.main.object(forInfoDictionaryKey: "MainAppScheme") as? String ?? "bluesky"

  override func viewDidAppear(_ animated: Bool) {
    super.viewDidAppear(animated)

    guard let extensionItem = extensionContext?.inputItems.first as? NSExtensionItem,
          let attachments = extensionItem.attachments,
          let firstAttachment = extensionItem.attachments?.first
    else {
      self.completeRequest()
      return
    }

    Task {
      if firstAttachment.hasItemConformingToTypeIdentifier("public.text") {
        await self.handleText(item: firstAttachment)
      } else if firstAttachment.hasItemConformingToTypeIdentifier("public.url") {
        await self.handleUrl(item: firstAttachment)
      } else if firstAttachment.hasItemConformingToTypeIdentifier("public.image") {
        await self.handleImages(items: attachments)
      } else if firstAttachment.hasItemConformingToTypeIdentifier("public.video") {
        await self.handleVideos(items: attachments)
      } else {
        self.completeRequest()
      }
    }
  }

  private func handleText(item: NSItemProvider) async {
    if let data = try? await item.loadItem(forTypeIdentifier: "public.text") as? String {
      if let encoded = data.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
         let url = URL(string: "\(self.appScheme)://intent/compose?text=\(encoded)") {
        _ = self.openURL(url)
      }
    }
    self.completeRequest()
  }

  private func handleUrl(item: NSItemProvider) async {
    if let data = try? await item.loadItem(forTypeIdentifier: "public.url") as? URL {
      if let encoded = data.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
         let url = URL(string: "\(self.appScheme)://intent/compose?text=\(encoded)") {
        _ = self.openURL(url)
      }
    }
    self.completeRequest()
  }

  private func handleImages(items: [NSItemProvider]) async {
    let firstFourItems: [NSItemProvider]
    if items.count < 4 {
      firstFourItems = items
    } else {
      firstFourItems = Array(items[0...3])
    }

    var valid = true
    var imageUris = ""

    for (index, item) in firstFourItems.enumerated() {
      var imageUriInfo: String?

      do {
        if let dataUri = try await item.loadItem(forTypeIdentifier: "public.image") as? URL {
          // We need to duplicate this image, since we don't have access to the outgoing temp directory
          // We also will get the image dimensions here, sinze RN makes it difficult to get those dimensions for local files
          let data = try Data(contentsOf: dataUri)
          let image = UIImage(data: data)
          imageUriInfo = self.saveImageWithInfo(image)
        } else if let image = try await item.loadItem(forTypeIdentifier: "public.image") as? UIImage {
          imageUriInfo = self.saveImageWithInfo(image)
        }
      } catch {
        valid = false
      }

      if let imageUriInfo = imageUriInfo {
        imageUris.append(imageUriInfo)
        if index < items.count - 1 {
          imageUris.append(",")
        }
      } else {
        valid = false
      }
    }

    if valid,
       let encoded = imageUris.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
       let url = URL(string: "\(self.appScheme)://intent/compose?imageUris=\(encoded)") {
      _ = self.openURL(url)
    }

    self.completeRequest()
  }

  private func handleVideos(items: [NSItemProvider]) async {
    let firstItem = items.first

    if let dataUri = try? await firstItem?.loadItem(forTypeIdentifier: "public.video") as? URL {
      let ext = String(dataUri.lastPathComponent.split(separator: ".").last ?? "mp4")
      if let tempUrl = getTempUrl(ext: ext) {
        let data = try? Data(contentsOf: dataUri)
        try? data?.write(to: tempUrl)

        if let encoded = dataUri.absoluteString.addingPercentEncoding(withAllowedCharacters: .urlHostAllowed),
           let url = URL(string: "\(self.appScheme)://intent/compose?videoUri=\(encoded)") {
          _ = self.openURL(url)
        }
      }
    }

    self.completeRequest()
  }

  private func saveImageWithInfo(_ image: UIImage?) -> String? {
    guard let image = image else {
      return nil
    }

    do {
      // Saving this file to the bundle group's directory lets us access it from
      // inside of the app. Otherwise, we wouldn't have access even though the
      // extension does.
      if let tempUrl = getTempUrl(ext: "jpeg"),
         let jpegData = image.jpegData(compressionQuality: 1) {
          try jpegData.write(to: tempUrl)
          return "\(tempUrl.absoluteString)|\(image.size.width)|\(image.size.height)"
      }
    } catch {}
    return nil
  }

  private func completeRequest() {
    self.extensionContext?.completeRequest(returningItems: nil)
  }

  private func getTempUrl(ext: String) -> URL? {
    if let dir = FileManager().containerURL(forSecurityApplicationGroupIdentifier: "group.app.bsky") {
      return URL(string: "\(dir.absoluteString)\(ProcessInfo.processInfo.globallyUniqueString).\(ext)")!
    }
    return nil
  }

  @objc func openURL(_ url: URL) -> Bool {
    var responder: UIResponder? = self
    while responder != nil {
      if let application = responder as? UIApplication {
          return application.perform(#selector(openURL(_:)), with: url) != nil
      }
      responder = responder?.next
    }
    return false
  }
}
