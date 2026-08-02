import { Outlet } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { startReminderWatcher, stopReminderWatcher } from "@/lib/notifications";
import UpdateBanner from "@/components/UpdateBanner";
import Background from "@/components/Background";

export default function Layout() {
  const location = useLocation();
  const isPanic = location.pathname === "/panic";

  useEffect(() => {
    startReminderWatcher();
    return () => stopReminderWatcher();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: "var(--app-bg)", color: "var(--text-primary)" }}>
      <Background />

      <main className={`relative z-10 mx-auto w-full max-w-md min-h-screen ${isPanic ? "" : "pb-28"}`}>
        {!isPanic && <UpdateBanner />}
        <Outlet />
      </main>

      {!isPanic && <BottomNav />}
    </div>
  );
}