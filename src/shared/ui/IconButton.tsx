import type { ButtonHTMLAttributes, ReactNode } from 'react';

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  size?: number;
  variant?: 'default' | 'danger' | 'plain';
  children: ReactNode;
}

/** Bouton carré contenant une icône. `label` sert d'infobulle et d'étiquette accessible. */
export function IconButton({ label, size = 26, variant = 'default', children, className = '', style, onClick, ...rest }: IconButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={`ui-icon-btn ${variant !== 'default' ? `ui-icon-btn--${variant}` : ''} ${className}`}
      style={{ width: size, height: size, ...style }}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.(e);
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
