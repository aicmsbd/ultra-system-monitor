# Homebrew cask for Ultra System Monitor.
# Submit to https://github.com/Homebrew/homebrew-cask once the project meets
# their notability bar (roughly 75+ GitHub stars / 30+ forks); until then users
# can `brew install --cask ./ultra-system-monitor.rb` directly from this file.
cask "ultra-system-monitor" do
  arch arm: "arm64", intel: "x64"

  version "1.0.0"
  sha256 arm:   :no_check, # replace with shasum -a 256 of the arm64 dmg when submitting
         intel: :no_check  # replace with shasum -a 256 of the x64 dmg when submitting

  url "https://github.com/aicmsbd/ultra-system-monitor/releases/download/v#{version}/UltraSystemMonitor-#{version}-#{arch}.dmg"
  name "Ultra System Monitor"
  desc "Real-time system monitoring sidebar with detachable speedometer widgets"
  homepage "https://github.com/aicmsbd/ultra-system-monitor"

  app "Ultra System Monitor.app"

  zap trash: [
    "~/Library/Application Support/Ultra System Monitor",
  ]
end
