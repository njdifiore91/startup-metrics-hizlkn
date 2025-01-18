import React, { useEffect, useCallback, useRef } from 'react';
import classNames from 'classnames';
import { useSwipeable } from 'react-swipeable';
import { ToastType, ToastPosition } from '../../hooks/useToast';
import { animations } from '../../styles/animations.css';
import ErrorBoundary from './ErrorBoundary';

// Props interfaces
interface ToastProps {
  id: string;
  message: string;
  type: ToastType;
  position: ToastPosition;
  onClose: (id: string) => void;
  autoClose?: number;
  theme?: 'light' | 'dark';
  rtl?: boolean;
  className?: string;
  testId?: string;
}

interface ToastContainerProps {
  toasts: ToastProps[];
  onClose: (id: string) => void;
  limit?: number;
  containerClassName?: string;
  theme?: 'light' | 'dark';
  rtl?: boolean;
}

// Toast component with accessibility and mobile support
const Toast: React.FC<ToastProps> = React.memo(({
  id,
  message,
  type,
  position,
  onClose,
  autoClose = 5000,
  theme = 'light',
  rtl = false,
  className,
  testId = 'toast'
}) => {
  const timerRef = useRef<NodeJS.Timeout>();
  const messageRef = useRef<HTMLDivElement>(null);

  // Handle auto-close timer
  useEffect(() => {
    if (autoClose > 0) {
      timerRef.current = setTimeout(() => {
        onClose(id);
      }, autoClose);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [id, autoClose, onClose]);

  // Handle mouse interactions
  const handleMouseEnter = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (autoClose > 0) {
      timerRef.current = setTimeout(() => {
        onClose(id);
      }, autoClose);
    }
  }, [id, autoClose, onClose]);

  // Handle swipe gestures for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => !rtl && onClose(id),
    onSwipedRight: () => rtl && onClose(id),
    preventScrollOnSwipe: true,
    trackMouse: true
  });

  // Compute toast classes
  const toastClasses = classNames(
    'toast',
    `toast--${type}`,
    `toast--${position}`,
    {
      'toast--rtl': rtl,
      'toast--light': theme === 'light',
      'toast--dark': theme === 'dark'
    },
    animations['fade-in'],
    animations['slide-in'],
    className
  );

  return (
    <div
      {...swipeHandlers}
      className={toastClasses}
      role="alert"
      aria-live="polite"
      aria-atomic="true"
      data-testid={testId}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={styles.toast}
    >
      <div className="toast__content" style={styles.content}>
        <div className="toast__icon" style={styles.icon}>
          {getToastIcon(type)}
        </div>
        <div 
          ref={messageRef}
          className="toast__message"
          style={styles.message}
        >
          {message}
        </div>
        <button
          className="toast__close"
          onClick={() => onClose(id)}
          aria-label="Close notification"
          style={styles.closeButton}
        >
          ×
        </button>
      </div>
      {autoClose > 0 && (
        <div 
          className="toast__progress" 
          style={{
            ...styles.progressBar,
            animationDuration: `${autoClose}ms`
          }}
        />
      )}
    </div>
  );
});

// Toast container component
export const ToastContainer: React.FC<ToastContainerProps> = ({
  toasts,
  onClose,
  limit = 3,
  containerClassName,
  theme = 'light',
  rtl = false
}) => {
  const containerClasses = classNames(
    'toast-container',
    containerClassName
  );

  // Group toasts by position
  const groupedToasts = toasts.reduce((acc, toast) => {
    if (!acc[toast.position]) {
      acc[toast.position] = [];
    }
    acc[toast.position].push(toast);
    return acc;
  }, {} as Record<ToastPosition, ToastProps[]>);

  return (
    <ErrorBoundary>
      {Object.entries(groupedToasts).map(([position, positionToasts]) => (
        <div
          key={position}
          className={containerClasses}
          style={{
            ...styles.container,
            ...getPositionStyles(position as ToastPosition)
          }}
          aria-label="Notifications"
          role="region"
        >
          {positionToasts
            .slice(-limit)
            .map(toast => (
              <Toast
                key={toast.id}
                {...toast}
                theme={theme}
                rtl={rtl}
                onClose={onClose}
              />
            ))}
        </div>
      ))}
    </ErrorBoundary>
  );
};

// Helper function to get toast icon
const getToastIcon = (type: ToastType): JSX.Element => {
  switch (type) {
    case ToastType.SUCCESS:
      return <span aria-hidden="true">✓</span>;
    case ToastType.ERROR:
      return <span aria-hidden="true">✕</span>;
    case ToastType.WARNING:
      return <span aria-hidden="true">⚠</span>;
    case ToastType.INFO:
      return <span aria-hidden="true">ℹ</span>;
  }
};

// Helper function to get position styles
const getPositionStyles = (position: ToastPosition): React.CSSProperties => {
  const baseStyles: React.CSSProperties = {
    position: 'fixed',
    zIndex: 'var(--z-index-toast)'
  };

  switch (position) {
    case ToastPosition.TOP_RIGHT:
      return { ...baseStyles, top: 20, right: 20 };
    case ToastPosition.TOP_LEFT:
      return { ...baseStyles, top: 20, left: 20 };
    case ToastPosition.BOTTOM_RIGHT:
      return { ...baseStyles, bottom: 20, right: 20 };
    case ToastPosition.BOTTOM_LEFT:
      return { ...baseStyles, bottom: 20, left: 20 };
  }
};

// Styles
const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 'var(--spacing-sm)'
  },
  toast: {
    backgroundColor: 'var(--color-background)',
    borderRadius: 'var(--border-radius-md)',
    boxShadow: 'var(--shadow-md)',
    minWidth: '300px',
    maxWidth: '500px',
    overflow: 'hidden'
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    padding: 'var(--spacing-md)',
    gap: 'var(--spacing-sm)'
  },
  icon: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px'
  },
  message: {
    flex: 1,
    fontSize: 'var(--font-size-sm)',
    lineHeight: 'var(--line-height-normal)',
    color: 'var(--color-text)'
  },
  closeButton: {
    background: 'none',
    border: 'none',
    padding: 'var(--spacing-xs)',
    cursor: 'pointer',
    fontSize: '20px',
    color: 'var(--color-text)',
    opacity: 0.7,
    transition: 'opacity var(--transition-fast)'
  },
  progressBar: {
    height: '3px',
    background: 'var(--color-accent)',
    animation: 'progress-bar linear forwards',
    transformOrigin: 'left'
  }
};

Toast.displayName = 'Toast';
ToastContainer.displayName = 'ToastContainer';

export default Toast;