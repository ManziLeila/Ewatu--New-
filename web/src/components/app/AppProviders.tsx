import type { ReactNode } from 'react';
import { AppPreferencesProvider } from '@/lib/app-preferences';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/sonner';
import { CommandMenu } from '@/components/app/CommandMenu';
import { KeyboardShortcutsDialog } from '@/components/app/KeyboardShortcutsDialog';
import { OfflineBanner } from '@/components/app/OfflineBanner';
import { AppErrorBoundary } from '@/components/app/AppErrorBoundary';
import { CapabilitiesProvider } from '@/lib/capabilities';

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <AppPreferencesProvider>
      <TooltipProvider delayDuration={200}>
        <AppErrorBoundary>
          <CapabilitiesProvider>
            <OfflineBanner />
            {children}
          </CapabilitiesProvider>
          <CommandMenu />
          <KeyboardShortcutsDialog />
          <Toaster richColors closeButton position="top-right" />
        </AppErrorBoundary>
      </TooltipProvider>
    </AppPreferencesProvider>
  );
}
