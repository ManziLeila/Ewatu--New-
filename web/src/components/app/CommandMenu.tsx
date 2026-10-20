import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { fetchMe } from '@/api';
import { hasAnyRole } from '@/lib/roles';
import { COMMAND_ROUTES } from '@/lib/command-routes';

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const [roles, setRoles] = useState<string[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetchMe()
      .then((me) => setRoles(me.roles ?? []))
      .catch(() => setRoles([]));
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('ewatu:open-command', onOpen);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('ewatu:open-command', onOpen);
    };
  }, []);

  const run = useCallback(
    (href: string) => {
      setOpen(false);
      navigate(href);
    },
    [navigate],
  );

  const visibleRoutes = useMemo(
    () =>
      COMMAND_ROUTES.filter(
        (route) => !route.roles || route.roles.length === 0 || hasAnyRole(roles, route.roles),
      ),
    [roles],
  );

  const groups = visibleRoutes.reduce<Record<string, typeof visibleRoutes>>((acc, route) => {
    acc[route.group] = acc[route.group] ?? [];
    acc[route.group].push(route);
    return acc;
  }, {});

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Jump to a page or action…" />
      <CommandList>
        <CommandEmpty>No matches.</CommandEmpty>
        {Object.entries(groups).map(([group, routes]) => (
          <CommandGroup key={group} heading={group}>
            {routes.map((route) => (
              <CommandItem
                key={route.id}
                value={`${route.label} ${route.keywords ?? ''}`}
                onSelect={() => run(route.href)}
              >
                {route.label}
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
