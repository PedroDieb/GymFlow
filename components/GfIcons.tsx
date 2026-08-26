import React from 'react';

/**
 * GYMFLOW V2 — ícones no dialeto do Editorial Brutalism.
 * Traço 1.5px, caps retos, geometria angular (nada de círculos redondos).
 * Mesmos nomes dos icones lucide que substituem, pra troca de import ser simples.
 */
type P = { className?: string; fill?: string };

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'square' as const,
  strokeLinejoin: 'miter' as const,
};

export const Dumbbell: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="2.5" y="8" width="4" height="8" />
    <rect x="17.5" y="8" width="4" height="8" />
    <path d="M6.5 12h11M1.75 10.25v3.5M22.25 10.25v3.5" />
  </svg>
);

export const Cloud: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M4.5 17h15l-2-4h-2.5V6.5h-7.5v4H6.5z" />
  </svg>
);

export const Loader2: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 3.5 20.5 12 12 20.5 3.5 12Z" />
  </svg>
);

export const Trophy: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M6.5 4h11v5a5.5 5.5 0 0 1-11 0Z" />
    <path d="M6.5 5.5H4a3 3 0 0 0 3 3M17.5 5.5H20a3 3 0 0 1-3 3M12 14.5V17M8.5 20h7M12 17v3" />
  </svg>
);

export const User: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M8.5 5h7v7h-7Z" />
    <path d="M5.5 19v-1a4 4 0 0 1 4-4h5a4 4 0 0 1 4 4v1" />
  </svg>
);

export const CalendarDays: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="3.5" y="4.5" width="17" height="16" />
    <path d="M3.5 8.5h17M7.5 2.5v4M16.5 2.5v4" />
    <rect x="7.5" y="11.5" width="3" height="3" />
    <rect x="13.5" y="11.5" width="3" height="3" />
    <rect x="7.5" y="16.5" width="3" height="2.5" />
    <rect x="13.5" y="16.5" width="3" height="2.5" />
  </svg>
);

export const CheckCircle2: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="3.5" y="3.5" width="17" height="17" />
    <path d="M8 12.5 11 15.5 16 9" />
  </svg>
);

export const AlertTriangle: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 3.5 22 20.5H2Z" />
    <path d="M12 9.5v5M12 17.2v.1" />
  </svg>
);

export const BarChart3: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M5.5 19.5v-6M12 19.5V8.5M18.5 19.5V4.5M3 19.5h18" />
  </svg>
);

export const Download: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 3v12M8 11.5 12 15.5 16 11.5M4 18v3h16v-3" />
  </svg>
);

export const Upload: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M12 15V3M8 6.5 12 2.5 16 6.5M4 18v3h16v-3" />
  </svg>
);

export const LogIn: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M13 3.5h7v17h-7M3.5 12H14M14 12 10.5 8.5M14 12l-3.5 3.5" />
  </svg>
);

export const LogOut: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M11 3.5H4v17h7M20.5 12H10M10 12l3.5-3.5M10 12l3.5 3.5" />
  </svg>
);

export const Mail: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <rect x="3" y="5" width="18" height="14" />
    <path d="M3 6.5 12 12.5 21 6.5" />
  </svg>
);

export const Lock: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M7.5 10.5V5.5h9v5" />
    <rect x="4.5" y="10.5" width="15" height="10" />
  </svg>
);

export const Play: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none">
    <path d="M6.5 3.5 20 12 6.5 20.5Z" />
  </svg>
);

export const X: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} {...S}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const Star4: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none">
    <path d="M12 1l2.8 8.2L23 12l-8.2 2.8L12 23l-2.8-8.2L1 12l8.2-2.8Z" />
  </svg>
);

export const Burst: React.FC<P> = ({ className }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" stroke="none">
    <path d="M12 1l1.5 9.5L23 12l-9.5 1.5L12 23l-1.5-9.5L1 12l9.5-1.5Z" />
  </svg>
);
