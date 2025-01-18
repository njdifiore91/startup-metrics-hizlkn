import React from 'react'; // v18.2.0
import styled from '@emotion/styled'; // v11.11.0
import { theme } from '../../config/theme';

// Props interface with comprehensive documentation
interface LoadingSpinnerProps {
  /** Width and height of the spinner in pixels. Defaults to 24px */
  size?: string;
  /** Color of the spinner. Defaults to theme primary color */
  color?: string;
  /** Border thickness of the spinner. Defaults to 2px */
  thickness?: string;
  /** Accessibility label for screen readers */
  ariaLabel?: string;
}

// Keyframes for spinner animation
const spinKeyframes = `
  @keyframes spin {
    0% {
      transform: rotate(0deg);
    }
    100% {
      transform: rotate(360deg);
    }
  }
`;

// Styled component with enhanced accessibility and animation features
const SpinnerContainer = styled.div<LoadingSpinnerProps>`
  ${spinKeyframes}
  display: inline-block;
  position: relative;
  width: ${props => props.size};
  height: ${props => props.size};
  border: ${props => `${props.thickness} solid ${props.color}33`};
  border-top-color: ${props => props.color};
  border-radius: 50%;
  transform: translateZ(0); /* Hardware acceleration */
  will-change: transform; /* Performance optimization */
  animation: spin ${theme.transitions.normal} linear infinite;

  /* Respect user's motion preferences */
  @media (prefers-reduced-motion: reduce) {
    animation-duration: 2s;
  }

  /* Ensure proper visibility in high contrast mode */
  @media (forced-colors: active) {
    border-color: CanvasText;
    border-top-color: Highlight;
  }
`;

/**
 * A reusable loading spinner component with accessibility features
 * and performance optimizations.
 */
const LoadingSpinner: React.FC<LoadingSpinnerProps> = React.memo(({
  size = '24px',
  color = theme.colors.primary,
  thickness = '2px',
  ariaLabel = 'Loading in progress'
}) => {
  return (
    <SpinnerContainer
      size={size}
      color={color}
      thickness={thickness}
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuetext="Loading"
      aria-busy="true"
      data-testid="loading-spinner"
    />
  );
});

// Display name for debugging purposes
LoadingSpinner.displayName = 'LoadingSpinner';

export default LoadingSpinner;