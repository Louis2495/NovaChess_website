import { useLayoutEffect, useRef } from "react";

export function useLessonViewport() {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const layout = ref.current;
    const workspace = layout?.closest(".workspace");
    if (!layout || !workspace) return;
    const measure = () => {
      const top = layout.getBoundingClientRect().top + window.scrollY;
      const footer = parseFloat(getComputedStyle(workspace).paddingBottom);
      const height = `${Math.floor(window.innerHeight - top - footer)}px`;
      if (layout.style.getPropertyValue("--lesson-height") !== height) {
        layout.style.setProperty("--lesson-height", height);
      }
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(workspace);
    for (const element of Array.from(workspace.children)) {
      if (element !== layout) observer.observe(element);
    }
    window.addEventListener("resize", measure);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  return ref;
}
