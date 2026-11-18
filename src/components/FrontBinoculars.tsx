import type { SVGProps } from "react";

export default function FrontBinoculars({size = 24, ...props}: SVGProps<SVGSVGElement> & {size?:number}) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M2.5 13 4.5 5h4l2 8m3 0 2-8h4l2 8M5.5 5V3h2v2m9 0V3h2v2M10 10h4m-3 5h2" />
    <circle cx="6.5" cy="16" r="4.5" />
    <circle cx="17.5" cy="16" r="4.5" />
    <path d="M5 14.5h.01m10.99 0h.01" />
  </svg>;
}
