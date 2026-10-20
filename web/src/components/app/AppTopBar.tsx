import { Bell, Command, LogOut, Moon, Sun, Monitor, Rows3, PanelLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ThemeToggle } from '@/components/app/ThemeToggle';
import { useAppPreferences } from '@/lib/app-preferences';
import { clearAuthTokens } from '@/auth/token';

type AppTopBarProps = {
  title?: string;
  userEmail?: string;
  userInitials?: string;
  onOpenCommand?: () => void;
  onToggleSidebar?: () => void;
  showSidebarToggle?: boolean;
};

export function AppTopBar({
  title,
  userEmail = '',
  userInitials = 'U',
  onOpenCommand,
  onToggleSidebar,
  showSidebarToggle = true,
}: AppTopBarProps) {
  const { theme, setTheme, density, setDensity, toggleSidebarCollapsed } = useAppPreferences();
  const navigate = useNavigate();

  const logout = () => {
    clearAuthTokens();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-card/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {showSidebarToggle ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Toggle sidebar"
              onClick={() => {
                toggleSidebarCollapsed();
                onToggleSidebar?.();
              }}
            >
              <PanelLeft className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Collapse sidebar</TooltipContent>
        </Tooltip>
      ) : null}
      {title ? <h1 className="truncate text-sm font-bold lg:text-base">{title}</h1> : null}
      <div className="ms-auto flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="hidden gap-2 sm:inline-flex"
              onClick={() => {
                onOpenCommand?.();
                window.dispatchEvent(new Event('ewatu:open-command'));
              }}
            >
              <Command className="size-3.5" />
              Search
              <kbd className="pointer-events-none rounded border border-border bg-muted px-1.5 font-mono text-[10px]">⌘K</kbd>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Command palette (⌘/Ctrl+K)</TooltipContent>
        </Tooltip>

        <ThemeToggle />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="size-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Notifications</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
              <Avatar className="size-9">
                <AvatarFallback className="bg-accent text-accent-foreground text-xs font-bold">{userInitials}</AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <p className="text-sm font-semibold">Account</p>
              <p className="truncate text-xs text-muted-foreground">{userEmail || '—'}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/platform/my-profile">Profile</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/platform/change-password">Change password</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Theme</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={theme} onValueChange={(v) => setTheme(v as typeof theme)}>
              <DropdownMenuRadioItem value="light">
                <Sun className="me-2 size-4" /> Light
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="dark">
                <Moon className="me-2 size-4" /> Dark
              </DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="system">
                <Monitor className="me-2 size-4" /> System
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Density</DropdownMenuLabel>
            <DropdownMenuRadioGroup value={density} onValueChange={(v) => setDensity(v as typeof density)}>
              <DropdownMenuRadioItem value="comfortable">Comfortable</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="compact">
                <Rows3 className="me-2 size-4" /> Compact
              </DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
              <LogOut className="me-2 size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
