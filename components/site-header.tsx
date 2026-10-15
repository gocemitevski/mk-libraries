'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Offcanvas } from '@/components/ui/overlay';

const NAV = [
  { href: '/biblioteki/', label: 'Библиотеки' },
  { href: '/naseleni-mesta/', label: 'Населени места' },
  { href: '/tipovi/', label: 'Типови' },
  { href: '/opstini/', label: 'Општини' },
  { href: '/statistika/', label: 'Статистика' },
  { href: '/metodologija/', label: 'Методологија' },
];

export function SiteHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Затвори го мобилното мени при промена на патеката
  useEffect(() => setMobileOpen(false), [pathname]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href);

  return (
    <header className="site-header">
      <nav className="navbar navbar-expand-lg navbar-light border-bottom sticky-top" aria-label="Главна навигација">
        <div className="container">
          <Link className="navbar-brand fw-bold" href="/">
            Библиотеки<span className="text-accent">.</span>мк
          </Link>

          {/* На ≥lg го отвора самата Bootstrap CSS (navbar-expand-lg), не JS */}
          <div className="navbar-collapse collapse">
            <ul className="navbar-nav ms-auto gap-lg-1">
              {NAV.map((item) => (
                <li className="nav-item" key={item.href}>
                  <Link
                    className={`nav-link${isActive(item.href) ? ' active fw-semibold' : ''}`}
                    href={item.href}
                    aria-current={isActive(item.href) ? 'page' : undefined}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <button
            type="button"
            className="navbar-toggler d-lg-none"
            aria-controls="mobile-nav"
            aria-expanded={mobileOpen}
            aria-label={mobileOpen ? 'Затвори го менито' : 'Отвори го менито'}
            onClick={() => setMobileOpen((v) => !v)}
          >
            <span className="navbar-toggler-icon" />
          </button>
        </div>
      </nav>

      <Offcanvas
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        side="end"
        id="mobile-nav"
        label="Мени"
        title="Навигација"
      >
        <ul className="nav nav-pills flex-column">
          {NAV.map((item) => (
            <li className="nav-item" key={item.href}>
              <Link
                className={`nav-link${isActive(item.href) ? ' active' : ''}`}
                href={item.href}
                aria-current={isActive(item.href) ? 'page' : undefined}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </Offcanvas>
    </header>
  );
}
