import type { ReactNode, SVGProps } from "react";

/* ------------------------------------------------------------------
   Hand-drawn icon set. Every glyph is a 24×24 stroke path on the same
   grid and weight so the interface reads as one system. No icon
   dependency, no version drift.
   ------------------------------------------------------------------ */

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function makeIcon(path: ReactNode, displayName: string) {
  const Icon = ({ size = 16, ...props }: IconProps) => (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {path}
    </svg>
  );
  Icon.displayName = displayName;
  return Icon;
}

export const IconDashboard = makeIcon(
  <>
    <rect x="3" y="3" width="7.5" height="8.5" rx="1.6" />
    <rect x="13.5" y="3" width="7.5" height="5.5" rx="1.6" />
    <rect x="3" y="14.5" width="7.5" height="6.5" rx="1.6" />
    <rect x="13.5" y="11.5" width="7.5" height="9.5" rx="1.6" />
  </>,
  "IconDashboard",
);

export const IconBook = makeIcon(
  <>
    <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H11a2 2 0 0 1 2 2v15a1.6 1.6 0 0 0-1.6-1.6H5.5A1.5 1.5 0 0 1 4 16.9Z" />
    <path d="M20 4.5A1.5 1.5 0 0 0 18.5 3H15a2 2 0 0 0-2 2v15a1.6 1.6 0 0 1 1.6-1.6h3.9A1.5 1.5 0 0 0 20 16.9Z" />
  </>,
  "IconBook",
);

export const IconPath = makeIcon(
  <>
    <circle cx="6" cy="5" r="2.4" />
    <circle cx="18" cy="19" r="2.4" />
    <path d="M6 7.4v4.2a3.4 3.4 0 0 0 3.4 3.4h5.2a3.4 3.4 0 0 1 3.4 3.4v.4" />
    <path d="M18 16.6V13" strokeDasharray="2 2.4" />
  </>,
  "IconPath",
);

export const IconBraces = makeIcon(
  <>
    <path d="M9 3.5H8A2.5 2.5 0 0 0 5.5 6v3.2A2.3 2.3 0 0 1 3.2 11.5v1A2.3 2.3 0 0 1 5.5 14.8V18A2.5 2.5 0 0 0 8 20.5h1" />
    <path d="M15 3.5h1A2.5 2.5 0 0 1 18.5 6v3.2a2.3 2.3 0 0 0 2.3 2.3v1a2.3 2.3 0 0 0-2.3 2.3V18a2.5 2.5 0 0 1-2.5 2.5h-1" />
  </>,
  "IconBraces",
);

export const IconAndroid = makeIcon(
  <>
    <path d="M4.5 11.5a7.5 7.5 0 0 1 15 0" />
    <path d="M4.5 11.5h15v5.2a2.3 2.3 0 0 1-2.3 2.3H6.8a2.3 2.3 0 0 1-2.3-2.3Z" />
    <path d="M7.6 8.3 6.2 6.1M16.4 8.3l1.4-2.2" />
    <path d="M9.5 8.6h.01M14.5 8.6h.01" strokeWidth={2.2} />
  </>,
  "IconAndroid",
);

export const IconLayers = makeIcon(
  <>
    <path d="m12 3 8.5 4.4L12 11.8 3.5 7.4Z" />
    <path d="m3.5 12.2 8.5 4.4 8.5-4.4" />
    <path d="m3.5 16.8 8.5 4.4 8.5-4.4" />
  </>,
  "IconLayers",
);

export const IconBlueprint = makeIcon(
  <>
    <rect x="3" y="4" width="18" height="16" rx="2" />
    <path d="M3 9h18M9 9v11M15 9v5M15 14h6" />
  </>,
  "IconBlueprint",
);

export const IconFlow = makeIcon(
  <>
    <path d="M3 8.5c2.2-2.6 4.4-2.6 6.6 0s4.4 2.6 6.6 0 4.4-2.6 6.6 0" />
    <path d="M3 15.5c2.2-2.6 4.4-2.6 6.6 0s4.4 2.6 6.6 0 4.4-2.6 6.6 0" />
  </>,
  "IconFlow",
);

export const IconTarget = makeIcon(
  <>
    <circle cx="12" cy="12" r="8.5" />
    <circle cx="12" cy="12" r="4.6" />
    <circle cx="12" cy="12" r="1" strokeWidth={2.2} />
  </>,
  "IconTarget",
);

export const IconList = makeIcon(
  <>
    <path d="M9 6h11M9 12h11M9 18h11" />
    <path d="m3.5 5.6 1.2 1.3L7 4.6M3.5 11.6l1.2 1.3L7 10.6M3.5 17.6l1.2 1.3L7 16.6" />
  </>,
  "IconList",
);

export const IconBug = makeIcon(
  <>
    <rect x="7.5" y="7" width="9" height="13" rx="4.5" />
    <path d="M9.5 7V5.8a2.5 2.5 0 0 1 5 0V7" />
    <path d="M7.5 12H4M20 12h-3.5M7.8 16.6 5 18.4M16.2 16.6 19 18.4M7.8 8.4 5 6.6M16.2 8.4 19 6.6" />
  </>,
  "IconBug",
);

export const IconQuiz = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.6c0 1.7-2.5 2-2.5 3.6" />
    <path d="M12 17.2h.01" strokeWidth={2.2} />
  </>,
  "IconQuiz",
);

export const IconTerminal = makeIcon(
  <>
    <rect x="2.8" y="4" width="18.4" height="16" rx="2" />
    <path d="m7 10 2.6 2.4L7 14.8M12.8 15.2h4" />
  </>,
  "IconTerminal",
);

export const IconSitemap = makeIcon(
  <>
    <rect x="9" y="2.8" width="6" height="5" rx="1.4" />
    <rect x="2.6" y="16.2" width="6" height="5" rx="1.4" />
    <rect x="15.4" y="16.2" width="6" height="5" rx="1.4" />
    <path d="M12 7.8v4.4M5.6 16.2v-2.2a1.8 1.8 0 0 1 1.8-1.8h9.2a1.8 1.8 0 0 1 1.8 1.8v2.2" />
  </>,
  "IconSitemap",
);

export const IconCalendar = makeIcon(
  <>
    <rect x="3.2" y="4.8" width="17.6" height="16" rx="2" />
    <path d="M3.2 9.6h17.6M8 3v3.6M16 3v3.6" />
    <path d="M7.6 13.4h2M11 13.4h2M14.4 13.4h2M7.6 16.8h2M11 16.8h2" />
  </>,
  "IconSitemapAlt",
);

export const IconBookmark = makeIcon(
  <path d="M6 4.6A1.6 1.6 0 0 1 7.6 3h8.8A1.6 1.6 0 0 1 18 4.6v16.2L12 17l-6 3.8Z" />,
  "IconBookmark",
);

export const IconChart = makeIcon(
  <>
    <path d="M3.6 20.4h16.8" />
    <rect x="5" y="12" width="3.6" height="6.4" rx="1" />
    <rect x="10.2" y="7.4" width="3.6" height="11" rx="1" />
    <rect x="15.4" y="9.8" width="3.6" height="8.6" rx="1" />
  </>,
  "IconChart",
);

export const IconSettings = makeIcon(
  <>
    <circle cx="12" cy="12" r="3.1" />
    <path d="M19.2 14.4a1.5 1.5 0 0 0 .3 1.7l.1.1a1.8 1.8 0 1 1-2.6 2.6l-.1-.1a1.5 1.5 0 0 0-2.6 1.1v.3a1.8 1.8 0 1 1-3.6 0v-.2a1.5 1.5 0 0 0-2.7-1 1.8 1.8 0 1 1-2.6-2.6l.1-.1a1.5 1.5 0 0 0-1.1-2.6h-.3a1.8 1.8 0 1 1 0-3.6h.2a1.5 1.5 0 0 0 1-2.7 1.8 1.8 0 1 1 2.6-2.6l.1.1a1.5 1.5 0 0 0 2.6-1.1v-.3a1.8 1.8 0 1 1 3.6 0v.2a1.5 1.5 0 0 0 2.7 1 1.8 1.8 0 1 1 2.6 2.6l-.1.1a1.5 1.5 0 0 0 1.1 2.6h.3a1.8 1.8 0 1 1 0 3.6h-.2a1.5 1.5 0 0 0-1.4.9Z" />
  </>,
  "IconSettings",
);

export const IconChevronRight = makeIcon(<path d="m9.5 5.5 6.5 6.5-6.5 6.5" />, "IconChevronRight");
export const IconChevronDown = makeIcon(<path d="m5.5 9.5 6.5 6.5 6.5-6.5" />, "IconChevronDown");
export const IconChevronLeft = makeIcon(<path d="M14.5 5.5 8 12l6.5 6.5" />, "IconChevronLeft");
export const IconArrowRight = makeIcon(
  <>
    <path d="M4 12h15" />
    <path d="m13.4 6.4 5.6 5.6-5.6 5.6" />
  </>,
  "IconArrowRight",
);
export const IconArrowDown = makeIcon(
  <>
    <path d="M12 4v15" />
    <path d="m6.4 13.4 5.6 5.6 5.6-5.6" />
  </>,
  "IconArrowDown",
);

export const IconCheck = makeIcon(<path d="m4.8 12.6 4.8 4.8L19.4 7.6" />, "IconCheck");
export const IconX = makeIcon(<path d="M6 6l12 12M18 6 6 18" />, "IconX");
export const IconPlus = makeIcon(<path d="M12 5v14M5 12h14" />, "IconPlus");

export const IconPlay = makeIcon(
  <path d="M7.4 4.9a.9.9 0 0 1 1.36-.78l10.1 6.3a.9.9 0 0 1 0 1.54l-10.1 6.3a.9.9 0 0 1-1.36-.77Z" />,
  "IconPlay",
);

export const IconSubmit = makeIcon(
  <>
    <path d="M12 19V5" />
    <path d="m6.4 10.6 5.6-5.6 5.6 5.6" />
    <path d="M4 20.6h16" />
  </>,
  "IconSubmit",
);

export const IconLock = makeIcon(
  <>
    <rect x="4.6" y="10.4" width="14.8" height="10.2" rx="2.2" />
    <path d="M8.2 10.4V7.6a3.8 3.8 0 0 1 7.6 0v2.8" />
  </>,
  "IconLock",
);

export const IconFlame = makeIcon(
  <>
    <path d="M12 2.8c.7 3.2 3 4.2 4.6 6.4a7.6 7.6 0 0 1 1.6 4.7A6.2 6.2 0 0 1 12 20.9a6.2 6.2 0 0 1-6.2-7A9.2 9.2 0 0 1 8 8.2c.5 1.3 1.3 2 2.1 2.4C9.7 8 10.3 5 12 2.8Z" />
  </>,
  "IconFlame",
);

export const IconClock = makeIcon(
  <>
    <circle cx="12" cy="12" r="8.8" />
    <path d="M12 7.2V12l3.2 2" />
  </>,
  "IconClock",
);

export const IconLightbulb = makeIcon(
  <>
    <path d="M9.2 17.4a6 6 0 1 1 5.6 0v1.4a1.6 1.6 0 0 1-1.6 1.6h-2.4a1.6 1.6 0 0 1-1.6-1.6Z" />
    <path d="M9.4 17.4h5.2" />
  </>,
  "IconLightbulb",
);

export const IconSearch = makeIcon(
  <>
    <circle cx="10.8" cy="10.8" r="6.8" />
    <path d="m15.8 15.8 4.4 4.4" />
  </>,
  "IconSearch",
);

export const IconFilter = makeIcon(
  <path d="M3.6 5.4h16.8l-6.4 7.6v5.8l-4 2.2V13Z" />,
  "IconFilter",
);

export const IconMenu = makeIcon(<path d="M4 7h16M4 12h16M4 17h16" />, "IconMenu");

export const IconEye = makeIcon(
  <>
    <path d="M2.4 12S5.8 5.6 12 5.6 21.6 12 21.6 12 18.2 18.4 12 18.4 2.4 12 2.4 12Z" />
    <circle cx="12" cy="12" r="3.2" />
  </>,
  "IconEye",
);

export const IconRefresh = makeIcon(
  <>
    <path d="M20 11.2A8.2 8.2 0 0 0 6.1 6.4L3.6 8.8" />
    <path d="M3.6 4.4v4.4H8" />
    <path d="M4 12.8a8.2 8.2 0 0 0 13.9 4.8l2.5-2.4" />
    <path d="M20.4 19.6v-4.4H16" />
  </>,
  "IconRefresh",
);

export const IconCopy = makeIcon(
  <>
    <rect x="8.6" y="8.6" width="11.8" height="11.8" rx="2" />
    <path d="M15.4 5.6a2 2 0 0 0-2-2H5.6a2 2 0 0 0-2 2v7.8a2 2 0 0 0 2 2" />
  </>,
  "IconCopy",
);

export const IconTrash = makeIcon(
  <>
    <path d="M4.4 6.6h15.2M9.4 6.6V4.8a1.4 1.4 0 0 1 1.4-1.4h2.4a1.4 1.4 0 0 1 1.4 1.4v1.8" />
    <path d="M6.6 6.6 7.4 19a1.8 1.8 0 0 0 1.8 1.6h5.6a1.8 1.8 0 0 0 1.8-1.6l.8-12.4" />
  </>,
  "IconTrash",
);

export const IconAlert = makeIcon(
  <>
    <path d="M10.4 3.8 2.6 17.4a1.8 1.8 0 0 0 1.6 2.8h15.6a1.8 1.8 0 0 0 1.6-2.8L13.6 3.8a1.8 1.8 0 0 0-3.2 0Z" />
    <path d="M12 9.4v4M12 16.8h.01" strokeWidth={2.2} />
  </>,
  "IconAlert",
);

export const IconInfo = makeIcon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11.2v5M12 7.8h.01" strokeWidth={2.2} />
  </>,
  "IconInfo",
);

export const IconTrophy = makeIcon(
  <>
    <path d="M7.6 4h8.8v4.6a4.4 4.4 0 0 1-8.8 0Z" />
    <path d="M7.6 5.6H5a2 2 0 0 0 2 4M16.4 5.6H19a2 2 0 0 1-2 4" />
    <path d="M12 13v3.6M8.6 20.4h6.8M9.8 20.4l.6-3.8h3.2l.6 3.8" />
  </>,
  "IconTrophy",
);

export const IconSpark = makeIcon(
  <>
    <path d="M12 3.2 13.7 9l5.8 1.7-5.8 1.7L12 18.2l-1.7-5.8-5.8-1.7L10.3 9Z" />
    <path d="M18.6 3.4 19.3 5.6 21.5 6.3 19.3 7 18.6 9.2 17.9 7 15.7 6.3 17.9 5.6Z" />
  </>,
  "IconSpark",
);

export const IconNote = makeIcon(
  <>
    <path d="M5 4.6A1.6 1.6 0 0 1 6.6 3h7.2L19.4 8.6v10.8A1.6 1.6 0 0 1 17.8 21H6.6A1.6 1.6 0 0 1 5 19.4Z" />
    <path d="M13.6 3.2v5.6h5.6M8.4 13h7M8.4 16.6h4.6" />
  </>,
  "IconNote",
);

export const IconTimer = makeIcon(
  <>
    <circle cx="12" cy="13.6" r="7.4" />
    <path d="M12 10v3.6l2.4 1.6M9.6 2.8h4.8M18.6 7.2l1.6-1.6" />
  </>,
  "IconTimer",
);

export const IconGrid = makeIcon(
  <>
    <rect x="3.4" y="3.4" width="7" height="7" rx="1.5" />
    <rect x="13.6" y="3.4" width="7" height="7" rx="1.5" />
    <rect x="3.4" y="13.6" width="7" height="7" rx="1.5" />
    <rect x="13.6" y="13.6" width="7" height="7" rx="1.5" />
  </>,
  "IconGrid",
);

export const IconCircle = makeIcon(<circle cx="12" cy="12" r="8.4" />, "IconCircle");

export const IconHalfCircle = makeIcon(
  <>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 3.6a8.4 8.4 0 0 1 0 16.8Z" fill="currentColor" stroke="none" />
  </>,
  "IconHalfCircle",
);
