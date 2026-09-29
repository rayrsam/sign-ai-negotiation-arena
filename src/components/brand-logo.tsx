interface BrandLogoProps {
  className?: string;
}

export function BrandLogo({ className }: BrandLogoProps) {
  return <img className={className} src="/logo.svg" alt="" draggable="false" />;
}
