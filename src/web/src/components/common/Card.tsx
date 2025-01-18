import React from 'react';
import classNames from 'classnames';
import '../../styles/theme.css';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  elevation?: 'none' | 'low' | 'medium' | 'high';
  interactive?: boolean;
  testId?: string;
  ariaLabel?: string;
  role?: string;
}

const Card: React.FC<CardProps> = React.memo(({
  children,
  className,
  onClick,
  elevation = 'low',
  interactive = false,
  testId,
  ariaLabel,
  role = 'region',
}) => {
  const elevationStyles = {
    none: 'none',
    low: 'var(--shadow-sm)',
    medium: 'var(--shadow-md)',
    high: 'var(--shadow-lg)',
  };

  const cardClasses = classNames(
    'card',
    className,
    {
      'card--interactive': interactive,
    }
  );

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (interactive && onClick && (event.key === 'Enter' || event.key === 'Space')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <div
      className={cardClasses}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={role}
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : undefined}
      data-testid={testId}
      style={{
        backgroundColor: 'var(--color-background)',
        borderRadius: 'var(--border-radius-md)',
        padding: 'var(--card-padding)',
        boxShadow: elevationStyles[elevation],
        transition: 'all var(--transition-fast)',
        outline: 'none',
        cursor: interactive ? 'pointer' : 'default',
        position: 'relative',
        ...interactive && {
          '&:hover': {
            transform: 'translateY(-2px)',
            boxShadow: elevationStyles[elevation === 'high' ? 'high' : 'medium'],
          },
          '&:focus-visible': {
            outline: `var(--focus-ring-width) solid var(--focus-ring-color)`,
            outlineOffset: 'var(--focus-ring-offset)',
          },
          '&:active': {
            transform: 'translateY(0)',
          },
        },
      }}
    >
      {children}
    </div>
  );
});

Card.displayName = 'Card';

export type { CardProps };
export { Card };