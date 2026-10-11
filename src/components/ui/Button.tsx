import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'danger' | 'ghost';
  size?: 'default' | 'small';
  children: ReactNode;
}

export function Button({ variant = 'default', size = 'default', className, children, ...rest }: ButtonProps) {
  const classes = [
    'btn',
    variant === 'primary' ? 'primary' : '',
    variant === 'danger' ? 'danger' : '',
    variant === 'ghost' ? 'ghost' : '',
    size === 'small' ? 'small' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button type="button" className={classes} {...rest}>
      {children}
    </button>
  );
}
