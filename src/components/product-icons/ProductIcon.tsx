/** Illustrative product icons on colored tiles: filled silhouettes for products without a
 *  good match in lucide.dev, real lucide.dev stroke icons (ISC license) for products where
 *  one clearly fits (see LucideWrap-based components + ICON_MAP below). */
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

/** Stroke-style Icons aus lucide.dev (ISC-Lizenz), 1:1 übernommen - für Produkte,
 *  für die es dort ein passendes, eindeutiges Icon gibt (siehe ICON_MAP unten). */
function LucideWrap({ size, className, children }: SvgProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {children}
    </svg>
  )
}

function LucideCarrot({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M15 16a1 1 0 0 0-7-7q-4 4-5.987 12.385a.5.5 0 0 0 .602.602Q11 20 15 16l-3-3" />
      <path d="M15 9q4 4 7 0-3-4-7 0 4-4 0-7-4 3 0 7" />
      <path d="m8 15-2.58-2.58" />
    </LucideWrap>
  )
}

function LucideApple({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M12 6.528V3a1 1 0 0 1 1-1h0" />
      <path d="M18.237 21A15 15 0 0 0 22 11a6 6 0 0 0-10-4.472A6 6 0 0 0 2 11a15.1 15.1 0 0 0 3.763 10 3 3 0 0 0 3.648.648 5.5 5.5 0 0 1 5.178 0A3 3 0 0 0 18.237 21" />
    </LucideWrap>
  )
}

function LucideBanana({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M4 13c3.5-2 8-2 10 2a5.5 5.5 0 0 1 8 5" />
      <path d="M5.15 17.89c5.52-1.52 8.65-6.89 7-12C11.55 4 11.5 2 13 2c3.22 0 5 5.5 5 8 0 6.5-4.2 12-10.49 12C5.11 22 2 22 2 20c0-1.5 1.14-1.55 3.15-2.11Z" />
    </LucideWrap>
  )
}

function LucideCitrus({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M21.66 17.67a1.08 1.08 0 0 1-.04 1.6A12 12 0 0 1 4.73 2.38a1.1 1.1 0 0 1 1.61-.04z" />
      <path d="M19.65 15.66A8 8 0 0 1 8.35 4.34" />
      <path d="m14 10-5.5 5.5" />
      <path d="M14 17.85V10H6.15" />
    </LucideWrap>
  )
}

function LucideLeafyGreen({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M2 22c1.25-.987 2.27-1.975 3.9-2.2a5.56 5.56 0 0 1 3.8 1.5 4 4 0 0 0 6.187-2.353 3.5 3.5 0 0 0 3.69-5.116A3.5 3.5 0 0 0 20.95 8 3.5 3.5 0 1 0 16 3.05a3.5 3.5 0 0 0-5.831 1.373 3.5 3.5 0 0 0-5.116 3.69 4 4 0 0 0-2.348 6.155C3.499 15.42 4.409 16.712 4.2 18.1 3.926 19.743 3.014 20.732 2 22" />
      <path d="M2 22 17 7" />
    </LucideWrap>
  )
}

function LucideBroccoli({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M10 13a3 3 0 0 1-2.121-5.121" />
      <path d="M15.606 14.204c-3.5 1.5-5.899 4.503-8.899 7.503A1 1 0 0 1 6 22c-2 0-4-2-4-4a1 1 0 0 1 .293-.707c1.911-1.911 3.823-3.578 5.347-5.441" />
      <path d="M16.573 14.737A4 4 0 0 1 14 11" />
      <path d="M7.14 10.907a4 4 0 1 1 2.756-7.43A4 4 0 0 1 16.7 4.48a2 2 0 0 1 2.82 2.82 4 4 0 0 1 1.002 6.805A4 4 0 1 1 13 16" />
    </LucideWrap>
  )
}

function LucideGrape({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M22 5V2l-5.89 5.89" />
      <circle cx="16.6" cy="15.89" r="3" />
      <circle cx="8.11" cy="7.4" r="3" />
      <circle cx="12.35" cy="11.65" r="3" />
      <circle cx="13.91" cy="5.85" r="3" />
      <circle cx="18.15" cy="10.09" r="3" />
      <circle cx="6.56" cy="13.2" r="3" />
      <circle cx="10.8" cy="17.44" r="3" />
      <circle cx="5" cy="19" r="3" />
    </LucideWrap>
  )
}

function LucideMilk({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M8 2h8" />
      <path d="M9 2v2.789a4 4 0 0 1-.672 2.219l-.656.984A4 4 0 0 0 7 10.212V20a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-9.789a4 4 0 0 0-.672-2.219l-.656-.984A4 4 0 0 1 15 4.788V2" />
      <path d="M7 15a6.472 6.472 0 0 1 5 0 6.47 6.47 0 0 0 5 0" />
    </LucideWrap>
  )
}

function LucideEgg({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M12 2C8 2 4 8 4 14a8 8 0 0 0 16 0c0-6-4-12-8-12" />
    </LucideWrap>
  )
}

function LucideDrumstick({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M15.4 15.63a7.875 6 135 1 1 6.23-6.23 4.5 3.43 135 0 0-6.23 6.23" />
      <path d="m8.29 12.71-2.6 2.6a2.5 2.5 0 1 0-1.65 4.65A2.5 2.5 0 1 0 8.7 18.3l2.59-2.59" />
    </LucideWrap>
  )
}

function LucideBeef({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M16.4 13.7A6.5 6.5 0 1 0 6.28 6.6c-1.1 3.13-.78 3.9-3.18 6.08A3 3 0 0 0 5 18c4 0 8.4-1.8 11.4-4.3" />
      <path d="m18.5 6 2.19 4.5a6.48 6.48 0 0 1-2.29 7.2C15.4 20.2 11 22 7 22a3 3 0 0 1-2.68-1.66L2.4 16.5" />
      <circle cx="12.5" cy="8.5" r="2.5" />
    </LucideWrap>
  )
}

function LucideHam({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M13.144 21.144A7.274 10.445 45 1 0 2.856 10.856" />
      <path d="M13.144 21.144A7.274 4.365 45 0 0 2.856 10.856a7.274 4.365 45 0 0 10.288 10.288" />
      <path d="M16.565 10.435 18.6 8.4a2.501 2.501 0 1 0 1.65-4.65 2.5 2.5 0 1 0-4.66 1.66l-2.024 2.025" />
      <path d="m8.5 16.5-1-1" />
    </LucideWrap>
  )
}

function LucideFish({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M6.5 12c.94-3.46 4.94-6 8.5-6 3.56 0 6.06 2.54 7 6-.94 3.47-3.44 6-7 6s-7.56-2.53-8.5-6Z" />
      <path d="M18 12v.5" />
      <path d="M16 17.93a9.77 9.77 0 0 1 0-11.86" />
      <path d="M7 10.67C7 8 5.58 5.97 2.73 5.5c-1 1.5-1 5 .23 6.5-1.24 1.5-1.24 5-.23 6.5C5.58 18.03 7 16 7 13.33" />
      <path d="M10.46 7.26C10.2 5.88 9.17 4.24 8 3h5.8a2 2 0 0 1 1.98 1.67l.23 1.4" />
      <path d="m16.01 17.93-.23 1.4A2 2 0 0 1 13.8 21H9.5a5.96 5.96 0 0 0 1.49-3.98" />
    </LucideWrap>
  )
}

function LucideShrimp({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M11 12h.01" />
      <path d="M13 22c.5-.5 1.12-1 2.5-1-1.38 0-2-.5-2.5-1" />
      <path d="M14 2a3.28 3.28 0 0 1-3.227 1.798l-6.17-.561A2.387 2.387 0 1 0 4.387 8H15.5a1 1 0 0 1 0 13 1 1 0 0 0 0-5H12a7 7 0 0 1-7-7V8" />
      <path d="M14 8a8.5 8.5 0 0 1 0 8" />
      <path d="M16 16c2 0 4.5-4 4-6" />
    </LucideWrap>
  )
}

function LucideWheat({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M2 22 16 8" />
      <path d="M3.47 12.53 5 11l1.53 1.53a3.5 3.5 0 0 1 0 4.94L5 19l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M7.47 8.53 9 7l1.53 1.53a3.5 3.5 0 0 1 0 4.94L9 15l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M11.47 4.53 13 3l1.53 1.53a3.5 3.5 0 0 1 0 4.94L13 11l-1.53-1.53a3.5 3.5 0 0 1 0-4.94Z" />
      <path d="M20 2h2v2a4 4 0 0 1-4 4h-2V6a4 4 0 0 1 4-4Z" />
      <path d="M11.47 17.47 13 19l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L5 19l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <path d="M15.47 13.47 17 15l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L9 15l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
      <path d="M19.47 9.47 21 11l-1.53 1.53a3.5 3.5 0 0 1-4.94 0L13 11l1.53-1.53a3.5 3.5 0 0 1 4.94 0Z" />
    </LucideWrap>
  )
}

function LucideCroissant({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M10.2 18H4.774a1.5 1.5 0 0 1-1.352-.97 11 11 0 0 1 .132-6.487" />
      <path d="M18 10.2V4.774a1.5 1.5 0 0 0-.97-1.352 11 11 0 0 0-6.486.132" />
      <path d="M18 5a4 3 0 0 1 4 3 2 2 0 0 1-2 2 10 10 0 0 0-5.139 1.42" />
      <path d="M5 18a3 4 0 0 0 3 4 2 2 0 0 0 2-2 10 10 0 0 1 1.42-5.14" />
      <path d="M8.709 2.554a10 10 0 0 0-6.155 6.155 1.5 1.5 0 0 0 .676 1.626l9.807 5.42a2 2 0 0 0 2.718-2.718l-5.42-9.807a1.5 1.5 0 0 0-1.626-.676" />
    </LucideWrap>
  )
}

function LucideSnowflake({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="m10 20-1.25-2.5L6 18" />
      <path d="M10 4 8.75 6.5 6 6" />
      <path d="m14 20 1.25-2.5L18 18" />
      <path d="m14 4 1.25 2.5L18 6" />
      <path d="m17 21-3-6h-4" />
      <path d="m17 3-3 6 1.5 3" />
      <path d="M2 12h6.5L10 9" />
      <path d="m20 10-1.5 2 1.5 2" />
      <path d="M22 12h-6.5L14 15" />
      <path d="m4 10 1.5 2L4 14" />
      <path d="m7 21 3-6-1.5-3" />
      <path d="m7 3 3 6h4" />
    </LucideWrap>
  )
}

function LucideGlassWater({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M5.116 4.104A1 1 0 0 1 6.11 3h11.78a1 1 0 0 1 .994 1.105L17.19 20.21A2 2 0 0 1 15.2 22H8.8a2 2 0 0 1-2-1.79z" />
      <path d="M6 12a5 5 0 0 1 6 0 5 5 0 0 0 6 0" />
    </LucideWrap>
  )
}

function LucideCoffee({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M10 2v2" />
      <path d="M14 2v2" />
      <path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1" />
      <path d="M6 2v2" />
    </LucideWrap>
  )
}

function LucideWine({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M8 22h8" />
      <path d="M7 10h10" />
      <path d="M12 15v7" />
      <path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z" />
    </LucideWrap>
  )
}

function LucideBeer({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M17 11h1a3 3 0 0 1 0 6h-1" />
      <path d="M9 12v6" />
      <path d="M13 12v6" />
      <path d="M14 7.5c-1 0-1.44.5-3 .5s-2-.5-3-.5-1.72.5-2.5.5a2.5 2.5 0 0 1 0-5c.78 0 1.57.5 2.5.5S9.44 2 11 2s2 1.5 3 1.5 1.72-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.78 0-1.5-.5-2.5-.5Z" />
      <path d="M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8" />
    </LucideWrap>
  )
}

function LucideCupSoda({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="m6 8 1.75 12.28a2 2 0 0 0 2 1.72h4.54a2 2 0 0 0 2-1.72L18 8" />
      <path d="M5 8h14" />
      <path d="M7 15a6.47 6.47 0 0 1 5 0 6.47 6.47 0 0 0 5 0" />
      <path d="m12 8 1-6h2" />
    </LucideWrap>
  )
}

function LucideNut({ size, className }: SvgProps) {
  return (
    <LucideWrap size={size} className={className}>
      <path d="M12 4V2" />
      <path d="M5 10v4a7.004 7.004 0 0 0 5.277 6.787c.412.104.802.292 1.102.592L12 22l.621-.621c.3-.3.69-.488 1.102-.592A7.003 7.003 0 0 0 19 14v-4" />
      <path d="M12 4C8 4 4.5 6 4 8c-.243.97-.919 1.952-2 3 1.31-.082 1.972-.29 3-1 .54.92.982 1.356 2 2 1.452-.647 1.954-1.098 2.5-2 .595.995 1.151 1.427 2.5 2 1.31-.621 1.862-1.058 2.5-2 .629.977 1.162 1.423 2.5 2 1.209-.548 1.68-.967 2-2 1.032.916 1.683 1.157 3 1-1.297-1.036-1.758-2.03-2-3-.5-2-4-4-8-4Z" />
    </LucideWrap>
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
  karotte: LucideCarrot,
  apfel: LucideApple,
  birne: Apple,
  banane: LucideBanana,
  orange: LucideCitrus,
  zitrone: LucideCitrus,
  kiwi: Citrus,
  avocado: Avocado,
  salat: LucideLeafyGreen,
  spinat: LucideLeafyGreen,
  brokkoli: LucideBroccoli,
  pilz: Mushroom,
  beere: Berries,
  traube: LucideGrape,
  aubergine: Pepper,
  lauch: LucideLeafyGreen,
  ingwer: Carrot,
  mais: Corn,
  gemuese: GenericProduce,
  milch: LucideMilk,
  joghurt: Milk,
  butter: Cheese,
  kaese: Cheese,
  ei: LucideEgg,
  huhn: LucideDrumstick,
  fleisch: LucideBeef,
  speck: LucideHam,
  wurst: Sausage,
  fisch: LucideFish,
  garnelen: LucideShrimp,
  reis: Rice,
  nudeln: Pasta,
  linsen: Rice,
  bohne: Rice,
  getreide: LucideWheat,
  hafer: Rice,
  mehl: Box,
  brot: Bread,
  broetchen: Bread,
  gebaeck: LucideCroissant,
  tiefkuehl: LucideSnowflake,
  wasser: LucideGlassWater,
  saft: Bottle,
  getraenk: LucideCupSoda,
  bier: LucideBeer,
  wein: LucideWine,
  kaffee: LucideCoffee,
  tee: Bottle,
  ol: Drop,
  essig: Jar,
  gewuerz: Spice,
  zucker: Box,
  honig: Jar,
  nuss: LucideNut,
  dose: Can,
  schokolade: Box,
  default: GenericProduce,
}

export function ProductIcon({ iconKey, size = 24, className }: ProductIconProps) {
  const Icon = ICON_MAP[iconKey] ?? ICON_MAP.default
  return <Icon size={size} className={className} />
}
