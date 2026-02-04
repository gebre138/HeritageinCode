export type MenuKey =
  | "home"
  | "library"
  | "upload"
  | "fusion"
  | "learn"
  | "statistics"
  | "accounts"
  | "settings"
  | "ethics"
  | "about"
  | "contact"
  | "identify"
  | "guide";

export const MENUS: { key: MenuKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "library", label: "Sound Library" },
  { key: "upload", label: "Upload" },
  { key: "fusion", label: "Fusion" },
  { key: "learn", label: "Learn More" },
  { key: "statistics", label: "Statistics" },
  { key: "accounts", label: "Accounts" },
  { key: "settings", label: "Settings" },
  { key: "ethics", label: "Ethics" },
  { key: "about", label: "About" },
  { key: "contact", label: "Contact" },
];