export type MenuKey =
  | "home"
  | "library"
  | "upload"
  | "fusion"
  | "statistics"
  | "accounts"
  | "settings" 
  | "ethics"
  | "about"
  | "contact";

export const MENUS: { key: MenuKey; label: string }[] = [
  { key: "home", label: "Home" },
  { key: "library", label: "Sound Library" },
  { key: "upload", label: "Upload" },
  { key: "fusion", label: "Fusion" },
  { key: "statistics", label: "Statistics" },
  { key: "accounts", label: "Accounts" },
  { key: "settings", label: "Settings" }, 
  { key: "ethics", label: "Ethics" },
  { key: "about", label: "About" },
  { key: "contact", label: "Contact" },
];