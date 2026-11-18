import type { SVGProps } from "react";

export default function FrontBinoculars({size = 24, ...props}: SVGProps<SVGSVGElement> & {size?:number}) {
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 32 26" fill="currentColor" stroke="none" aria-hidden="true" {...props}>
    <path d="M10.1 4.1c2.6-2.4 5.4-.5 4.9 2.2-1.3-1.6-2.8-2.4-4.9-2.2Zm11.8 0c-2.6-2.4-5.4-.5-4.9 2.2 1.3-1.6 2.8-2.4 4.9-2.2Z" />
    <path fillRule="evenodd" d="m1.8 12.3 6-5.6c2.5-2.4 5.7-1.3 7.2 1.4.6-.5 1.4-.5 2 0 1.5-2.7 4.7-3.8 7.2-1.4l6 5.6c4.4 4.7.5 12.2-5.8 10.2-2.9-.9-3.3-3.8-5.6-4.6-1.8-.7-3.8-.7-5.6 0-2.3.8-2.7 3.7-5.6 4.6C1.3 24.5-2.6 17 1.8 12.3ZM12.1 16a4.6 4.6 0 1 1-9.2 0 4.6 4.6 0 0 1 9.2 0Zm17 0a4.6 4.6 0 1 1-9.2 0 4.6 4.6 0 0 1 9.2 0ZM17.6 13.8a1.6 1.6 0 1 1-3.2 0 1.6 1.6 0 0 1 3.2 0Z" />
    <path d="M9.5 14.1a3.2 3.2 0 0 1-.6 4.2m17.6-4.2a3.2 3.2 0 0 1-.6 4.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>;
}
