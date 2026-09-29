import { LongArrow } from "@/components/long-arrow";

interface ReportActionProps {
  children: string;
  href?: string;
  primary?: boolean;
  emphasis?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}

export function ReportAction({ children, href, primary = false, emphasis = false, disabled = false, onClick }: ReportActionProps) {
  const className = `report-action${primary ? " is-primary" : emphasis ? " is-emphasis" : ""}`;
  const content = <>{children}<LongArrow /></>;
  if (disabled) {
    return <button className={className} type="button" disabled>{content}</button>;
  }
  return href
    ? <a className={className} href={href}>{content}</a>
    : <button className={className} type="button" onClick={onClick} disabled={!onClick}>{content}</button>;
}
