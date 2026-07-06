/** Illustrative filled product icons (Bring!-style silhouettes on colored tiles). */
import type { ReactElement, ReactNode } from 'react'

interface ProductIconProps {
  iconKey: string
  size?: number
  className?: string
}

type SvgProps = { size: number; className?: string }

function SvgWrap({ size, className, children }: SvgProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

function Tomato({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <circle cx="12" cy="13.5" r="6.5" fill="currentColor" />
      <path d="M9.5 7.5c.8-1.2 1.6-1.8 2.5-1.8s1.7.6 2.5 1.8" fill="currentColor" opacity="0.75" />
      <path d="M12 5.5v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgWrap>
  )
}

function Cucumber({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path
        d="M15 5.5c2.8 1.8 4.5 4.8 4.5 8.5a6.5 6.5 0 1 1-13 0c0-3.7 1.7-6.7 4.5-8.5"
        fill="currentColor"
      />
      <ellipse cx="10" cy="11" rx="1" ry="1.6" fill="currentColor" opacity="0.35" />
      <ellipse cx="13" cy="13" rx="1" ry="1.6" fill="currentColor" opacity="0.35" />
    </SvgWrap>
  )
}

function Pepper({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M12 4c-3.8 0-7 2.8-7 6.8 0 4.2 2.8 8.2 7 10.2 4.2-2 7-6 7-10.2C19 6.8 15.8 4 12 4z" fill="currentColor" />
      <path d="M12 3.5V6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </SvgWrap>
  )
}

function Apple({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M12 20.5c-3.8-2-6-5.4-6-9.2a5.5 5.5 0 0 1 10.2-2.6c.8-1.6 1.8-2.4 2.8-2.4.3 0 .6 0 .9.1-1.2 1.4-1.9 3-1.9 4.9 0 3.8-2.2 7.2-6 9.2z" fill="currentColor" />
      <path d="M14.5 4.5c.5-.8 1.2-1.2 2-1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
    </SvgWrap>
  )
}

function Banana({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M5 16.5c2.5-5.5 6.5-9.5 12.5-11-.5 5.5-2 10-5.5 13.5-1.8 1.6-3.6 2.4-5.5 2.4-1 0-1.8-.3-2.5-.9z" fill="currentColor" />
    </SvgWrap>
  )
}

function Citrus({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <circle cx="12" cy="14" r="6.5" fill="currentColor" />
      <path d="M12 5v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="12" cy="14" r="2.2" fill="currentColor" opacity="0.3" />
    </SvgWrap>
  )
}

function Avocado({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <ellipse cx="12" cy="14" rx="7" ry="8" fill="currentColor" />
      <circle cx="12" cy="15.5" r="2.8" fill="currentColor" opacity="0.35" />
      <circle cx="12" cy="15.5" r="1.2" fill="currentColor" opacity="0.55" />
    </SvgWrap>
  )
}

function Leafy({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M6.5 14.5c0-4 2.8-7 5.5-7s5.5 3 5.5 7c0 2.2-1.2 4-2.8 5H9.3c-1.6-1-2.8-2.8-2.8-5z" fill="currentColor" />
      <path d="M12 7.5V18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" opacity="0.5" />
    </SvgWrap>
  )
}

function Broccoli({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <circle cx="9" cy="11" r="3" fill="currentColor" />
      <circle cx="15" cy="11" r="3" fill="currentColor" />
      <circle cx="12" cy="8.5" r="3" fill="currentColor" />
      <rect x="10.5" y="13" width="3" height="6" rx="1" fill="currentColor" opacity="0.85" />
    </SvgWrap>
  )
}

function Mushroom({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M6 12.5c0-3.5 2.7-6 6-6s6 2.5 6 6" fill="currentColor" />
      <rect x="9.5" y="12" width="5" height="6.5" rx="1.5" fill="currentColor" opacity="0.9" />
    </SvgWrap>
  )
}

function Berries({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <circle cx="8.5" cy="14" r="2.8" fill="currentColor" />
      <circle cx="13" cy="11.5" r="2.8" fill="currentColor" />
      <circle cx="15.5" cy="15.5" r="2.4" fill="currentColor" opacity="0.85" />
    </SvgWrap>
  )
}

function Carrot({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M12 19.5 10.5 9.5l8-4.5-6.5 14.5z" fill="currentColor" />
      <path d="M10 8.5 8 6M11.5 7.5 10 5M13 8 12.5 5.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </SvgWrap>
  )
}

function Onion({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <circle cx="12" cy="13.5" r="6" fill="currentColor" />
      <path d="M9 8.5c1-1.5 2-2.2 3-2.2s2 .7 3 2.2" fill="currentColor" opacity="0.45" />
    </SvgWrap>
  )
}

function Potato({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <ellipse cx="12" cy="13.5" rx="6.5" ry="7.5" fill="currentColor" />
      <circle cx="9.5" cy="11" r=".8" fill="currentColor" opacity="0.3" />
      <circle cx="14" cy="15" r=".8" fill="currentColor" opacity="0.3" />
    </SvgWrap>
  )
}

function Milk({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M9.5 4h5l1 3.5v11.5a2 2 0 0 1-2 2h-3a2 2 0 0 1-2-2V7.5L9.5 4z" fill="currentColor" />
      <rect x="9" y="7" width="6" height="2" rx=".5" fill="currentColor" opacity="0.35" />
    </SvgWrap>
  )
}

function Cheese({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M4.5 14.5 8.5 7h7l4 7.5H4.5z" fill="currentColor" />
      <circle cx="10" cy="12" r="1" fill="currentColor" opacity="0.35" />
      <circle cx="14.5" cy="13.5" r="1" fill="currentColor" opacity="0.35" />
    </SvgWrap>
  )
}

function Egg({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M12 20.5c-3-2.8-5-6.2-5-9.5a5 5 0 0 1 10 0c0 3.3-2 6.7-5 9.5z" fill="currentColor" />
    </SvgWrap>
  )
}

function Meat({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M7 12.5c0-3.5 2.8-6 6.5-6 2 0 3.7.8 4.8 2.2 2.2 2.8 1.5 7-1.5 9-2.2 1.5-4.8 1.8-7 .5-1.8-1-2.8-3.5-2.8-6.2z" fill="currentColor" />
    </SvgWrap>
  )
}

function Fish({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M4 12c3.2-4 7-6 12.5-6.2 1.8 3.8 1.8 8.6 0 12.4C11 18.2 7.2 16.2 4 12z" fill="currentColor" />
      <circle cx="14.5" cy="11.5" r="1.2" fill="currentColor" opacity="0.35" />
      <path d="M17.5 9.5 20 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </SvgWrap>
  )
}

function Shrimp({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M5 14.5c2-4.5 5.5-7 10-6.5 3.5.4 6 2.5 6 5.2 0 2-1.6 3.6-3.5 3.8-1.8.2-3.5-.8-5.2-2.5-1-1-2-2.5-3.5-3.5-1-.7-2.2-1-3.8-.5z" fill="currentColor" />
      <path d="M17 9.5 19.5 8M18 11.5h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </SvgWrap>
  )
}

function Sausage({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <rect x="4" y="10.5" width="16" height="5.5" rx="2.75" fill="currentColor" />
      <path d="M7 10.5V8.5h10v2" fill="currentColor" opacity="0.75" />
    </SvgWrap>
  )
}

function Rice({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <ellipse cx="12" cy="12.5" rx="7.5" ry="3.5" fill="currentColor" />
      <ellipse cx="12" cy="11" rx="7.5" ry="3.5" fill="currentColor" opacity="0.55" />
      <ellipse cx="12" cy="9.5" rx="7.5" ry="3.5" fill="currentColor" opacity="0.35" />
    </SvgWrap>
  )
}

function Pasta({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M5 9.5c2.5-1.5 4.5-1.5 7 0M6 13c2.5-1.5 4.5-1.5 7 0M7 16.5c2.5-1.5 4.5-1.5 7 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
    </SvgWrap>
  )
}

function Bread({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M5.5 14.5c0-4 2.5-7 6.5-7.8 3.5-.7 6.5.5 8.5 3.2 1.8 2.3 2.2 5.5.5 8.1-1.5 2.2-4 3.5-6.8 3.5-3.5 0-6.2-2.5-8.7-7z" fill="currentColor" />
    </SvgWrap>
  )
}

function Frozen({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M12 4v16M4 12h16M6.5 6.5l11 11M17.5 6.5l-11 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </SvgWrap>
  )
}

function Bottle({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <rect x="8.5" y="5" width="7" height="15" rx="2" fill="currentColor" />
      <rect x="10" y="3" width="4" height="2.5" rx="1" fill="currentColor" opacity="0.8" />
    </SvgWrap>
  )
}

function Drop({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M12 4.5c-2.8 4-5.5 7.5-5.5 10.8a5.5 5.5 0 0 0 11 0C17.5 12 14.8 8.5 12 4.5z" fill="currentColor" />
    </SvgWrap>
  )
}

function Can({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <rect x="7.5" y="5.5" width="9" height="13.5" rx="1.5" fill="currentColor" />
      <rect x="7.5" y="9" width="9" height="1.5" fill="currentColor" opacity="0.35" />
    </SvgWrap>
  )
}

function Jar({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <rect x="8.5" y="9" width="7" height="10" rx="1" fill="currentColor" />
      <rect x="9.5" y="5.5" width="5" height="3.5" rx=".8" fill="currentColor" opacity="0.85" />
    </SvgWrap>
  )
}

function Spice({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M12 5c-2 2.5-3 5-3 7.8a3 3 0 0 0 6 0c0-2.8-1-5.3-3-7.8z" fill="currentColor" />
    </SvgWrap>
  )
}

function Box({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <rect x="6.5" y="7" width="11" height="11" rx="2" fill="currentColor" />
    </SvgWrap>
  )
}

function GenericProduce({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <path d="M7 14.5c0-3.8 2.5-6.8 5-6.8s5 3 5 6.8" fill="currentColor" />
      <path d="M12 7.5V16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" opacity="0.45" />
    </SvgWrap>
  )
}

function Corn({ size, className }: SvgProps) {
  return (
    <SvgWrap size={size} className={className}>
      <rect x="9" y="5" width="2.2" height="14" rx="1" fill="currentColor" />
      <rect x="12.4" y="5" width="2.2" height="14" rx="1" fill="currentColor" />
      <rect x="15.8" y="5" width="2.2" height="14" rx="1" fill="currentColor" />
    </SvgWrap>
  )
}

const ICON_MAP: Record<string, (props: SvgProps) => ReactElement> = {
  tomate: Tomato,
  gurke: Cucumber,
  zucchini: Cucumber,
  paprika: Pepper,
  chili: Pepper,
  zwiebel: Onion,
  knoblauch: Onion,
  kartoffel: Potato,
  karotte: Carrot,
  apfel: Apple,
  birne: Apple,
  banane: Banana,
  orange: Citrus,
  zitrone: Citrus,
  kiwi: Citrus,
  avocado: Avocado,
  salat: Leafy,
  spinat: Leafy,
  brokkoli: Broccoli,
  pilz: Mushroom,
  beere: Berries,
  traube: Berries,
  aubergine: Pepper,
  lauch: Leafy,
  ingwer: Carrot,
  mais: Corn,
  gemuese: GenericProduce,
  milch: Milk,
  joghurt: Milk,
  butter: Cheese,
  kaese: Cheese,
  ei: Egg,
  huhn: Meat,
  fleisch: Meat,
  speck: Sausage,
  wurst: Sausage,
  fisch: Fish,
  garnelen: Shrimp,
  reis: Rice,
  nudeln: Pasta,
  linsen: Rice,
  bohne: Rice,
  getreide: Rice,
  hafer: Rice,
  mehl: Box,
  brot: Bread,
  broetchen: Bread,
  gebaeck: Bread,
  tiefkuehl: Frozen,
  wasser: Drop,
  saft: Bottle,
  getraenk: Bottle,
  bier: Bottle,
  wein: Bottle,
  kaffee: Bottle,
  tee: Bottle,
  ol: Drop,
  essig: Jar,
  gewuerz: Spice,
  zucker: Box,
  honig: Jar,
  nuss: Box,
  dose: Can,
  schokolade: Box,
  default: GenericProduce,
}

export function ProductIcon({ iconKey, size = 24, className }: ProductIconProps) {
  const Icon = ICON_MAP[iconKey] ?? ICON_MAP.default
  return <Icon size={size} className={className} />
}
