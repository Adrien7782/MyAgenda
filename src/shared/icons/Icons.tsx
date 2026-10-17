export interface IconProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
}

const defaults: Required<IconProps> = { size: 18, color: 'currentColor', strokeWidth: 1.8 };

function Icon({ size, color, strokeWidth, children }: IconProps & { children: React.ReactNode }) {
  const s = size ?? defaults.size;
  return (
    <svg
      width={s} height={s} viewBox="0 0 24 24"
      fill="none" stroke={color ?? defaults.color}
      strokeWidth={strokeWidth ?? defaults.strokeWidth}
      strokeLinecap="round" strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

export function CheckSquareIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="9 11 12 14 22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </Icon>
  );
}

export function CalendarIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </Icon>
  );
}

export function TrashIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </Icon>
  );
}

export function SettingsIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </Icon>
  );
}

export function ListIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="8" y1="6" x2="21" y2="6" />
      <line x1="8" y1="12" x2="21" y2="12" />
      <line x1="8" y1="18" x2="21" y2="18" />
      <line x1="3" y1="6" x2="3.01" y2="6" />
      <line x1="3" y1="12" x2="3.01" y2="12" />
      <line x1="3" y1="18" x2="3.01" y2="18" />
    </Icon>
  );
}

export function KanbanIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="5" height="14" rx="1" />
      <rect x="10" y="3" width="5" height="9" rx="1" />
      <rect x="17" y="3" width="5" height="11" rx="1" />
    </Icon>
  );
}

export function PlusIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}

export function XIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </Icon>
  );
}

export function EditIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </Icon>
  );
}

export function AlertTriangleIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </Icon>
  );
}

export function ClockIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </Icon>
  );
}

export function CheckCircleIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </Icon>
  );
}

export function CircleIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="10" />
    </Icon>
  );
}

export function MinusIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="5" y1="12" x2="19" y2="12" />
    </Icon>
  );
}

export function MaximizeIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
    </Icon>
  );
}

export function ChevronLeftIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="15 18 9 12 15 6" />
    </Icon>
  );
}

export function ChevronRightIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="9 18 15 12 9 6" />
    </Icon>
  );
}

export function SearchIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </Icon>
  );
}

export function FlagIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <line x1="4" y1="22" x2="4" y2="15" />
    </Icon>
  );
}

export function TagIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
      <line x1="7" y1="7" x2="7.01" y2="7" />
    </Icon>
  );
}

export function RepeatIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="17 1 21 5 17 9" />
      <path d="M3 11V9a4 4 0 0 1 4-4h14" />
      <polyline points="7 23 3 19 7 15" />
      <path d="M21 13v2a4 4 0 0 1-4 4H3" />
    </Icon>
  );
}

export function BellIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </Icon>
  );
}

export function DownloadIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </Icon>
  );
}

export function GripIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="9" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="6" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="9" cy="18" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="18" r="1" fill="currentColor" stroke="none" />
    </Icon>
  );
}

export function RestoreIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-4.5" />
    </Icon>
  );
}

export function WidgetIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="2" y="3" width="8" height="8" rx="2" />
      <rect x="14" y="3" width="8" height="8" rx="2" />
      <rect x="2" y="13" width="8" height="8" rx="2" />
      <rect x="14" y="13" width="8" height="8" rx="2" />
    </Icon>
  );
}

export function ChevronDownIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="6 9 12 15 18 9" />
    </Icon>
  );
}

export function LinkIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </Icon>
  );
}

export function RefreshIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </Icon>
  );
}

export function UploadIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </Icon>
  );
}

export function MapPinIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </Icon>
  );
}

export function PaperclipIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48" />
    </Icon>
  );
}

export function PanelRightIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <line x1="15" y1="3" x2="15" y2="21" />
    </Icon>
  );
}

export function UsersIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </Icon>
  );
}

export function CheckIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polyline points="20 6 9 17 4 12" />
    </Icon>
  );
}

export function TimerIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l2.5 2.5" />
      <path d="M9 2h6" />
      <path d="M12 2v3" />
    </Icon>
  );
}

export function PlayIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <polygon points="7 4 20 12 7 20 7 4" fill="currentColor" />
    </Icon>
  );
}

export function PauseIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="6" y="4" width="4" height="16" rx="1" fill="currentColor" />
      <rect x="14" y="4" width="4" height="16" rx="1" fill="currentColor" />
    </Icon>
  );
}

export function StopIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="5" y="5" width="14" height="14" rx="2" fill="currentColor" />
    </Icon>
  );
}

export function PieChartIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </Icon>
  );
}

// ── Notes ────────────────────────────────────────────────────────────────────

export function NoteIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
      <polyline points="14 3 14 9 20 9" />
      <line x1="8" y1="13" x2="16" y2="13" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </Icon>
  );
}

export function PinIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M12 17v5" />
      <path d="M9 4h6l-1 6 3 3v2H7v-2l3-3z" />
    </Icon>
  );
}

export function CopyIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </Icon>
  );
}

export function ShareIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
      <polyline points="16 6 12 2 8 6" />
      <line x1="12" y1="2" x2="12" y2="15" />
    </Icon>
  );
}

export function ListBulletIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="9" y1="6" x2="20" y2="6" /><line x1="9" y1="12" x2="20" y2="12" /><line x1="9" y1="18" x2="20" y2="18" />
      <circle cx="4.5" cy="6" r="1" fill="currentColor" /><circle cx="4.5" cy="12" r="1" fill="currentColor" /><circle cx="4.5" cy="18" r="1" fill="currentColor" />
    </Icon>
  );
}

export function ListNumberIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <line x1="10" y1="6" x2="20" y2="6" /><line x1="10" y1="12" x2="20" y2="12" /><line x1="10" y1="18" x2="20" y2="18" />
      <path d="M4 5l1.5-1v5" /><path d="M3.5 13.5c0-1 .8-1.5 1.5-1.5s1.5.5 1.5 1.3c0 1.2-3 2-3 3.7h3" />
    </Icon>
  );
}

export function ListCheckIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <rect x="3" y="4" width="5" height="5" rx="1" /><polyline points="4 13.5 5.5 15 8 12" />
      <line x1="11" y1="6.5" x2="21" y2="6.5" /><line x1="11" y1="13.5" x2="21" y2="13.5" /><line x1="11" y1="19" x2="21" y2="19" />
    </Icon>
  );
}

export function QuoteIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M7 7h4v4c0 3-2 5-4 6" /><path d="M14 7h4v4c0 3-2 5-4 6" />
    </Icon>
  );
}

export function UndoIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M9 14L4 9l5-5" /><path d="M4 9h11a5 5 0 0 1 0 10h-3" />
    </Icon>
  );
}

export function RedoIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M15 14l5-5-5-5" /><path d="M20 9H9a5 5 0 0 0 0 10h3" />
    </Icon>
  );
}

export function HighlightIcon(p: IconProps) {
  return (
    <Icon {...p}>
      <path d="M15 5l4 4-8 8H7v-4z" /><path d="M4 21h16" />
    </Icon>
  );
}
