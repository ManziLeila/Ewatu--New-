import { type ReactNode, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { AppTopBar } from '@/components/app/AppTopBar';
import { PageMotion } from '@/components/app/PageMotion';
import { useAppPreferences } from '@/lib/app-preferences';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export type ModuleNavItem = {
  to: string;
  label: string;
  icon: ReactNode;
  end?: boolean;
};

export type ModuleNavSection = { type: 'section'; label: string };
export type ModuleNavEntry = ModuleNavSection | (ModuleNavItem & { type: 'link' });

type AppModuleShellProps = {
  productTitle: string;
  backTo?: { href: string; label: string };
  nav: ModuleNavEntry[];
  userRole?: string;
  userEmail?: string;
  workspaceMain?: boolean;
  children: ReactNode;
};

function NavLinkItem({
  item,
  collapsed,
  onNavigate,
}: {
  item: ModuleNavItem;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  const link = (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground transition-colors',
          collapsed && 'justify-center px-2',
          isActive
            ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
            : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )
      }
    >
      <span className="flex size-5 shrink-0 items-center justify-center opacity-90">{item.icon}</span>
      {!collapsed ? item.label : null}
    </NavLink>
  );

  if (collapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{link}</TooltipTrigger>
        <TooltipContent side="right">{item.label}</TooltipContent>
      </Tooltip>
    );
  }
  return link;
}

export function AppModuleShell({
  productTitle,
  backTo,
  nav,
  userRole = 'User',
  userEmail = '',
  workspaceMain = false,
  children,
}: AppModuleShellProps) {
  const [navOpen, setNavOpen] = useState(false);
  const location = useLocation();
  const { sidebarCollapsed } = useAppPreferences();
  const links = nav.filter((e): e is ModuleNavItem & { type: 'link' } => e.type === 'link');
  const currentPage =
    links.find((item) => (item.end ? location.pathname === item.to : location.pathname.startsWith(item.to)))
      ?.label ?? productTitle;

  const initials = useMemo(
    () =>
      userRole
        .split(/\s+/)
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
    [userRole],
  );

  useEffect(() => {
    setNavOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = navOpen ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [navOpen]);

  return (
    <div className={cn('flex min-h-screen bg-background text-foreground', navOpen && 'overflow-hidden')}>
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden',
          navOpen ? 'block' : 'hidden',
        )}
        onClick={() => setNavOpen(false)}
        aria-hidden
      />

      <aside
        className={cn(
          'fixed inset-y-0 start-0 z-50 flex flex-col border-e border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width,transform] duration-[var(--motion-duration)] lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:translate-x-0',
          navOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
          sidebarCollapsed ? 'w-[72px]' : 'w-[250px]',
        )}
      >
        <div className={cn('border-b border-sidebar-border px-4 py-4', sidebarCollapsed && 'px-2 text-center')}>
          {backTo && !sidebarCollapsed ? (
            <Link
              to={backTo.href}
              className="mb-2 block text-xs font-medium text-muted-foreground hover:text-sidebar-foreground"
            >
              ← {backTo.label}
            </Link>
          ) : null}
          <p className={cn('text-base font-bold tracking-tight', sidebarCollapsed && 'text-xs')}>
            {sidebarCollapsed ? productTitle.slice(0, 1) : productTitle}
          </p>
        </div>
        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-3" aria-label={productTitle}>
          {nav.map((entry) =>
            entry.type === 'section' ? (
              !sidebarCollapsed ? (
                <div
                  key={entry.label}
                  className="mt-2 px-2 pb-1 pt-3 text-[0.68rem] font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  {entry.label}
                </div>
              ) : (
                <div key={entry.label} className="my-2 h-px bg-sidebar-border" aria-hidden />
              )
            ) : (
              <NavLinkItem
                key={entry.to}
                item={entry}
                collapsed={sidebarCollapsed}
                onNavigate={() => setNavOpen(false)}
              />
            ),
          )}
        </nav>
        {!sidebarCollapsed ? (
          <div className="border-t border-sidebar-border px-4 py-4">
            <p className="mb-1 rounded-md border border-sidebar-primary/40 px-2 py-1 text-xs font-bold text-sidebar-foreground">
              {userRole}
            </p>
            <p className="break-all text-[0.72rem] text-muted-foreground">{userEmail || '—'}</p>
          </div>
        ) : null}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="lg:hidden">
          <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
            <Button type="button" variant="ghost" size="icon" aria-label="Open menu" onClick={() => setNavOpen(true)}>
              <Menu className="size-5" />
            </Button>
            <span className="text-sm font-bold">{currentPage}</span>
          </header>
        </div>
        <div className="hidden lg:block">
          <AppTopBar title={currentPage} userEmail={userEmail} userInitials={initials} />
        </div>
        <main
          className={cn(
            'min-h-[calc(100vh-3.5rem)] flex-1 overflow-y-auto lg:min-h-[calc(100vh-3.5rem)]',
            workspaceMain ? 'bg-workspace text-workspace-foreground' : 'bg-background',
          )}
        >
          <PageMotion className="min-h-full">{children}</PageMotion>
        </main>
      </div>
    </div>
  );
}
