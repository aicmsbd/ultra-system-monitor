import { Language } from '../shared/types';

/** Lightweight i18n: English + Bengali dictionaries, no runtime dependency. */

const en = {
  appTitle: 'ULTRA SYSTEM MONITOR',
  cpu: 'CPU', gpu: 'GPU', ram: 'RAM', motherboard: 'Motherboard',
  network: 'Network', storage: 'Storage', security: 'Security & Health',
  overallLoad: 'Overall Load', temperature: 'Temperature', baseClock: 'Base Clock',
  currentClock: 'Current', voltage: 'Voltage', power: 'Power', fanSpeed: 'Fan Speed',
  coreStatus: 'Core Status', threads: 'Threads',
  coreLoad: 'Core Load', coreClock: 'Core Clock', memClock: 'Memory Clock',
  vramUsed: 'VRAM Used', powerDraw: 'Power Draw',
  usage: 'Usage', used: 'Used', speed: 'Speed', pageFile: 'Page File', cache: 'Cache',
  xmpActive: 'XMP Active', xmpInactive: 'JEDEC',
  vrmTemp: 'VRM Temp', biosVersion: 'BIOS Version', rail12: '12V Rail', rail5: '5V Rail', rail33: '3.3V Rail',
  fans: 'Fans', adapter: 'Adapter', download: 'Download', upload: 'Upload',
  latency: 'Latency', totalToday: 'Total today', totalMonth: 'This month',
  liveGraph: 'Real-time Graph (last 60 sec)',
  read: 'Read', write: 'Write', diskIO: 'Disk I/O',
  defender: 'Windows Defender', firewall: 'Firewall', lastScan: 'Last Scan',
  threats: 'Threats Found', uptime: 'Uptime', healthScore: 'Health Score',
  active: 'Active', inactive: 'Inactive', enabled: 'Enabled', disabled: 'Disabled', unknown: 'Unknown',
  settings: 'Settings', refreshInterval: 'Refresh interval', theme: 'Theme', language: 'Language',
  opacity: 'Opacity', alwaysOnTop: 'Always on top', autoHide: 'Auto-hide sidebar',
  startWithWindows: 'Start with Windows', alertsEnabled: 'Desktop alerts',
  themeDark: 'Dark', themeLight: 'Light', themeNeon: 'Neon', themeMinimal: 'Minimal',
  screenshot: 'Screenshot', exportCsv: 'Export CSV', exportJson: 'Export JSON', about: 'About',
  alerts: 'Alerts', quickActions: 'Quick Actions', close: 'Close',
  detecting: 'Detecting hardware…', welcome: 'Welcome to Ultra System Monitor',
  welcomeBody: 'Scanning your system sensors. For deep sensors (per-core temps, voltages, fan RPM), run LibreHardwareMonitor with its Remote Web Server enabled on port 8085.',
  lhmOn: 'LHM sensors connected', lhmOff: 'Basic sensors (LHM offline)',
  savedTo: 'Saved to', noAlerts: 'All systems nominal',
  details: 'Details', general: 'General', displays: 'Displays', modules: 'Memory Modules',
  manufacturer: 'Manufacturer', formFactor: 'Form Factor', slots: 'Memory Slots',
  maxCapacity: 'Max Capacity', adapters: 'Adapters', mac: 'MAC Address',
  os: 'Operating System', hostname: 'Hostname', build: 'Build', firmware: 'Firmware',
  accentColor: 'Accent color', reset: 'Reset to theme default'
};

const bn: typeof en = {
  appTitle: 'আল্ট্রা সিস্টেম মনিটর',
  cpu: 'সিপিইউ', gpu: 'জিপিইউ', ram: 'র‍্যাম', motherboard: 'মাদারবোর্ড',
  network: 'নেটওয়ার্ক', storage: 'স্টোরেজ', security: 'নিরাপত্তা ও স্বাস্থ্য',
  overallLoad: 'মোট লোড', temperature: 'তাপমাত্রা', baseClock: 'বেস ক্লক',
  currentClock: 'বর্তমান', voltage: 'ভোল্টেজ', power: 'পাওয়ার', fanSpeed: 'ফ্যান গতি',
  coreStatus: 'কোর অবস্থা', threads: 'থ্রেড',
  coreLoad: 'কোর লোড', coreClock: 'কোর ক্লক', memClock: 'মেমরি ক্লক',
  vramUsed: 'ভির‍্যাম ব্যবহৃত', powerDraw: 'পাওয়ার ড্র',
  usage: 'ব্যবহার', used: 'ব্যবহৃত', speed: 'গতি', pageFile: 'পেজ ফাইল', cache: 'ক্যাশ',
  xmpActive: 'XMP সক্রিয়', xmpInactive: 'JEDEC',
  vrmTemp: 'VRM তাপমাত্রা', biosVersion: 'BIOS সংস্করণ', rail12: '12V রেল', rail5: '5V রেল', rail33: '3.3V রেল',
  fans: 'ফ্যান', adapter: 'অ্যাডাপ্টার', download: 'ডাউনলোড', upload: 'আপলোড',
  latency: 'লেটেন্সি', totalToday: 'আজকের মোট', totalMonth: 'এই মাসে',
  liveGraph: 'রিয়েল-টাইম গ্রাফ (শেষ ৬০ সেকেন্ড)',
  read: 'রিড', write: 'রাইট', diskIO: 'ডিস্ক আই/ও',
  defender: 'উইন্ডোজ ডিফেন্ডার', firewall: 'ফায়ারওয়াল', lastScan: 'শেষ স্ক্যান',
  threats: 'হুমকি পাওয়া গেছে', uptime: 'আপটাইম', healthScore: 'স্বাস্থ্য স্কোর',
  active: 'সক্রিয়', inactive: 'নিষ্ক্রিয়', enabled: 'চালু', disabled: 'বন্ধ', unknown: 'অজানা',
  settings: 'সেটিংস', refreshInterval: 'রিফ্রেশ বিরতি', theme: 'থিম', language: 'ভাষা',
  opacity: 'স্বচ্ছতা', alwaysOnTop: 'সবসময় উপরে', autoHide: 'অটো-হাইড সাইডবার',
  startWithWindows: 'উইন্ডোজের সাথে চালু', alertsEnabled: 'ডেস্কটপ সতর্কতা',
  themeDark: 'ডার্ক', themeLight: 'লাইট', themeNeon: 'নিয়ন', themeMinimal: 'মিনিমাল',
  screenshot: 'স্ক্রিনশট', exportCsv: 'CSV রপ্তানি', exportJson: 'JSON রপ্তানি', about: 'সম্পর্কে',
  alerts: 'সতর্কতা', quickActions: 'দ্রুত অ্যাকশন', close: 'বন্ধ',
  detecting: 'হার্ডওয়্যার সনাক্ত করা হচ্ছে…', welcome: 'আল্ট্রা সিস্টেম মনিটরে স্বাগতম',
  welcomeBody: 'আপনার সিস্টেম সেন্সর স্ক্যান করা হচ্ছে। গভীর সেন্সরের জন্য (কোর তাপমাত্রা, ভোল্টেজ, ফ্যান RPM) LibreHardwareMonitor-এর Remote Web Server (পোর্ট 8085) চালু করুন।',
  lhmOn: 'LHM সেন্সর সংযুক্ত', lhmOff: 'বেসিক সেন্সর (LHM অফলাইন)',
  savedTo: 'সংরক্ষিত', noAlerts: 'সব সিস্টেম স্বাভাবিক',
  details: 'বিস্তারিত', general: 'সাধারণ', displays: 'ডিসপ্লে', modules: 'মেমরি মডিউল',
  manufacturer: 'প্রস্তুতকারক', formFactor: 'ফর্ম ফ্যাক্টর', slots: 'মেমরি স্লট',
  maxCapacity: 'সর্বোচ্চ ক্ষমতা', adapters: 'অ্যাডাপ্টার', mac: 'MAC ঠিকানা',
  os: 'অপারেটিং সিস্টেম', hostname: 'হোস্টনেম', build: 'বিল্ড', firmware: 'ফার্মওয়্যার',
  accentColor: 'অ্যাকসেন্ট রং', reset: 'ডিফল্টে ফিরুন'
};

const dicts: Record<Language, typeof en> = { en, bn };

export type TKey = keyof typeof en;

export function makeT(lang: Language) {
  return (key: TKey): string => dicts[lang][key] ?? en[key] ?? key;
}
