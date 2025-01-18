import React, { useMemo, useCallback } from 'react';
import '../../styles/theme.css';

// Button Props Interface
interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'accent' | 'text';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel?: string;
  ariaPressed?: boolean;
  role?: string;
  tabIndex?: number;
}

// Utility function to generate button classes
type ButtonStyleProps = Omit<ButtonProps, 'children' | 'onClick' | 'type' | 'ariaLabel' | 'ariaPressed' | 'role' | 'tabIndex'>;

const getButtonClasses = (props: ButtonStyleProps): string => {
  const {
    variant = 'primary',
    size = 'medium',
    disabled,
    className
  } = props;

  const baseClasses = [
    'button',
    'inline-flex',
    'items-center',
    'justify-center',
    'font-medium',
    'transition-all',
    'duration-200',
    'border-none',
    'outline-none',
    'focus:ring-2',
    'focus:ring-offset-2',
    'focus:ring-primary-light'
  ];

  // Variant classes
  const variantClasses = {
    primary: 'bg-primary text-white hover:brightness-90',
    secondary: 'bg-secondary text-white hover:brightness-90',
    accent: 'bg-accent text-white hover:brightness-90',
    text: 'bg-transparent text-text hover:bg-primary-light'
  };

  // Size classes
  const sizeClasses = {
    small: 'px-4 py-2 text-sm',
    medium: 'px-6 py-3 text-base',
    large: 'px-8 py-4 text-lg'
  };

  // State classes
  const stateClasses = [
    disabled && 'opacity-60 cursor-not-allowed',
    !disabled && 'cursor-pointer active:transform active:translate-y-px'
  ];

  return [
    ...baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    ...stateClasses,
    className
  ]
    .filter(Boolean)
    .join(' ');
};

// Keyboard interaction handler
const handleKeyboardInteraction = (
  event: React.KeyboardEvent<HTMLButtonElement>,
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    onClick?.(event as unknown as React.MouseEvent<HTMLButtonElement>);
  }
};

// Button Component
export const Button: React.FC<ButtonProps> = React.memo(({
  children,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  type = 'button',
  className,
  onClick,
  ariaLabel,
  ariaPressed,
  role = 'button',
  tabIndex,
  ...props
}) => {
  // Memoize class names for performance
  const buttonClasses = useMemo(
    () => getButtonClasses({ variant, size, disabled, className }),
    [variant, size, disabled, className]
  );

  // Memoize click handler
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      if (!disabled && onClick) {
        onClick(event);
      }
    },
    [disabled, onClick]
  );

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={disabled}
      onClick={handleClick}
      onKeyDown={(e) => handleKeyboardInteraction(e, onClick)}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      aria-disabled={disabled}
      role={role}
      tabIndex={tabIndex ?? (disabled ? -1 : 0)}
      {...props}
    >
      {children}
    </button>
  );
});

// Display name for debugging
Button.displayName = 'Button';

// Default export
export default Button;

// Type export
export type { ButtonProps };