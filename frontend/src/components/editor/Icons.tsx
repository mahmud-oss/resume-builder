import type { ReactNode } from "react";

function Svg({ children, size = 18 }: { children: ReactNode; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {children}
    </svg>
  );
}

export const EyeIcon = () => (
  <Svg>
    <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const EyeOffIcon = () => (
  <Svg>
    <path d="M17.9 17.9A10.4 10.4 0 0 1 12 19c-6.4 0-10-7-10-7a18 18 0 0 1 4.1-4.9M9.9 5.2A9.6 9.6 0 0 1 12 5c6.4 0 10 7 10 7a18 18 0 0 1-2.2 3.2M1 1l22 22" />
  </Svg>
);
export const TrashIcon = () => (
  <Svg>
    <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
  </Svg>
);
export const GripIcon = () => (
  <Svg>
    <circle cx="9" cy="6" r="1" />
    <circle cx="15" cy="6" r="1" />
    <circle cx="9" cy="12" r="1" />
    <circle cx="15" cy="12" r="1" />
    <circle cx="9" cy="18" r="1" />
    <circle cx="15" cy="18" r="1" />
  </Svg>
);
export const UndoIcon = () => (
  <Svg>
    <path d="M3 7v6h6M3 13a9 9 0 1 1 3 6.7" />
  </Svg>
);
export const RedoIcon = () => (
  <Svg>
    <path d="M21 7v6h-6M21 13a9 9 0 1 0-3 6.7" />
  </Svg>
);
export const ChevronIcon = ({ open }: { open: boolean }) => (
  <span style={{ display: "inline-flex", transform: open ? "rotate(90deg)" : undefined, transition: "transform .15s" }}>
    <Svg>
      <path d="m9 6 6 6-6 6" />
    </Svg>
  </span>
);
export const PageBreakIcon = () => (
  <Svg>
    <path d="M4 12h3M10 12h4M17 12h3M7 3v6M17 21v-6" />
  </Svg>
);

export const PlusIcon = () => (
  <Svg size={16}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const ArrowUpIcon = () => (
  <Svg size={16}>
    <path d="M12 19V5M5 12l7-7 7 7" />
  </Svg>
);
export const ArrowDownIcon = () => (
  <Svg size={16}>
    <path d="M12 5v14M19 12l-7 7-7-7" />
  </Svg>
);
export const MoreIcon = () => (
  <Svg size={16}>
    <circle cx="5" cy="12" r="1.2" />
    <circle cx="12" cy="12" r="1.2" />
    <circle cx="19" cy="12" r="1.2" />
  </Svg>
);
