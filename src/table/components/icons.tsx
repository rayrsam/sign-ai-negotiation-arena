// Small icons redrawn 1:1 from the mockup geometry.
interface IconProps { className?: string; color?: string; size?: number }

export function ArrowIcon({ className, color = "#FF6547", width = 44 }: IconProps & { width?: number }) {
  return (
    <svg className={`arrow-icon ${className ?? ""}`} width={width} height="20" viewBox={`0 0 ${width} 20`} fill="none" aria-hidden="true">
      <path d={`M1 10H${width - 1}`} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d={`M${width - 11} 1L${width - 1.5} 10L${width - 11} 19`} stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CheckCircleIcon({ className, color = "#FF6547", size = 28 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12.75" stroke={color} strokeWidth="2.5" />
      <path d="M8.8 14.4L12.5 17.9L19.4 10.3" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function QuestionCircleIcon({ className, color = "#CDDFF8", size = 28 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12.75" stroke={color} strokeWidth="2" strokeDasharray="0.3 4.2" strokeLinecap="round" />
      <path d="M10.6 11C10.6 9.1 12.1 7.8 14 7.8C15.9 7.8 17.4 9.1 17.4 10.9C17.4 13.6 14 13.5 14 16.3" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <circle cx="14" cy="20.3" r="1.3" fill={color} />
    </svg>
  );
}

export function CrossCircleIcon({ className, color = "#CDDFF8", size = 28 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 28 28" fill="none" aria-hidden="true">
      <circle cx="14" cy="14" r="12.75" stroke={color} strokeWidth="2.5" />
      <path d="M9.5 9.5L18.5 18.5M18.5 9.5L9.5 18.5" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LockIcon({ className, color = "#FF6547" }: IconProps) {
  return (
    <svg className={className} width="13" height="16" viewBox="0 0 13 16" fill="none" aria-hidden="true">
      <path d="M2.9 6.4V4.4C2.9 2.4 4.5 0.9 6.5 0.9C8.5 0.9 10.1 2.4 10.1 4.4V6.4" stroke={color} strokeWidth="1.8" />
      <rect y="5.9" width="13" height="10.1" rx="2" fill={color} />
    </svg>
  );
}

export function TriangleIcon({ className, color = "#F2E5CD", size = 14 }: IconProps) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M7 0.5L13.8 13.5H0.2L7 0.5Z" fill={color} />
    </svg>
  );
}

export function ChevronDownIcon({ className, color = "#544C4C" }: IconProps) {
  return (
    <svg className={className} width="19" height="11" viewBox="-1.5 -1.5 19 11" fill="none" aria-hidden="true">
      <path d="M0 0L8 8L16 0" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowUpIcon({ className, color = "#FF6547" }: IconProps) {
  return (
    <svg className={className} width="21" height="31" viewBox="-1.5 -1.5 21 31" fill="none" aria-hidden="true">
      <path d="M9 28V0" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      <path d="M0 9L9 0L18 9" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/** Round concession token: full, pending (orange dotted ring) or spent (dotted outline). */
export function TokenIcon({ state, size = 55.6 }: { state: "full" | "pending" | "spent"; size?: number }) {
  const scale = size / 55.6;
  if (state === "spent") {
    return (
      <svg width={size} height={size} viewBox="0 0 55.6 55.6" fill="none" aria-hidden="true">
        <circle cx="27.8" cy="27.8" r="26" stroke="#8B8484" strokeWidth="2.5" strokeDasharray="0.1 6.2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width={size + (state === "pending" ? 20 * scale : 0)} height={size + (state === "pending" ? 20 * scale : 0)}
      viewBox={state === "pending" ? "-10 -10 75.6 75.6" : "0 0 55.6 55.6"} fill="none" aria-hidden="true">
      {state === "pending" && <circle cx="27.8" cy="27.8" r="35" stroke="#FF6547" strokeWidth="3" strokeDasharray="0.1 7" strokeLinecap="round" />}
      <circle cx="27.8" cy="27.8" r="27.8" fill="#F2E5CD" />
      <circle cx="27.8" cy="27.8" r="18.9" stroke="#8B8484" strokeWidth="1.5" />
    </svg>
  );
}
