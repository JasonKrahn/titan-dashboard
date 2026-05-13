import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function PwaStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine));
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!offlineReady) return;

    toast.success("Titan PM is ready for offline use.");
    setOfflineReady(false);
  }, [offlineReady, setOfflineReady]);

  if (!isOnline) {
    return (
      <div
        className="fixed inset-x-3 bottom-3 z-50 rounded-lg border border-border bg-background/95 px-4 py-3 text-sm text-foreground shadow-lg backdrop-blur sm:inset-x-auto sm:right-4 sm:max-w-sm"
        role="status"
      >
        <p className="font-medium">You&apos;re offline</p>
        <p className="mt-1 text-muted-foreground">Titan PM will keep the app shell available. Live project data may be unavailable until you reconnect.</p>
      </div>
    );
  }

  if (needRefresh) {
    return (
      <div
        className="fixed inset-x-3 bottom-3 z-50 rounded-lg border border-border bg-background/95 px-4 py-3 text-sm text-foreground shadow-lg backdrop-blur sm:inset-x-auto sm:right-4 sm:max-w-sm"
        role="status"
      >
        <p className="font-medium">Update available</p>
        <p className="mt-1 text-muted-foreground">Reload Titan PM to use the latest version.</p>
        <div className="mt-3 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setNeedRefresh(false)}>
            Later
          </Button>
          <Button size="sm" onClick={() => void updateServiceWorker(true)}>
            Reload
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
