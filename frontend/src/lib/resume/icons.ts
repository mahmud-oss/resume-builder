/**
 * The pictures a contact detail can show beside it. Line icons are drawn in
 * components/resume/ContactIcon.tsx; emoji are stored as "emoji:📞" and drawn as text.
 */

export type IconGroup = "Contact" | "Social" | "Work and study" | "Personal";

export const ICON_DEFS = [
  // Contact
  { id: "phone", label: "Phone", group: "Contact" },
  { id: "smartphone", label: "Mobile", group: "Contact" },
  { id: "mail", label: "Email", group: "Contact" },
  { id: "at", label: "At sign", group: "Contact" },
  { id: "message", label: "Message", group: "Contact" },
  { id: "send", label: "Send", group: "Contact" },
  { id: "pin", label: "Location", group: "Contact" },
  { id: "home", label: "Home", group: "Contact" },
  { id: "globe", label: "Website", group: "Contact" },
  { id: "link", label: "Link", group: "Contact" },
  // Social
  { id: "linkedin", label: "LinkedIn", group: "Social" },
  { id: "github", label: "GitHub", group: "Social" },
  { id: "gitlab", label: "GitLab", group: "Social" },
  { id: "facebook", label: "Facebook", group: "Social" },
  { id: "x", label: "X (Twitter)", group: "Social" },
  { id: "instagram", label: "Instagram", group: "Social" },
  { id: "youtube", label: "YouTube", group: "Social" },
  { id: "tiktok", label: "TikTok", group: "Social" },
  { id: "telegram", label: "Telegram", group: "Social" },
  { id: "whatsapp", label: "WhatsApp", group: "Social" },
  { id: "skype", label: "Skype", group: "Social" },
  { id: "discord", label: "Discord", group: "Social" },
  { id: "behance", label: "Behance", group: "Social" },
  { id: "dribbble", label: "Dribbble", group: "Social" },
  { id: "medium", label: "Medium", group: "Social" },
  { id: "stackoverflow", label: "Stack Overflow", group: "Social" },
  // Work and study
  { id: "briefcase", label: "Work", group: "Work and study" },
  { id: "building", label: "Company", group: "Work and study" },
  { id: "graduation", label: "Education", group: "Work and study" },
  { id: "book", label: "Book", group: "Work and study" },
  { id: "award", label: "Award", group: "Work and study" },
  { id: "badge", label: "Certified", group: "Work and study" },
  { id: "trophy", label: "Trophy", group: "Work and study" },
  { id: "code", label: "Code", group: "Work and study" },
  { id: "terminal", label: "Terminal", group: "Work and study" },
  { id: "wrench", label: "Tools", group: "Work and study" },
  { id: "palette", label: "Design", group: "Work and study" },
  { id: "camera", label: "Photo", group: "Work and study" },
  { id: "lightbulb", label: "Idea", group: "Work and study" },
  { id: "target", label: "Goal", group: "Work and study" },
  // Personal
  { id: "user", label: "Person", group: "Personal" },
  { id: "idcard", label: "ID card", group: "Personal" },
  { id: "calendar", label: "Date", group: "Personal" },
  { id: "clock", label: "Time", group: "Personal" },
  { id: "flag", label: "Nationality", group: "Personal" },
  { id: "languages", label: "Languages", group: "Personal" },
  { id: "car", label: "Driving licence", group: "Personal" },
  { id: "heart", label: "Heart", group: "Personal" },
  { id: "shield", label: "Shield", group: "Personal" },
  { id: "star", label: "Star", group: "Personal" },
] as const satisfies readonly { id: string; label: string; group: IconGroup }[];

export type IconId = (typeof ICON_DEFS)[number]["id"];

export const ICON_IDS: readonly IconId[] = ICON_DEFS.map((d) => d.id);

export const ICON_GROUPS: IconGroup[] = ["Contact", "Social", "Work and study", "Personal"];

export const ICON_LABELS = Object.fromEntries(ICON_DEFS.map((d) => [d.id, d.label])) as Record<IconId, string>;

/** An emoji picked by the user, stored as "emoji:" followed by the emoji. */
export type EmojiRef = `emoji:${string}`;

/** One picture: a line icon or an emoji. */
export type IconRef = IconId | EmojiRef;

/** A choice for one field: a picture, or "none" to show nothing even though icons are on. */
export type IconChoice = IconRef | "none";

/** The icon each standard contact field gets until the user picks another (or none). */
export const DEFAULT_CONTACT_ICON: Record<string, IconId> = {
  email: "mail",
  phone: "phone",
  location: "pin",
  website: "globe",
  linkedin: "linkedin",
};

/** Emoji pictures, flags and joined emoji (like a family or a profession), and nothing else. */
const EMOJI_ONLY = /^[\p{Extended_Pictographic}‍️\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}]+$/u;

export function isEmoji(text: string): boolean {
  return text.length > 0 && text.length <= 16 && EMOJI_ONLY.test(text);
}

export function toEmojiRef(text: string): EmojiRef | null {
  const t = text.trim();
  return isEmoji(t) ? `emoji:${t}` : null;
}

export function isIconId(v: unknown): v is IconId {
  return typeof v === "string" && (ICON_IDS as readonly string[]).includes(v);
}

export function isEmojiRef(v: unknown): v is EmojiRef {
  return typeof v === "string" && v.startsWith("emoji:") && isEmoji(v.slice(6));
}

export function isIconRef(v: unknown): v is IconRef {
  return isIconId(v) || isEmojiRef(v);
}

export function isIconChoice(v: unknown): v is IconChoice {
  return v === "none" || isIconRef(v);
}

/** The emoji inside a reference, or null for a line icon. */
export function emojiOf(ref: IconRef): string | null {
  return ref.startsWith("emoji:") ? ref.slice(6) : null;
}
