import { Moon, Sun } from 'lucide-react';
import { useAppPreferences } from '@/lib/app-preferences';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type ThemeToggleProps = {
  className?: string;
  /** Legacy admin topbar button styling */
  variant?: 'ui' | 'adm';
};

export function ThemeToggle({ className, variant = 'ui' }: ThemeToggleProps) {
  const { resolvedTheme, toggleLightDark } = useAppPreferences();
  const isDark = resolvedTheme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';

  if (variant === 'adm') {
    return (
      <button
        type="button"
        className={cn('adm-theme-toggle', className)}
        onClick={toggleLightDark}
        aria-label={label}
        title={label}
      >
        {isDark ? <Sun width={18} height={18} aria-hidden /> : <Moon width={18} height={18} aria-hidden />}
        <span className="adm-theme-toggle__label">{isDark ? 'Light' : 'Dark'}</span>
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={className}
      onClick={toggleLightDark}
      aria-label={label}
      title={label}
    >
      {isDark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </Button>
  );
}
