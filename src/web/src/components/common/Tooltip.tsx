import React, { useRef, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import '../../styles/theme.css';
import '../../styles/animations.css';

// Types and Interfaces
type TooltipPosition = 'top' | 'right' | 'bottom' | 'left';

interface TooltipProps {
  content: React.ReactNode;
  position?: TooltipPosition;
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
  tooltipPosition: TooltipPosition;
  isVisible: boolean;
  style?: React.CSSProperties;
}

// Styled Components
const TooltipContainer = styled.div.attrs<TooltipContainerProps>(
  (props: TooltipContainerProps) => ({
    style: props.style,
    'data-testid': 'tooltip-container',
  })
)<TooltipContainerProps>`
  position: fixed;
  background-color: var(--color-primary);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: var(--border-radius-sm);
  font-size: var(--font-size-sm);
  max-width: 300px;
  z-index: var(--z-index-tooltip);
  pointer-events: none;
  opacity: ${({ isVisible }: TooltipContainerProps) => (isVisible ? 1 : 0)};
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
  position: TooltipPosition,
  offset: number
): Position => {
  let top = '0';
  let left = '0';

  switch (position) {
    case 'top':
      top = `${triggerRect.top - tooltipRect.height - offset}px`;
      left = `${triggerRect.left + (triggerRect.width - tooltipRect.width) / 2}px`;
      break;
    case 'right':
      top = `${triggerRect.top + (triggerRect.height - tooltipRect.height) / 2}px`;
      left = `${triggerRect.right + offset}px`;
      break;
    case 'bottom':
      top = `${triggerRect.bottom + offset}px`;
      left = `${triggerRect.left + (triggerRect.width - tooltipRect.width) / 2}px`;
      break;
    case 'left':
      top = `${triggerRect.top + (triggerRect.height - tooltipRect.height) / 2}px`;
      left = `${triggerRect.left - tooltipRect.width - offset}px`;
      break;
  }

  return { top, left };
};

const useTooltipPosition = (
  triggerRef: React.RefObject<HTMLDivElement>,
  tooltipRef: React.RefObject<HTMLDivElement>,
  position: TooltipPosition,
  offset: number
): Position | null => {
  const [tooltipPosition, setTooltipPosition] = useState<Position | null>(null);

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return null;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const newPosition = getTooltipPosition(triggerRect, tooltipRect, position, offset);

    setTooltipPosition(newPosition);
    return newPosition;
  }, [position, offset]);

  useEffect(() => {
    const handleScroll = (): void => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScroll, true);
    window.addEventListener('resize', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleScroll);
    };
  }, [updatePosition]);

  return tooltipPosition;
};

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
  const timeoutRef = useRef<number>();

  const tooltipPosition = useTooltipPosition(triggerRef, tooltipRef, position, offset);

  const showTooltip = useCallback(() => {
    if (disabled) return;
    clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsVisible(true);
      onShow?.();
    }, delay);
  }, [delay, disabled, onShow]);

  const hideTooltip = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setIsVisible(false);
    onHide?.();
  }, [onHide]);

  useEffect(() => {
    return () => {
      clearTimeout(timeoutRef.current);
    };
  }, []);

  if (disabled) {
    return <>{children}</>;
  }

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
      {isVisible && tooltipPosition && (
        <TooltipContainer
          ref={tooltipRef}
          tooltipPosition={position}
          isVisible={isVisible}
          style={{
            top: tooltipPosition.top,
            left: tooltipPosition.left,
          }}
          role="tooltip"
        >
          {content}
        </TooltipContainer>
      )}
    </TooltipTrigger>
  );
};

export default Tooltip;
