import { IS_NATIVE } from "@/lib/appInfo";

export const TELEGRAM_GROUP_URL = "https://t.me/+n-NwyX49pfpmNGFi";

export const openExternalLink = async (url) => {
  if (IS_NATIVE) {
    try {
      const { Browser } = await import("@capacitor/browser");
      await Browser.open({ url });
      return;
    } catch (e) {
      /* fall through to window.open */
    }
  }
  window.open(url, "_blank", "noopener,noreferrer");
};
