# 📦 Listing Submission Kit — Ultra System Monitor

Everything needed to list Ultra System Monitor on free software directories.
Copy-paste the blocks below into each site's submission form.

## Status

| Venue | Cost | Status |
|---|---|---|
| **winget** (Windows Package Manager) | Free | ✅ **Submitted** — [PR #411531](https://github.com/microsoft/winget-pkgs/pull/411531). Once merged: `winget install AiCMSBD.UltraSystemMonitor` |
| **Microsoft Store** | Free (individual account) | Needs your Partner Center account — see steps below |
| **Chocolatey** | Free | Package ready in `packaging/chocolatey/` — needs your chocolatey.org account |
| **FossHub** | Free | Form submission below |
| **Softpedia** | Free | Form submission below |
| **MajorGeeks** | Free | Email submission below |
| **SourceForge** | Free | Needs account — can auto-mirror GitHub releases |
| **AlternativeTo** | Free | Needs account — community listing |
| **Homebrew cask** (macOS) | Free | Cask ready in `packaging/homebrew/` — submit after ~75 GitHub stars (their notability bar) |
| **Flathub / Snap** (Linux) | Free | Requires flatpak/snap targets — future work |

## Copy-paste metadata

**Name:** Ultra System Monitor
**Version:** 1.0.0
**Publisher:** AiCMS.BD
**Website:** https://aicms.bd
**Product page:** https://github.com/aicmsbd/ultra-system-monitor
**Download page:** https://github.com/aicmsbd/ultra-system-monitor/releases
**Direct download (Windows):** https://github.com/aicmsbd/ultra-system-monitor/releases/download/v1.0.0/UltraSystemMonitor-Setup-1.0.0.exe
**License:** Freeware (source-available, attribution required)
**OS:** Windows 10/11 (64-bit), Linux, macOS
**Category:** System / System Info / Benchmarks & Diagnostics
**Contact email:** mail@aicms.bd
**SHA-256 (Windows setup):** `71F377D3A5B6E08D35893498B23CC9094250D0CE7B1853FECEB083D5B8ED314A`

**Short description (≤150 chars):**
> Free real-time system monitoring sidebar: per-core CPU, GPU, RAM, network, storage & security. Detachable speedometer widgets. No ads, no tracking.

**Long description:**
> Ultra System Monitor is a completely free, privacy-first system monitoring sidebar by AiCMS.BD. It shows live per-core CPU load and temperature, GPU statistics (NVIDIA, AMD, Intel), RAM usage and module details, motherboard sensors, network speeds with a real-time graph, storage capacity/health, and Windows security status — all in a modern 3D glassmorphism interface. Any section can be detached as a floating widget and dragged anywhere on any monitor, with a choice of compact card or analog speedometer gauge view. Includes 4 themes plus custom accent colors, English and Bangla languages, threshold alerts with desktop notifications, history logging with CSV/JSON export, and an optional LibreHardwareMonitor bridge for deep sensors (voltages, fan RPM, VRM temps). No ads, no tracking, no telemetry — data never leaves the machine. Free software for the community by AiCMS.BD, makers of Bangla Keyboard, Bangla Fonts, Bangla OS and Bangla Browser.

## Where to submit

- **Microsoft Store:** register free individual account at https://partner.microsoft.com/dashboard/registration → reserve name "Ultra System Monitor" → submit MSIX (`npm run dist:store`, see below) → Store signs it for you (no SmartScreen for Store users).
- **Chocolatey:** create account at https://community.chocolatey.org → `choco pack` inside `packaging/chocolatey/` → `choco push`.
- **FossHub:** submit at https://www.fosshub.com (Developers → Submit software).
- **Softpedia:** submit at https://www.softpedia.com (webmasters/submit) — they scan and often award a "100% Clean" badge.
- **MajorGeeks:** email submission (see site footer) with the metadata block above.
- **SourceForge:** create project, enable GitHub release mirroring.
- **AlternativeTo:** add the app and mark it as an alternative to HWiNFO, Sidebar Diagnostics, AIDA64, Rainmeter.

## Microsoft Store (MSIX) build

`npm run dist:store` produces an unsigned `.appx` in `release/`. Upload it in
Partner Center — the Store signs it during publication. Before the first build,
replace the placeholder `identityName`/`publisher` values in `electron-builder.yml`
with the values Partner Center shows under *Product identity* after you reserve
the app name.
