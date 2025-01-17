import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import '../../styles/theme.css';
import '../../styles/animations.css';

// Types and Interfaces
interface TooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'right' | 'bottom' | 'left';
  children: React.ReactNode;
  className?: string;
  delay?: number;
  disabled?: boolean;
  offset?: number;
  onShow?: () => void;
  onHide?: () => void;
}

interface Position {
  top: string;
  left: string;
}

interface TooltipContainerProps {
  position: string;
  isVisible: boolean;
}

// Styled Components
const TooltipContainer = styled.div<TooltipContainerProps>`
  position: fixed;
  background-color: var(--color-primary);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  max-width: 300px;
  z-index: var(--z-index-tooltip);
  pointer-events: none;
  opacity: ${({ isVisible }) => (isVisible ? 1 : 0)};
  transition: opacity var(--transition-fast) ease-in-out;
  box-shadow: var(--shadow-md);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const TooltipTrigger = styled.div`
  display: inline-block;
  position: relative;
`;

// Helper Functions
const getTooltipPosition = (
  triggerRect: DOMRect,
  tooltipRect: DOMRect,
  position: string,
  offset: number
): Position => {
  const spacing = offset || 8;
  let top = 0;
  let left = 0;

  switch (position) {
    case 'top':
      top = triggerRect.top - tooltipRect.height - spacing;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'right':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.right + spacing;
      break;
    case 'bottom':
      top = triggerRect.bottom + spacing;
      left = triggerRect.left + (triggerRect.width - tooltipRect.width) / 2;
      break;
    case 'left':
      top = triggerRect.top + (triggerRect.height - tooltipRect.height) / 2;
      left = triggerRect.left - tooltipRect.width - spacing;
      break;
  }

  // Viewport boundary checks
  const viewport = {
    width: window.innerWidth,
    height: window.innerHeight,
  };

  if (left < 0) left = spacing;
  if (left + tooltipRect.width > viewport.width) {
    left = viewport.width - tooltipRect.width - spacing;
  }
  if (top < 0) top = spacing;
  if (top + tooltipRect.height > viewport.height) {
    top = viewport.height - tooltipRect.height - spacing;
  }

  return {
    top: `${Math.round(top)}px`,
    left: `${Math.round(left)}px`,
  };
};

// Custom Hook for Position Management
const useTooltipPosition = (
  triggerRef: React.RefObject<HTMLDivElement>,
  tooltipRef: React.RefObject<HTMLDivElement>,
  position: string,
  offset: number
) => {
  const [tooltipPosition, setTooltipPosition] = useState<Position>({ top: '0', left: '0' });

  const updatePosition = useCallback(() => {
    if (triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipRect = tooltipRef.current.getBoundingClientRect();
      const newPosition = getTooltipPosition(triggerRect, tooltipRect, position, offset);
      setTooltipPosition(newPosition);
    }
  }, [triggerRef, tooltipRef, position, offset]);

  useEffect(() => {
    updatePosition();

    const resizeObserver = new ResizeObserver(updatePosition);
    const scrollHandler = () => {
      requestAnimationFrame(updatePosition);
    };

    if (triggerRef.current) {
      resizeObserver.observe(triggerRef.current);
    }

    window.addEventListener('scroll', scrollHandler, true);
    window.addEventListener('resize', updatePosition);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scrollHandler, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [updatePosition]);

  return tooltipPosition;
};

// Main Component
export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'top',
  children,
  className,
  delay = 200,
  disabled = false,
  offset = 8,
  onShow,
  onHide,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const tooltipPosition = useTooltipPosition(triggerRef, tooltipRef, position, offset);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    timeoutRef.current = setTimeout(() => {
      setIsVisible(true);
      onShow?.();
    }, delay);
  }, [disabled, delay, onShow]);

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
    onHide?.();
  }, [onHide]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return (
    <TooltipTrigger
      ref={triggerRef}
      className={className}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {isVisible && (
        <TooltipContainer
          ref={tooltipRef}
          position={position}
          isVisible={isVisible}
          style={tooltipPosition}
          role="tooltip"
          aria-live="polite"
        >
          {content}
        </TooltipContainer>
      )}
    </TooltipTrigger>
  );
};

export default Tooltip;