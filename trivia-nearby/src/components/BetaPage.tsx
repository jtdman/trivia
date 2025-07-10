import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Share, Plus, MoreVertical } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const BetaPage: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [isInstalled, setIsInstalled] = useState(false)
  const [isAndroid, setIsAndroid] = useState(false)

  useEffect(() => {
    // Detect iOS
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream
    setIsIOS(isIOSDevice)

    // Detect Android
    const isAndroidDevice = /Android/.test(navigator.userAgent)
    setIsAndroid(isAndroidDevice)

    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true)
    }

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    
    if (outcome === 'accepted') {
      setIsInstalled(true)
    }
    
    setDeferredPrompt(null)
  }

  if (isInstalled) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <div className="mb-6">
            <div className="w-24 h-24 bg-purple-500 rounded-2xl mx-auto flex items-center justify-center">
              <span className="text-5xl font-bold">?</span>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-4">You're All Set!</h1>
          <p className="text-gray-400 mb-8">
            Trivia Nearby is installed on your device. You can now close this page and open the app from your home screen.
          </p>
          <Link
            to="/"
            className="inline-block bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Open App
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="mb-6">
            <div className="w-24 h-24 bg-purple-500 rounded-2xl mx-auto flex items-center justify-center">
              <span className="text-5xl font-bold">?</span>
            </div>
          </div>
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-purple-400">TRIVIA</span>
            <span className="text-white">NEARBY</span>
            <span className="text-purple-400"> BETA</span>
          </h1>
          <p className="text-gray-400 text-lg">
            Install the app to find trivia events near you
          </p>
        </div>

        {/* Installation Instructions */}
        <div className="bg-gray-900 rounded-2xl p-8 mb-8">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            <Download className="w-6 h-6 text-purple-400" />
            Install Instructions
          </h2>

          {isIOS && (
            <div className="space-y-4">
              <p className="text-gray-300">
                To install on iOS, you need to use Safari browser:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">1.</span>
                  <div>
                    Tap the <Share className="inline w-5 h-5 text-purple-400" /> Share button at the bottom of Safari
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">2.</span>
                  <div>
                    Scroll down and tap <Plus className="inline w-5 h-5 text-purple-400" /> "Add to Home Screen"
                  </div>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">3.</span>
                  <div>Tap "Add" in the top right corner</div>
                </li>
              </ol>
            </div>
          )}

          {isAndroid && (
            <div className="space-y-4">
              {deferredPrompt ? (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3"
                >
                  <Download className="w-5 h-5" />
                  Install Trivia Nearby
                </button>
              ) : (
                <>
                  <p className="text-gray-300">
                    To install on Android:
                  </p>
                  <ol className="space-y-3 text-gray-300">
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">1.</span>
                      <div>
                        Tap the <MoreVertical className="inline w-5 h-5 text-purple-400" /> menu button
                      </div>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">2.</span>
                      <div>Select "Install app" or "Add to Home screen"</div>
                    </li>
                    <li className="flex gap-3">
                      <span className="text-purple-400 font-bold">3.</span>
                      <div>Tap "Install" to confirm</div>
                    </li>
                  </ol>
                </>
              )}
            </div>
          )}

          {!isIOS && !isAndroid && (
            <div className="space-y-4">
              <p className="text-gray-300">
                To install on desktop:
              </p>
              <ol className="space-y-3 text-gray-300">
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">1.</span>
                  <div>Look for the install icon in your browser's address bar</div>
                </li>
                <li className="flex gap-3">
                  <span className="text-purple-400 font-bold">2.</span>
                  <div>Click "Install" when prompted</div>
                </li>
              </ol>
              {deferredPrompt && (
                <button
                  onClick={handleInstallClick}
                  className="w-full bg-purple-500 hover:bg-purple-600 text-white font-medium py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-3 mt-6"
                >
                  <Download className="w-5 h-5" />
                  Install Trivia Nearby
                </button>
              )}
            </div>
          )}
        </div>

        {/* Features */}
        <div className="bg-gray-900 rounded-2xl p-8 mb-8">
          <h3 className="text-xl font-bold mb-4">Beta Features</h3>
          <ul className="space-y-2 text-gray-300">
            <li>✓ Find trivia events near your location</li>
            <li>✓ See event details, times, and prizes</li>
            <li>✓ Get directions to venues</li>
            <li>✓ Works offline with cached data</li>
            <li>✓ Installs like a native app</li>
          </ul>
        </div>

        {/* Try it now button */}
        <div className="text-center">
          <Link
            to="/"
            className="inline-block bg-gray-800 hover:bg-gray-700 text-white font-medium py-3 px-8 rounded-lg transition-colors"
          >
            Try Without Installing
          </Link>
          <p className="text-gray-500 text-sm mt-4">
            You can always install later from the main app
          </p>
        </div>

        {/* QR Code placeholder */}
        <div className="mt-12 text-center">
          <p className="text-gray-500 text-sm">
            Share this page: <span className="text-purple-400">trivia-nearby.com/beta</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export default BetaPage