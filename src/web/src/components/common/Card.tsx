import React from 'react'; // ^18.2.0
import classNames from 'classnames'; // ^2.3.2
import styled from '@emotion/styled';
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

interface StyledCardProps {
  elevation: 'none' | 'low' | 'medium' | 'high';
  interactive: boolean;
}

const StyledCard = styled.div<StyledCardProps>`
  background-color: var(--color-background);
  border-radius: var(--border-radius-md);
  padding: var(--card-padding);
  box-shadow: ${({ elevation }) =>
    elevation === 'none'
      ? 'none'
      : elevation === 'low'
      ? 'var(--shadow-sm)'
      : elevation === 'medium'
      ? 'var(--shadow-md)'
      : 'var(--shadow-lg)'};
  transition: all var(--transition-fast);
  outline: none;
  cursor: ${({ interactive }) => (interactive ? 'pointer' : 'default')};
  position: relative;

  ${({ interactive }) =>
    interactive &&
    `
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }

    &:focus-visible {
      outline: var(--focus-ring-width) solid var(--focus-ring-color);
      outline-offset: var(--focus-ring-offset);
    }

    &:active {
      transform: translateY(0);
    }
  `}

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

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
  // Combine class names
  const cardClasses = classNames(
    'card',
    className,
    {
      'card--interactive': interactive,
    }
  );

  // Handle keyboard interaction for interactive cards
  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (interactive && onClick && (event.key === 'Enter' || event.key === 'Space')) {
      event.preventDefault();
      onClick();
    }
  };

  return (
    <StyledCard
      className={cardClasses}
      onClick={interactive ? onClick : undefined}
      onKeyDown={handleKeyDown}
      role={role}
      aria-label={ariaLabel}
      tabIndex={interactive ? 0 : undefined}
      data-testid={testId}
      elevation={elevation}
      interactive={interactive}
    >
      {children}
    </StyledCard>
  );
});

// Display name for debugging
Card.displayName = 'Card';

export type { CardProps };
export { Card };