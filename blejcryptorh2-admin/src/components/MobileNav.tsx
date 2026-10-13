import { useState, useEffect, useRef } from 'react';
import type { Route } from '../lib/useRouter';

interface MobileNavProps {
  items: { label: string; route: Route }[];
  route: Route;
  onNavigate: (e: React.MouseEvent, to: Route) => void;
}

export default function MobileNav({ items, route, onNavigate }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target) || buttonRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    // Close if the viewport grows past the mobile breakpoint
    const mq = window.matchMedia('(min-width: 769px)');
    const onBreakpoint = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    mq.addEventListener('change', onBreakpoint);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      mq.removeEventListener('change', onBreakpoint);
    };
  }, [open]);

  const bar = 'absolute left-0 block h-0.5 w-4 rounded-full bg-current transition-all duration-300 ease-out';

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-nav-menu"
        aria-label={open ? 'Mbyll menunë' : 'Hap menunë'}
        className="min-[769px]:hidden w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all flex items-center justify-center cursor-pointer flex-shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
      >
        <span className="relative block w-4 h-3" aria-hidden="true">
          <span className={`${bar} ${open ? 'top-[5px] rotate-45' : 'top-0'}`} />
          <span className={`${bar} top-[5px] ${open ? 'opacity-0 scale-x-0' : 'opacity-100'}`} />
          <span className={`${bar} ${open ? 'top-[5px] -rotate-45' : 'top-[10px]'}`} />
        </span>
      </button>

      <div
        ref={menuRef}
        id="mobile-nav-menu"
        className={`min-[769px]:hidden absolute left-0 right-0 top-full px-4 sm:px-6 pt-2 transition-all duration-200 ease-out ${
          open ? 'opacity-100 translate-y-0 visible' : 'opacity-0 -translate-y-2 invisible pointer-events-none'
        }`}
      >
        <nav
          aria-label="Navigimi kryesor"
          className="max-w-6xl mx-auto max-h-[calc(100dvh-8rem)] overflow-y-auto rounded-2xl border border-slate-200/60 dark:border-slate-800/60 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl shadow-slate-900/10 dark:shadow-black/40 p-2"
        >
          <ul className="flex flex-col text-sm font-medium text-slate-600 dark:text-slate-300">
            {items.map((item) => {
              const active = route === item.route;
              return (
                <li key={item.route}>
                  <a
                    href={item.route}
                    onClick={(e) => {
                      onNavigate(e, item.route);
                      setOpen(false);
                    }}
                    aria-current={active ? 'page' : undefined}
                    className={`block px-4 py-3 rounded-xl break-words hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 ${
                      active ? 'text-slate-900 dark:text-white font-bold bg-slate-100/70 dark:bg-slate-800/70' : ''
                    }`}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </>
  );
}
