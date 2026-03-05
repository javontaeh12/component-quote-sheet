'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { PhoneIcon, MenuIcon, XIcon, ChevronDownIcon } from './icons';
import { servicesData } from '@/lib/services-data';

const makeServiceLink = (s: (typeof servicesData)[string]) => {
  const shortTitle = s.title.replace(/ IN .+$/, '');
  const label = shortTitle.charAt(0) + shortTitle.slice(1).toLowerCase();
  return { label, href: `/services/${s.slug}`, Icon: s.icon };
};

const refrigerationSlugs = ['commercial-refrigeration', 'refrigerator-repair', 'freezer-repair'];

const hvacServices = Object.values(servicesData)
  .filter((s) => !refrigerationSlugs.includes(s.slug))
  .map(makeServiceLink);

const refrigerationServices = Object.values(servicesData)
  .filter((s) => refrigerationSlugs.includes(s.slug))
  .map(makeServiceLink);

const allServices = [...hvacServices, ...refrigerationServices];

const navLinks = [
  { label: 'How It Works', href: '/#how-it-works' },
  { label: 'Request Service', href: '/#request' },
  { label: 'Membership', href: '/membership' },
  { label: 'Reviews', href: '/#reviews' },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [servicesOpen, setServicesOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setServicesOpen(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setServicesOpen(false), 150);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen
          ? 'bg-white/95 backdrop-blur-md shadow-lg shadow-black/10'
          : 'bg-white'
      }`}
    >
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-18 sm:h-28 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/logo.png"
              alt="Harden HVAC & Refrigeration"
              width={360}
              height={120}
              className="h-12 sm:h-22 w-auto"
              priority
            />
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {/* Services dropdown */}
            <div
              ref={dropdownRef}
              className="relative"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <button
                type="button"
                className="flex items-center gap-1 text-base font-bold text-[var(--navy)] hover:text-[var(--ember)] transition-colors"
              >
                Services
                <ChevronDownIcon
                  className={`w-4 h-4 transition-transform duration-200 ${
                    servicesOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown panel */}
              {servicesOpen && (
                <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3">
                  <div className="bg-white border border-gray-200 rounded-xl shadow-2xl shadow-black/10 p-5">
                    <div className="flex gap-8">
                      {/* HVAC column */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--navy)] mb-2 px-3">HVAC</p>
                        <div className="space-y-0.5">
                          {hvacServices.map((service) => (
                            <Link
                              key={service.href}
                              href={service.href}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--navy)]/70 hover:text-[var(--ember)] hover:bg-gray-50 transition-colors"
                              onClick={() => setServicesOpen(false)}
                            >
                              <service.Icon className="w-4 h-4 flex-shrink-0" />
                              <span className="whitespace-nowrap">{service.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                      {/* Refrigeration column */}
                      <div>
                        <p className="text-xs font-bold uppercase tracking-widest text-[var(--navy)] mb-2 px-3">Refrigeration</p>
                        <div className="space-y-0.5">
                          {refrigerationServices.map((service) => (
                            <Link
                              key={service.href}
                              href={service.href}
                              className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-[var(--navy)]/70 hover:text-[var(--ember)] hover:bg-gray-50 transition-colors"
                              onClick={() => setServicesOpen(false)}
                            >
                              <service.Icon className="w-4 h-4 flex-shrink-0" />
                              <span className="whitespace-nowrap">{service.label}</span>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-3 border-t border-gray-200">
                      <Link
                        href="/#services"
                        className="block text-center text-xs font-semibold text-[var(--accent)] hover:text-[var(--ember)] transition-colors"
                        onClick={() => setServicesOpen(false)}
                      >
                        View All Services
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="text-base font-bold text-[var(--navy)] hover:text-[var(--ember)] transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Phone CTA + Mobile toggle */}
          <div className="flex items-center gap-3">
            <a
              href="tel:9105466485"
              className="hidden sm:flex items-center gap-2 rounded-full bg-[var(--ember)] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[var(--ember-dark)] transition-colors shadow-md shadow-[var(--ember)]/25"
            >
              <PhoneIcon className="w-4 h-4" />
              (910) 546-6485
            </a>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 text-[var(--navy)]"
              aria-label="Toggle menu"
            >
              {menuOpen ? <XIcon className="w-6 h-6" /> : <MenuIcon className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu — fullscreen overlay */}
      {menuOpen && (
        <div className="md:hidden fixed inset-0 top-[4.5rem] bg-white z-50 overflow-y-auto">
          <div className="px-4 py-4 space-y-1 pb-24">
            {/* Services accordion */}
            <button
              onClick={() => setServicesOpen(!servicesOpen)}
              className="flex items-center justify-between w-full rounded-lg px-4 py-3 text-base font-medium text-[var(--navy)] hover:bg-gray-50 hover:text-[var(--ember)] transition-colors"
            >
              Services
              <ChevronDownIcon
                className={`w-5 h-5 transition-transform duration-200 ${
                  servicesOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            {servicesOpen && (
              <div className="pl-4">
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--navy)] mt-2 mb-1 px-4">HVAC</p>
                {hvacServices.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    onClick={() => { setMenuOpen(false); setServicesOpen(false); }}
                    className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-[var(--navy)]/70 hover:bg-gray-50 hover:text-[var(--ember)] transition-colors"
                  >
                    <service.Icon className="w-4 h-4 flex-shrink-0" />
                    {service.label}
                  </Link>
                ))}
                <p className="text-xs font-bold uppercase tracking-widest text-[var(--navy)] mt-3 mb-1 px-4">Refrigeration</p>
                {refrigerationServices.map((service) => (
                  <Link
                    key={service.href}
                    href={service.href}
                    onClick={() => { setMenuOpen(false); setServicesOpen(false); }}
                    className="flex items-center gap-2.5 rounded-lg px-4 py-2.5 text-sm text-[var(--navy)]/70 hover:bg-gray-50 hover:text-[var(--ember)] transition-colors"
                  >
                    <service.Icon className="w-4 h-4 flex-shrink-0" />
                    {service.label}
                  </Link>
                ))}
              </div>
            )}

            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-4 py-3 text-base font-medium text-[var(--navy)] hover:bg-gray-50 hover:text-[var(--ember)] transition-colors"
              >
                {link.label}
              </a>
            ))}
            <a
              href="tel:9105466485"
              className="flex items-center justify-center gap-2 mt-3 rounded-full bg-[var(--ember)] px-4 py-3 text-base font-semibold text-white"
            >
              <PhoneIcon className="w-5 h-5" />
              Call (910) 546-6485
            </a>
          </div>
        </div>
      )}
    </nav>
  );
}
