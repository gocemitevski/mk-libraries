'use client';

import { useRef } from 'react';
import { useEscape, useFocusTrap, useScrollLock } from './behaviour';

interface OffcanvasProps {
  open: boolean;
  onClose: () => void;
  side?: 'start' | 'end';
  label: string;
  title?: string;
  /**
   * Стабилен id на панелот - се користи од `aria-controls` на копчето што
   * го отвора. Без него линковите за контрола водат кон нешто што не постои.
   */
  id?: string;
  children: React.ReactNode;
}

/**
 * Offcanvas на Bootstrap, но класите ги управлува React (§3.1).
 * `visibility` мора да е inline бидејќи Bootstrap го крие елементот и
 * нормално неговиот JS би го сменил - тука го правиме ние.
 */
export function Offcanvas({ open, onClose, side = 'start', label, title, id, children }: OffcanvasProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEscape(open, onClose);
  useScrollLock(open);
  useFocusTrap(open, ref);

  return (
    <>
      {open && (
        <div className="offcanvas-backdrop fade show" onClick={onClose} aria-hidden="true" />
      )}
      <div
        ref={ref}
        id={id}
        className={`offcanvas offcanvas-${side}${open ? ' show' : ''}`}
        style={{ visibility: open ? 'visible' : 'hidden' }}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-hidden={!open}
        tabIndex={-1}
      >
        <div className="offcanvas-header">
          {/* Не е наслов во документот: панелот е во <header>, па еден <h2> ќе
              тргне пред <h1>-от на секоја страница. Името на дијалогот веќе
              го носи aria-label, а Bootstrap го стилизира по класа - не по тага. */}
          <div className="offcanvas-title h5">{title ?? label}</div>
          <button type="button" className="btn-close" onClick={onClose} aria-label="Затвори" />
        </div>
        <div className="offcanvas-body">{children}</div>
      </div>
    </>
  );
}
