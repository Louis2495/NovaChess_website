import type { SVGProps } from "react";

export default function JigsawPiece({size = 24, ...props}: SVGProps<SVGSVGElement> & {size?:number}) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>
    <path d="M4 6h5c-2-5 8-5 6 0h5v4c4-2 4 8 0 6v4h-5c2-5-8-5-6 0H4v-5c5 2 5-8 0-6V6Z" />
  </svg>;
}
