'use client';

import { ReactNode } from 'react';

export type StatusVariant = 'idle' | 'info' | 'success' | 'warning' | 'error' | 'empty';

export interface StatusAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

export interface StatusPanelProps {
  variant?: StatusVariant;
  title: string;
  message?: string;
  details?: string;
  action?: StatusAction;
  secondaryAction?: StatusAction;
  icon?: ReactNode;
  className?: string;
}

const variantStyles: Record<
  StatusVariant,
  {
    container: string;
    title: string;
    badge: string;
    label: string;
  }
> = {
  idle: {
    container: 'border-slate-200 bg-slate-50/70 text-slate-800',
    title: 'text-slate-900',
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    label: 'Idle',
  },
  info: {
    container: 'border-blue-200 bg-blue-50/70 text-blue-900',
    title: 'text-blue-950',
    badge: 'bg-blue-100 text-blue-700 border-blue-200',
    label: 'Info',
  },
  success: {
    container: 'border-emerald-200 bg-emerald-50/70 text-emerald-900',
    title: 'text-emerald-950',
    badge: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    label: 'Success',
  },
  warning: {
    container: 'border-amber-200 bg-amber-50/70 text-amber-900',
    title: 'text-amber-950',
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    label: 'Warning',
  },
  error: {
    container: 'border-rose-200 bg-rose-50/70 text-rose-900',
    title: 'text-rose-950',
    badge: 'bg-rose-100 text-rose-700 border-rose-200',
    label: 'Error',
  },
  empty: {
    container: 'border-violet-200 bg-violet-50/70 text-violet-900',
    title: 'text-violet-950',
    badge: 'bg-violet-100 text-violet-700 border-violet-200',
    label: 'Empty',
  },
};

function joinClasses(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ');
}

function DefaultIcon({ variant }: { variant: StatusVariant }) {
  const iconClass = 'h-5 w-5';

  if (variant === 'success') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    );
  }

  if (variant === 'warning') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.29 3.86l-8 14A2 2 0 004 21h16a2 2 0 001.71-3.14l-8-14a2 2 0 00-3.42 0z" />
      </svg>
    );
  }

  if (variant === 'error') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
        <circle cx="12" cy="12" r="10" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9l-6 6m0-6l6 6" />
      </svg>
    );
  }

  if (variant === 'empty') {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h10M4 17h16" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={iconClass} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8h.01M11 12h2v4h-2z" />
    </svg>
  );
}

export default function StatusPanel({
  variant = 'idle',
  title,
  message,
  details,
  action,
  secondaryAction,
  icon,
  className,
}: StatusPanelProps) {
  const styles = variantStyles[variant];

  return (
    <section
      role={variant === 'error' ? 'alert' : 'status'}
      aria-live={variant === 'error' ? 'assertive' : 'polite'}
      className={joinClasses(
        'rounded-xl border px-4 py-3 shadow-sm transition-colors md:px-5 md:py-4',
        styles.container,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/15 bg-white/70">
            {icon ?? <DefaultIcon variant={variant} />}
          </div>

          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <h3 className={joinClasses('text-sm font-semibold leading-5', styles.title)}>{title}</h3>
              <span
                className={joinClasses(
                  'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
                  styles.badge,
                )}
              >
                {styles.label}
              </span>
            </div>

            {message ? <p className="text-sm leading-5 opacity-90">{message}</p> : null}
            {details ? <p className="mt-1 text-xs leading-5 opacity-80">{details}</p> : null}
          </div>
        </div>

        {(action || secondaryAction) && (
          <div className="flex shrink-0 flex-wrap justify-end gap-2">
            {secondaryAction ? (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                className="rounded-md border border-current/20 bg-white/70 px-3 py-1.5 text-xs font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {secondaryAction.label}
              </button>
            ) : null}

            {action ? (
              <button
                type="button"
                onClick={action.onClick}
                disabled={action.disabled}
                className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {action.label}
              </button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  );
}
