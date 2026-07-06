interface IconProps {
  path: string
  size?: number
  className?: string
}

/** Rendert Feather-Stil-Stroke-Icons aus vertrauenswürdigen, intern erzeugten SVG-Pfaden. */
export function Icon({ path, size = 24, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      dangerouslySetInnerHTML={{ __html: path }}
    />
  )
}
