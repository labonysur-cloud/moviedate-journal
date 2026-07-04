import { useEffect, useMemo, useRef, useState } from "react";

const MIN_DESKTOP_PLAYER_WIDTH = 1280;

interface DesktopPlayerFrameProps {
  src?: string;
  srcDoc?: string;
  title: string;
  desktopMode?: boolean;
  allow: string;
  sandbox?: string;
}

export default function DesktopPlayerFrame({
  src,
  srcDoc,
  title,
  desktopMode = true,
  allow,
  sandbox,
}: DesktopPlayerFrameProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ width: MIN_DESKTOP_PLAYER_WIDTH, height: 720 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      setBox({
        width: Math.max(1, rect.width),
        height: Math.max(1, rect.height),
      });
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const desktopSizing = useMemo(() => {
    if (!desktopMode) return null;

    const frameWidth = Math.max(MIN_DESKTOP_PLAYER_WIDTH, Math.ceil(box.width));
    const scale = Math.min(1, box.width / frameWidth);
    const frameHeight = Math.ceil(box.height / Math.max(scale, 0.1));

    return { frameWidth, frameHeight, scale };
  }, [box.height, box.width, desktopMode]);

  return (
    <div ref={containerRef} className="h-full w-full overflow-hidden bg-foreground">
      <iframe
        key={`${src || "srcdoc"}-${desktopMode ? "desktop" : "auto"}-${sandbox ? "shield" : "open"}`}
        src={src}
        srcDoc={srcDoc}
        title={title}
        className="border-0 bg-foreground"
        allowFullScreen
        allow={allow}
        referrerPolicy="no-referrer"
        sandbox={sandbox}
        style={
          desktopSizing
            ? {
                width: `${desktopSizing.frameWidth}px`,
                height: `${desktopSizing.frameHeight}px`,
                transform: `scale(${desktopSizing.scale})`,
                transformOrigin: "top left",
              }
            : { width: "100%", height: "100%" }
        }
      />
    </div>
  );
}