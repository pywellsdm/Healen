import { useState } from "react";
import { useTheme } from "@/lib/ThemeContext";

function wallpaperStyle(blur, zoom, posX, posY) {
  const scale = (zoom || 1) * (1 + blur / 60);
  return {
    filter: `blur(${blur}px)`,
    transform: `scale(${scale})`,
    objectPosition: `${posX}% ${posY}%`,
  };
}

export default function Background() {
  const {
    wallpaperUrl,
    wallpaperBlur,
    videoWallpaperUrl,
    wallpaperZoom,
    wallpaperPosX,
    wallpaperPosY,
  } = useTheme();
  const [videoReady, setVideoReady] = useState(false);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-black">
      {/* Base layer is always the image wallpaper, so the screen is never blank
          while a video decodes. The video fades in over it once it has a frame. */}
      {wallpaperUrl && (
        <img
          src={wallpaperUrl}
          alt=""
          draggable={false}
          className="absolute inset-0 w-full h-full object-cover"
          style={wallpaperStyle(wallpaperBlur, wallpaperZoom, wallpaperPosX, wallpaperPosY)}
        />
      )}

      {videoWallpaperUrl && (
        <video
          src={videoWallpaperUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          disablePictureInPicture
          controlsList="nodownload"
          className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
          style={{
            ...wallpaperStyle(wallpaperBlur, wallpaperZoom, wallpaperPosX, wallpaperPosY),
            opacity: videoReady ? 1 : 0,
            backgroundColor: "transparent",
          }}
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
        />
      )}

      {!videoWallpaperUrl && !wallpaperUrl && (
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full blur-[120px]" style={{ background: "var(--ambient-1)" }} />
          <div className="absolute bottom-0 right-0 w-[400px] h-[400px] rounded-full blur-[100px]" style={{ background: "var(--ambient-2)" }} />
          <div className="absolute top-1/3 left-0 w-[300px] h-[300px] rounded-full blur-[80px]" style={{ background: "var(--ambient-3)" }} />
        </div>
      )}
      <div className="absolute inset-0 bg-black/40" />
    </div>
  );
}