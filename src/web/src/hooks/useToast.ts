// react v18.2.0
import { useState, useEffect, useCallback } from 'react';

// Type Definitions
export enum ToastType {
  SUCCESS = 'success',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info'
}

export enum ToastPosition {
  TOP_RIGHT = 'top-right',
  TOP_LEFT = 'top-left',
  BOTTOM_RIGHT = 'bottom-right',
  BOTTOM_LEFT = 'bottom-left'
}

export interface ToastTheme {
  backgroundColor: string;
  textColor: string;
  iconColor: string;
  progressBarColor: string;
}

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  position: ToastPosition;
  duration: number;
  zIndex: number;
  onDismiss: (id: string) => void;
  onClick?: () => void;
  isPaused: boolean;
  theme?: ToastTheme;
}

// Constants
const DEFAULT_DURATION = 5000; // 5 seconds
const MAX_TOASTS = 5;
const BASE_Z_INDEX = 1000;

interface UseToastReturn {
  toasts: Toast[];
  showToast: (
    message: string,
    type?: ToastType,
    position?: ToastPosition,
    duration?: number,
    theme?: ToastTheme,
    onClick?: () => void
  ) => string;
  hideToast: (id: string) => void;
  pauseToast: (id: string) => void;
  resumeToast: (id: string) => void;
  clearAllToasts: () => void;
}

// Create a singleton instance to manage toasts globally
let toastInstance: UseToastReturn | null = null;

export const useToast = (): UseToastReturn => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [timers, setTimers] = useState<{ [key: string]: NodeJS.Timeout }>({});

  // Generate unique ID for toast
  const generateId = (): string => {
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  };

  // Calculate z-index for new toast
  const calculateZIndex = (position: ToastPosition): number => {
    const positionToasts = toasts.filter(t => t.position === position);
    return BASE_Z_INDEX + positionToasts.length;
  };

  // Create timer for toast auto-dismissal
  const createTimer = useCallback((id: string, duration: number) => {
    const timer = setTimeout(() => {
      hideToast(id);
    }, duration);

    setTimers(prev => ({ ...prev, [id]: timer }));
    return timer;
  }, []);

  // Clear timer for toast
  const clearTimer = useCallback((id: string) => {
    if (timers[id]) {
      clearTimeout(timers[id]);
      setTimers(prev => {
        const newTimers = { ...prev };
        delete newTimers[id];
        return newTimers;
      });
    }
  }, [timers]);

  // Show new toast
  const showToast = useCallback((
    message: string,
    type: ToastType = ToastType.INFO,
    position: ToastPosition = ToastPosition.TOP_RIGHT,
    duration: number = DEFAULT_DURATION,
    theme?: ToastTheme,
    onClick?: () => void
  ): string => {
    const id = generateId();
    const zIndex = calculateZIndex(position);

    const newToast: Toast = {
      id,
      message,
      type,
      position,
      duration,
      zIndex,
      onDismiss: hideToast,
      onClick,
      isPaused: false,
      theme
    };

    setToasts(prev => {
      const updatedToasts = [...prev, newToast];
      if (updatedToasts.length > MAX_TOASTS) {
        const [, ...rest] = updatedToasts;
        return rest;
      }
      return updatedToasts;
    });

    if (duration > 0) {
      createTimer(id, duration);
    }

    // Add ARIA live region for accessibility
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.textContent = message;
    document.body.appendChild(liveRegion);

    // Clean up live region after announcement
    setTimeout(() => {
      document.body.removeChild(liveRegion);
    }, 1000);

    return id;
  }, [createTimer]);

  // Hide specific toast
  const hideToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, [clearTimer]);

  // Pause toast timer
  const pauseToast = useCallback((id: string) => {
    clearTimer(id);
    setToasts(prev =>
      prev.map(toast =>
        toast.id === id ? { ...toast, isPaused: true } : toast
      )
    );
  }, [clearTimer]);

  // Resume toast timer
  const resumeToast = useCallback((id: string) => {
    const toast = toasts.find(t => t.id === id);
    if (toast && toast.isPaused) {
      createTimer(id, toast.duration);
      setToasts(prev =>
        prev.map(t =>
          t.id === id ? { ...t, isPaused: false } : t
        )
      );
    }
  }, [toasts, createTimer]);

  // Clear all toasts
  const clearAllToasts = useCallback(() => {
    Object.keys(timers).forEach(clearTimer);
    setToasts([]);
  }, [clearTimer]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      Object.keys(timers).forEach(id => clearTimeout(timers[id]));
    };
  }, [timers]);

  // Handle touch gestures for mobile
  useEffect(() => {
    let touchStartX: number;
    let touchStartY: number;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!touchStartX || !touchStartY) return;

      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;

      // Swipe threshold
      if (Math.abs(deltaX) > 50) {
        const target = e.target as HTMLElement;
        const toastElement = target.closest('[data-toast-id]');
        if (toastElement) {
          const toastId = toastElement.getAttribute('data-toast-id');
          if (toastId) hideToast(toastId);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [hideToast]);

  const instance = {
    toasts,
    showToast,
    hideToast,
    pauseToast,
    resumeToast,
    clearAllToasts
  };

  // Store the instance for global access
  toastInstance = instance;

  return instance;
};

// Export individual functions that use the singleton instance
export const showToast = (
  message: string,
  type?: ToastType,
  position?: ToastPosition,
  duration?: number,
  theme?: ToastTheme,
  onClick?: () => void
): string => {
  if (!toastInstance) {
    throw new Error('Toast instance not initialized. Please use useToast hook first.');
  }
  return toastInstance.showToast(message, type, position, duration, theme, onClick);
};