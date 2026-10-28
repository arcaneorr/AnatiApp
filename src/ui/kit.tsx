import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import type { ClassSession } from '../domain/types';
import type { Tone } from '../domain/progress';
import { useStore, useT } from '../state/store';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'primary',
  block = false,
  small = false,
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; block?: boolean; small?: boolean }) {
  return (
    <button
      type="button"
      className={`btn btn-${variant}${block ? ' btn-block' : ''}${small ? ' btn-sm' : ''} ${className}`}
      {...rest}
    />
  );
}

export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function hash(text: string): number {
  let h = 0;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;
  return h;
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  // First letter of each word (skips marks like "׳" and brackets), up to two.
  const initials = name
    .split(/\s+/)
    .map((part) => part.match(/\p{L}/u)?.[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span className={`avatar av-${hash(name) % 6}`} style={{ width: size, height: size, fontSize: size * 0.4 }} aria-hidden="true">
      {initials}
    </span>
  );
}

export function AvatarStack({ names, max = 6, size = 30 }: { names: string[]; max?: number; size?: number }) {
  const shown = names.slice(0, max);
  const extra = names.length - shown.length;
  // Spans only, so it can sit inside a button.
  return (
    <span className="avatar-stack" aria-hidden="true">
      {shown.map((n, i) => (
        <Avatar key={`${n}-${i}`} name={n} size={size} />
      ))}
      {extra > 0 && (
        <span className="avatar avatar-more" style={{ width: size, height: size }}>
          +{extra}
        </span>
      )}
    </span>
  );
}

export function Capacity({ x }: { x: ClassSession }) {
  const t = useT().ui.capacity;
  const taken = x.bookedIds.length + x.heldIds.length;
  const left = Math.max(0, x.capacity - taken);
  const pct = Math.min(100, Math.round((taken / x.capacity) * 100));
  const tone = left === 0 ? 'full' : left <= 2 ? 'low' : 'ok';
  const label = left > 0 ? t.left(left, x.capacity) : x.waitlistIds.length ? t.fullWaitlist(x.waitlistIds.length) : t.full;
  // Spans only, so it can sit inside a button.
  return (
    <span className="capacity">
      <span className={`bar bar-${tone}`} aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </span>
      <span className="capacity-label">{label}</span>
    </span>
  );
}

/** Classes used out of the plan, as a bar with a caption. */
export function UsageBar({ used, total, label }: { used: number; total: number; label: string }) {
  const pct = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;
  return (
    <div className="usage">
      <div className="usage-bar" aria-hidden="true">
        <span style={{ width: `${pct}%` }} />
      </div>
      <span className="usage-label">{label}</span>
    </div>
  );
}

export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; lang?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          lang={o.lang}
          aria-checked={o.value === value}
          className={o.value === value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="switch-row">
      <label htmlFor={id} className="switch-label">
        <span>{label}</span>
        {hint && <span className="hint">{hint}</span>}
      </label>
      <input id={id} type="checkbox" role="switch" className="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    </div>
  );
}

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/** Bottom sheet dialog: Escape closes, focus is trapped and restored on close. */
export function Sheet({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: ReactNode }) {
  const t = useT().ui.common;
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const items = panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        ref={panelRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sheet-handle" aria-hidden="true" />
        <div className="sheet-header">
          <h2 id={titleId}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label={t.close}>
            ✕
          </button>
        </div>
        <div className="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Toasts() {
  const { toasts, dismiss } = useStore();
  const t = useT().ui.common;
  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.kind}`}>
          <span>{toast.text}</span>
          <button type="button" className="icon-btn" aria-label={t.dismiss} onClick={() => dismiss(toast.id)}>
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

export function ProgressRing({ value, max, label }: { value: number; max: number; label: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const frac = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <svg className="ring" width="68" height="68" viewBox="0 0 68 68" role="img" aria-label={label}>
      <circle cx="34" cy="34" r={r} className="ring-track" />
      <circle
        cx="34"
        cy="34"
        r={r}
        className="ring-fill"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - frac)}
        transform="rotate(-90 34 34)"
      />
      <text x="34" y="39" textAnchor="middle" className="ring-text" direction="ltr">
        {value}/{max}
      </text>
    </svg>
  );
}

const ICONS: Record<string, ReactNode> = {
  home: <path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" />,
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </>
  ),
  list: <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  // Points to the inline end ("next"); CSS mirrors it in right-to-left layouts.
  next: <path d="M9 5l7 7-7 7" />,
  prev: <path d="M15 5l-7 7 7 7" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  plus: <path d="M12 5v14M5 12h14" />,
};

export function Icon({ name, size = 22 }: { name: keyof typeof ICONS; size?: number }) {
  const mirrored = name === 'next' || name === 'prev';
  return (
    <svg
      className={mirrored ? 'flip-rtl' : undefined}
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {ICONS[name]}
    </svg>
  );
}
