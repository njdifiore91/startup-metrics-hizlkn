import React, { useEffect, useCallback, useMemo, useRef, memo } from 'react';
import ReactDOM from 'react-dom';
import FocusTrap from 'focus-trap-react';
import { Button } from './Button.js';
import '../../styles/theme.css';

// Animation duration in milliseconds
const ANIMATION_DURATION = 200;
const Z_INDEX_MODAL = 1000;

// Get modal root element
const modalRoot = document.getElementById('modal-root') as HTMLElement;

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  showCloseButton?: boolean;
  className?: string;
  testId?: string;
  ariaLabel?: string;
  ariaDescribedBy?: string;
  initialFocusRef?: React.RefObject<HTMLElement>;
  onAnimationComplete?: () => void;
}

// Custom hook for modal effects
const useModalEffect = (
  isOpen: boolean,
  onClose: () => void,
  closeOnEscape: boolean = true
) => {
  useEffect(() => {
    if (isOpen) {
      // Lock body scroll
      document.body.style.overflow = 'hidden';
      
      // Store original focus element
      const originalFocus = document.activeElement as HTMLElement;

      // Handle escape key
      const handleEscape = (event: KeyboardEvent) => {
        if (closeOnEscape && event.key === 'Escape') {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);

      return () => {
        // Cleanup
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscape);
        originalFocus?.focus();
      };
    }
  }, [isOpen, onClose, closeOnEscape]);
};

// Custom hook for animation state
const useAnimationState = (isOpen: boolean) => {
  const [isAnimating, setIsAnimating] = React.useState(false);
  const [shouldRender, setShouldRender] = React.useState(false);

  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setIsAnimating(true);
      const timer = setTimeout(() => setIsAnimating(false), ANIMATION_DURATION);
      return () => clearTimeout(timer);
    } else {
      setIsAnimating(true);
      const timer = setTimeout(() => {
        setIsAnimating(false);
        setShouldRender(false);
      }, ANIMATION_DURATION);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const animationClass = useMemo(() => {
    if (!isAnimating) return '';
    return isOpen ? 'modal-enter' : 'modal-exit';
  }, [isOpen, isAnimating]);

  return { shouldRender, animationClass };
};

export const Modal: React.FC<ModalProps> = memo(({
  isOpen,
  onClose,
  title,
  children,
  size = 'medium',
  closeOnBackdropClick = true,
  closeOnEscape = true,
  showCloseButton = true,
  className = '',
  testId = 'modal',
  ariaLabel,
  ariaDescribedBy,
  initialFocusRef,
  onAnimationComplete
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const { shouldRender, animationClass } = useAnimationState(isOpen);
  
  // Setup modal effects
  useModalEffect(isOpen, onClose, closeOnEscape);

  // Handle backdrop click
  const handleBackdropClick = useCallback((event: React.MouseEvent) => {
    if (closeOnBackdropClick && event.target === event.currentTarget) {
      onClose();
    }
  }, [closeOnBackdropClick, onClose]);

  // Handle animation end
  const handleAnimationEnd = useCallback(() => {
    if (!isOpen) {
      onAnimationComplete?.();
    }
  }, [isOpen, onAnimationComplete]);

  if (!shouldRender) return null;

  const modalContent = (
    <div
      className="modal-backdrop"
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: Z_INDEX_MODAL
      }}
    >
      <FocusTrap
        focusTrapOptions={{
          initialFocus: initialFocusRef?.current || undefined,
          onDeactivate: onClose,
          returnFocusOnDeactivate: true,
          fallbackFocus: modalRef.current || undefined
        }}
      >
        <div
          ref={modalRef}
          role="dialog"
          aria-modal="true"
          aria-label={ariaLabel || title}
          aria-describedby={ariaDescribedBy}
          className={`modal ${size} ${animationClass} ${className}`}
          data-testid={testId}
          style={{
            backgroundColor: 'var(--color-background)',
            borderRadius: 'var(--border-radius-lg)',
            boxShadow: 'var(--shadow-xl)',
            maxWidth: size === 'small' ? '400px' : size === 'medium' ? '600px' : '800px',
            width: '100%',
            maxHeight: '90vh',
            margin: 'var(--spacing-md)',
            overflow: 'auto',
            position: 'relative'
          }}
          onAnimationEnd={handleAnimationEnd}
        >
          <header
            className="modal-header"
            style={{
              padding: 'var(--spacing-md) var(--spacing-lg)',
              borderBottom: '1px solid var(--border-color-light)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-bold)'
              }}
            >
              {title}
            </h2>
            {showCloseButton && (
              <Button
                variant="text"
                size="small"
                onClick={onClose}
                ariaLabel="Close modal"
              >
                ✕
              </Button>
            )}
          </header>
          <div
            className="modal-content"
            style={{
              padding: 'var(--spacing-lg)'
            }}
          >
            {children}
          </div>
        </div>
      </FocusTrap>
    </div>
  );

  return ReactDOM.createPortal(modalContent, modalRoot);
});

Modal.displayName = 'Modal';

export type { ModalProps };
export default Modal;