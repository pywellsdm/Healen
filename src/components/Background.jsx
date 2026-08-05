import { useTheme } from "@/lib/ThemeContext";

export default function Background() {
  const { wallpaperUrl, wallpaperBlur } = useTheme();
  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {wallpaperUrl ? (
        <>
          <img
            src={wallpaperUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            style={{ filter: `blur(${wallpaperBlur}px)`, transform: `scale(${1 + wallpaperBlur / 50})` }}
          />
          <div className="absolute inset-0 bg-black/40" />
        </>
      ) : (
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: "var(--ambient-1)" }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: "var(--ambient-2)" }} />
          <div className="absolute top-1/3 left-0 w-[300px] h-[300px] rounded-full blur-[80px]" style={{ background: "var(--ambient-3)" }} />
        </div>
      )}
    </div>
  );
}
