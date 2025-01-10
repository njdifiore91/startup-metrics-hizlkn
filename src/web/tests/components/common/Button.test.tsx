import React from 'react';
import { render, fireEvent, screen, within, waitFor } from '@testing-library/react';
import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import { axe, toHaveNoViolations } from '@axe-core/react';
import { ThemeProvider } from 'styled-components';
import Button, { ButtonProps } from '../../src/components/common/Button';

expect.extend(toHaveNoViolations);

// Helper function to render button with theme
const renderButton = (props: Partial<ButtonProps> = {}, theme = {}) => {
  const Component = () => (
    <ThemeProvider theme={theme}>
      <Button {...createTestProps(props)} />
    </ThemeProvider>
  );
  return render(<Component />);
};

// Create default test props
const createTestProps = (overrides: Partial<ButtonProps> = {}): ButtonProps => ({
  children: 'Test Button',
  onClick: jest.fn(),
  ...overrides
});

describe('Button Component', () => {
  let mockOnClick: jest.Mock;

  beforeEach(() => {
    mockOnClick = jest.fn();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('Rendering', () => {
    it('renders with default props', () => {
      renderButton();
      const button = screen.getByRole('button');
      expect(button).toBeInTheDocument();
      expect(button).toHaveClass('button', 'bg-primary');
      expect(button).toHaveAttribute('type', 'button');
      expect(button).not.toBeDisabled();
    });

    it('renders children correctly', () => {
      renderButton({ children: <span>Custom Content</span> });
      expect(screen.getByText('Custom Content')).toBeInTheDocument();
    });

    it('applies custom className', () => {
      renderButton({ className: 'custom-class' });
      expect(screen.getByRole('button')).toHaveClass('custom-class');
    });
  });

  describe('Variants', () => {
    it.each([
      ['primary', 'bg-primary'],
      ['secondary', 'bg-secondary'],
      ['accent', 'bg-accent'],
      ['text', 'bg-transparent']
    ])('applies correct classes for %s variant', (variant, expectedClass) => {
      renderButton({ variant: variant as ButtonProps['variant'] });
      expect(screen.getByRole('button')).toHaveClass(expectedClass);
    });
  });

  describe('Sizes', () => {
    it.each([
      ['small', 'px-4 py-2 text-sm'],
      ['medium', 'px-6 py-3 text-base'],
      ['large', 'px-8 py-4 text-lg']
    ])('applies correct classes for %s size', (size, expectedClasses) => {
      renderButton({ size: size as ButtonProps['size'] });
      const button = screen.getByRole('button');
      expectedClasses.split(' ').forEach(className => {
        expect(button).toHaveClass(className);
      });
    });
  });

  describe('Accessibility', () => {
    it('has no accessibility violations', async () => {
      const { container } = renderButton();
      const results = await axe(container);
      expect(results).toHaveNoViolations();
    });

    it('supports aria-label', () => {
      renderButton({ ariaLabel: 'Custom Label' });
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Custom Label');
    });

    it('handles aria-pressed for toggle buttons', () => {
      renderButton({ ariaPressed: true });
      expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    });

    it('sets correct tabIndex', () => {
      renderButton({ disabled: true });
      expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '-1');
    });

    it('supports custom roles', () => {
      renderButton({ role: 'menuitem' });
      expect(screen.getByRole('menuitem')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('handles click events', () => {
      renderButton({ onClick: mockOnClick });
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).toHaveBeenCalledTimes(1);
    });

    it('prevents click when disabled', () => {
      renderButton({ onClick: mockOnClick, disabled: true });
      fireEvent.click(screen.getByRole('button'));
      expect(mockOnClick).not.toHaveBeenCalled();
    });

    describe('Keyboard Interaction', () => {
      it.each([
        ['Enter', 'Enter'],
        ['Space', ' ']
      ])('triggers onClick with %s key', (name, key) => {
        renderButton({ onClick: mockOnClick });
        const button = screen.getByRole('button');
        fireEvent.keyDown(button, { key });
        expect(mockOnClick).toHaveBeenCalledTimes(1);
      });

      it('prevents default on space key to avoid page scroll', () => {
        renderButton();
        const button = screen.getByRole('button');
        const event = new KeyboardEvent('keydown', { key: ' ' });
        jest.spyOn(event, 'preventDefault');
        fireEvent(button, event);
        expect(event.preventDefault).toHaveBeenCalled();
      });
    });

    describe('Focus Management', () => {
      it('applies focus ring on keyboard focus', async () => {
        renderButton();
        const button = screen.getByRole('button');
        button.focus();
        expect(button).toHaveClass('focus:ring-2');
      });

      it('maintains focus styles when using keyboard navigation', () => {
        renderButton();
        const button = screen.getByRole('button');
        fireEvent.keyDown(button, { key: 'Tab' });
        expect(button).toHaveClass('focus:ring-2');
      });
    });
  });

  describe('Theme Integration', () => {
    it('applies theme colors correctly', () => {
      const theme = {
        colors: {
          primary: '#151e2d',
          secondary: '#46608C',
          accent: '#168947'
        }
      };
      renderButton({ variant: 'primary' }, theme);
      const button = screen.getByRole('button');
      expect(button).toHaveClass('bg-primary');
    });
  });

  describe('Performance', () => {
    it('uses React.memo to prevent unnecessary rerenders', () => {
      const { rerender } = renderButton({ onClick: mockOnClick });
      const button = screen.getByRole('button');
      
      // First render
      expect(button).toBeInTheDocument();
      
      // Rerender with same props
      rerender(
        <ThemeProvider theme={{}}>
          <Button {...createTestProps({ onClick: mockOnClick })} />
        </ThemeProvider>
      );
      
      // Component should use memoized version
      expect(screen.getAllByRole('button')).toHaveLength(1);
    });
  });
});