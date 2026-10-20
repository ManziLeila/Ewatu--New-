import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineBanner() {
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    const on = () => setOffline(false);
    const off = () => setOffline(true);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (!offline) return null;

  return (
    <div
      role="status"
      className="flex items-center justify-center gap-3 border-b border-warning/40 bg-warning/15 px-4 py-2 text-sm text-warning-foreground"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden />
      <span>You are offline. Changes may not save until connection returns.</span>
      <Button type="button" size="sm" variant="outline" onClick={() => window.location.reload()}>
        Retry
      </Button>
    </div>
  );
}
