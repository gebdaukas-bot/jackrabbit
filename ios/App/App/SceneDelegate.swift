import UIKit
import Capacitor

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = MainViewController.navy
        window?.rootViewController = MainViewController()
        window?.makeKeyAndVisible()

        SceneDelegateProxy.shared.scene(scene, willConnectTo: session, options: connectionOptions)
    }

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        SceneDelegateProxy.shared.scene(scene, openURLContexts: URLContexts)
    }

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        SceneDelegateProxy.shared.scene(scene, continue: userActivity)
    }
}

// The app's navy behind everything native, so no white shows during launch, behind
// the status bar and home indicator, or past the edge of the page. The web view runs
// edge to edge (the page pads itself with the safe-area insets) and doesn't
// rubber-band; pages taller than the screen still scroll.
class MainViewController: CAPBridgeViewController {
    static let navy = UIColor(red: 6 / 255, green: 14 / 255, blue: 28 / 255, alpha: 1) // #060e1c

    override func capacitorDidLoad() {
        view.backgroundColor = Self.navy
        guard let webView = webView else { return }
        webView.isOpaque = false
        webView.backgroundColor = Self.navy
        webView.scrollView.backgroundColor = Self.navy
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        webView.scrollView.bounces = false
    }
}
