"use client";

import { useState } from "react";
import type { IconType } from "react-icons";
import {
  FaBehance,
  FaDiscord,
  FaDribbble,
  FaFacebookF,
  FaGithub,
  FaGitlab,
  FaInstagram,
  FaLinkedinIn,
  FaMedium,
  FaSkype,
  FaStackOverflow,
  FaTelegram,
  FaTiktok,
  FaWhatsapp,
  FaXTwitter,
  FaYoutube,
} from "react-icons/fa6";
import {
  LuAtSign,
  LuAward,
  LuBadgeCheck,
  LuBookOpen,
  LuBriefcase,
  LuBuilding2,
  LuCalendar,
  LuCamera,
  LuCar,
  LuClock,
  LuCode,
  LuFlag,
  LuGlobe,
  LuGraduationCap,
  LuHeart,
  LuHouse,
  LuIdCard,
  LuLanguages,
  LuLightbulb,
  LuLink,
  LuMail,
  LuMapPin,
  LuMessageCircle,
  LuPalette,
  LuPhone,
  LuSend,
  LuShield,
  LuSmartphone,
  LuStar,
  LuTarget,
  LuTerminal,
  LuTrophy,
  LuUser,
  LuWrench,
} from "react-icons/lu";

import { PortalMenu } from "@/components/editor/PortalMenu";
import {
  emojiOf,
  ICON_DEFS,
  ICON_GROUPS,
  ICON_LABELS,
  toEmojiRef,
  type IconChoice,
  type IconId,
  type IconRef,
} from "@/lib/resume/icons";
import type { Mutation } from "@/lib/resume/mutations";

import { useVisual } from "./visual/Actions";

/** Every icon id must be listed here; the type checker complains if one is missing. */
const GLYPHS: Record<IconId, IconType> = {
  phone: LuPhone,
  smartphone: LuSmartphone,
  mail: LuMail,
  at: LuAtSign,
  message: LuMessageCircle,
  send: LuSend,
  pin: LuMapPin,
  home: LuHouse,
  globe: LuGlobe,
  link: LuLink,
  linkedin: FaLinkedinIn,
  github: FaGithub,
  gitlab: FaGitlab,
  facebook: FaFacebookF,
  x: FaXTwitter,
  instagram: FaInstagram,
  youtube: FaYoutube,
  tiktok: FaTiktok,
  telegram: FaTelegram,
  whatsapp: FaWhatsapp,
  skype: FaSkype,
  discord: FaDiscord,
  behance: FaBehance,
  dribbble: FaDribbble,
  medium: FaMedium,
  stackoverflow: FaStackOverflow,
  briefcase: LuBriefcase,
  building: LuBuilding2,
  graduation: LuGraduationCap,
  book: LuBookOpen,
  award: LuAward,
  badge: LuBadgeCheck,
  trophy: LuTrophy,
  code: LuCode,
  terminal: LuTerminal,
  wrench: LuWrench,
  palette: LuPalette,
  camera: LuCamera,
  lightbulb: LuLightbulb,
  target: LuTarget,
  user: LuUser,
  idcard: LuIdCard,
  calendar: LuCalendar,
  clock: LuClock,
  flag: LuFlag,
  languages: LuLanguages,
  car: LuCar,
  heart: LuHeart,
  shield: LuShield,
  star: LuStar,
};

/** A few emoji people commonly put on a CV. Anything else can be typed or pasted. */
const EMOJI = [
  "📞", "📱", "☎️", "✉️", "📧", "📍", "🏠", "🌐", "🔗", "💬",
  "💼", "🎓", "🏆", "🥇", "⭐", "❤️", "🚗", "🪪", "🗣️", "📅",
  "🕒", "🛠️", "💻", "🖥️", "⌨️", "📊", "📈", "📚", "📝", "📄",
  "📎", "🔬", "🎨", "📷", "🎵", "⚽", "✈️", "🌍", "🇧🇩", "🏢",
  "🏫", "🏥", "⚖️", "🔧", "✅", "🚀", "💡", "🎯", "🧠", "🤝",
  "👤", "👨‍💻", "👩‍💻", "🔒", "☕", "🌱", "📌", "🔔",
];

export function IconGlyph({ id, size = 14 }: { id: IconId; size?: number }) {
  const Glyph = GLYPHS[id];
  return (
    <span style={{ display: "inline-flex", flexShrink: 0 }} aria-hidden>
      <Glyph size={size} />
    </span>
  );
}

/** Draws a line icon or an emoji at the size of the surrounding text. */
export function IconView({ icon, size = 14 }: { icon: IconRef; size?: number }) {
  const emoji = emojiOf(icon);
  if (emoji) {
    return (
      <span aria-hidden style={{ fontSize: size, lineHeight: 1, display: "inline-block", fontFamily: '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif' }}>
        {emoji}
      </span>
    );
  }
  return <IconGlyph id={icon as IconId} size={size} />;
}

type Props = {
  /** The picture to show, or null for none. */
  id: IconRef | null;
  color: string;
  /** Builds the edit for a choice. A null choice means "back to the default". */
  choose: (choice: IconChoice | null) => Mutation;
  /** The icon a null choice goes back to, for the menu text. */
  defaultId?: IconId;
};

/**
 * A picture beside a contact detail. On the page-first editor it is a button that opens a picker
 * (line icons or emoji); everywhere else (previews, the PDF) it is just the picture.
 */
export function ContactIcon({ id, color, choose, defaultId }: Props) {
  const v = useVisual();
  if (!v) {
    return id ? (
      <span style={{ color, display: "inline-flex", alignItems: "center" }}>
        <IconView icon={id} />
      </span>
    ) : null;
  }

  return (
    <PortalMenu
      label="Choose icon"
      trigger={
        id ? (
          <IconView icon={id} />
        ) : (
          <span style={{ width: 14, height: 14, border: "1px dashed currentColor", borderRadius: 3, fontSize: 10, lineHeight: "12px", textAlign: "center", display: "block", opacity: 0.6 }}>+</span>
        )
      }
      triggerClassName="inline-flex items-center rounded hover:bg-black/10"
      width={316}
    >
      {(close) => (
        <Picker
          current={id}
          defaultId={defaultId}
          onChoose={(choice) => {
            v.edit(choose(choice));
            close();
          }}
        />
      )}
    </PortalMenu>
  );
}

function Picker({
  current,
  defaultId,
  onChoose,
}: {
  current: IconRef | null;
  defaultId?: IconId;
  onChoose: (choice: IconChoice | null) => void;
}) {
  const [tab, setTab] = useState<"icons" | "emoji">(current && emojiOf(current) ? "emoji" : "icons");
  const [typed, setTyped] = useState("");
  const typedRef = toEmojiRef(typed);

  return (
    <div>
      <div className="mb-2 flex gap-1" role="tablist" aria-label="Kind of picture">
        {(["icons", "emoji"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`rounded-md px-3 py-1 text-xs font-medium ${tab === t ? "bg-brand text-white" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
          >
            {t === "icons" ? "Icons" : "Emoji"}
          </button>
        ))}
      </div>

      {tab === "icons" ? (
        <div className="space-y-3">
          {ICON_GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-1 text-xs font-medium text-slate-500">{group}</p>
              <div className="grid grid-cols-8 gap-1">
                {ICON_DEFS.filter((d) => d.group === group).map((d) => (
                  <button
                    key={d.id}
                    type="button"
                    aria-label={ICON_LABELS[d.id]}
                    title={ICON_LABELS[d.id]}
                    aria-pressed={current === d.id}
                    onClick={() => onChoose(d.id)}
                    className={`flex h-8 w-8 items-center justify-center rounded border ${current === d.id ? "border-brand bg-brand/10 text-brand" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`}
                  >
                    <IconGlyph id={d.id} size={16} />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div>
          <div className="grid grid-cols-8 gap-1">
            {EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                aria-label={`Emoji ${e}`}
                aria-pressed={current === `emoji:${e}`}
                onClick={() => onChoose(`emoji:${e}`)}
                className={`flex h-8 w-8 items-center justify-center rounded border text-base ${current === `emoji:${e}` ? "border-brand bg-brand/10" : "border-slate-200 hover:bg-slate-50"}`}
              >
                {e}
              </button>
            ))}
          </div>
          <form
            className="mt-3 flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (typedRef) onChoose(typedRef);
            }}
          >
            <input
              aria-label="Type or paste any emoji"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="Type or paste any emoji"
              className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
            <button
              type="submit"
              disabled={!typedRef}
              className="rounded-md bg-brand px-3 py-1 text-sm font-medium text-white disabled:opacity-40"
            >
              Use
            </button>
          </form>
          {typed.trim() !== "" && !typedRef && <p className="mt-1 text-xs text-red-700">That is not an emoji.</p>}
        </div>
      )}

      <div className="mt-3 flex gap-3 border-t border-slate-100 pt-2 text-xs">
        <button type="button" className="text-slate-700 underline" onClick={() => onChoose("none")}>
          No icon
        </button>
        {defaultId && (
          <button type="button" className="text-slate-700 underline" onClick={() => onChoose(null)}>
            Use the usual one ({ICON_LABELS[defaultId]})
          </button>
        )}
      </div>
    </div>
  );
}
