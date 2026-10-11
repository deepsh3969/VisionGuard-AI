import type { ReactNode } from 'react';

export type BadgeTone = 'default' | 'accent' | 'success' | 'warning' | 'danger';

export function Badge({
  tone = 'default',
  mono = false,
  title,
  children,
}: {
  tone?: BadgeTone;
  mono?: boolean;
  title?: string;
  children: ReactNode;
}) {
  const classes = ['badge', tone !== 'default' ? tone : '', mono ? 'mono' : '']
    .filter(Boolean)
    .join(' ');
  return (
    <span className={classes} title={title}>
      {children}
    </span>
  );
}
