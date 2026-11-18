import type { SVGProps } from "react";

export default function JigsawPiece({size = 24, ...props}: SVGProps<SVGSVGElement> & {size?:number}) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="currentColor" stroke="none" aria-hidden="true" {...props}>
    <path d="M4.5 6H9V4.5a2.5 2.5 0 0 1 5 0V6h4.5A1.5 1.5 0 0 1 20 7.5V11h-1.5a2.5 2.5 0 0 0 0 5H20v3.5a1.5 1.5 0 0 1-1.5 1.5H14v-1.5a2.5 2.5 0 0 0-5 0V21H4.5A1.5 1.5 0 0 1 3 19.5V15H1.5a2.5 2.5 0 0 1 0-5H3V7.5A1.5 1.5 0 0 1 4.5 6Z" transform="translate(1 0) scale(.94 1)" />
  </svg>;
}
