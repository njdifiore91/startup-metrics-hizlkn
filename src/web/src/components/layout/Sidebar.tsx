/**
 * Enhanced Sidebar Component for Startup Metrics Benchmarking Platform
 * Implements responsive layout, accessibility, RTL support, and role-based access control
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Drawer, IconButton, useMediaQuery, Box } from '@mui/material';
import { Theme, useTheme } from '@mui/material/styles';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Navigation } from './Navigation';
import { useAuth } from '../../hooks/useAuth';
import { UI_CONSTANTS } from '../../config/constants';
import styled from '@emotion/styled';

// Constants
const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 64;
const TRANSITION_DURATION = 225;
const KEYBOARD_SHORTCUTS = {
  TOGGLE: 'mod+b',
} as const;

// Interfaces
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onError?: (error: Error) => void;
  className?: string;
  ariaLabel?: string;
  isMobile?: boolean;
}

const StyledDrawer = styled(Drawer)`
  width: var(--spacing-xxl);
  flex-shrink: 0;
  white-space: nowrap;

  & .MuiDrawer-paper {
    width: var(--spacing-xxl);
    box-sizing: border-box;
    background-color: var(--color-primary);
    color: var(--color-surface);
    transition: var(--transition-fast);
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: var(--spacing-sm);
  min-height: 64px;
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: inherit;
  border-bottom: 1px solid var(--color-surface);
`;

const ToggleButton = styled.button`
  width: var(--spacing-lg);
  height: var(--spacing-lg);
  margin: 0 var(--spacing-xs);
  border: none;
  border-radius: 50%;
  background-color: var(--color-surface);
  color: var(--color-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: var(--transition-fast);

  &:hover {
    background-color: var(--color-background);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
`;

/**
 * Enhanced Sidebar component with accessibility and performance optimizations
 */
export const Sidebar: React.FC<SidebarProps> = React.memo(
  ({
    isOpen,
    onToggle,
    onError,
    className,
    ariaLabel = 'Main Sidebar Navigation',
    isMobile = false,
  }) => {
    const theme = useTheme<Theme>();
    const { validateSession, isAuthenticated } = useAuth();
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyPress = async (event: KeyboardEvent) => {
        const isMod = event.metaKey || event.ctrlKey;
        if (isMod && event.key === 'b') {
          event.preventDefault();
          try {
            const isValid = await validateSession();
            if (isValid) {
              onToggle();
            }
          } catch (error) {
            onError?.(error as Error);
          }
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onToggle, validateSession, onError]);

    // Handle focus management
    useEffect(() => {
      if (!isOpen && document.activeElement instanceof HTMLElement) {
        if (sidebarRef.current?.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }
    }, [isOpen]);

    // Memoized toggle handler
    const handleToggle = useCallback(async () => {
      try {
        const isValid = await validateSession();
        if (isValid) {
          onToggle();
        }
      } catch (error) {
        onError?.(error as Error);
      }
    }, [onToggle, validateSession, onError]);

    if (!isAuthenticated) {
      return null;
    }

    return (
      <StyledDrawer
        ref={sidebarRef}
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isOpen}
        className={className}
        aria-label={ariaLabel}
        role="navigation"
        onClose={isMobile ? handleToggle : undefined}
        ModalProps={{
          keepMounted: true, // Better mobile performance
        }}
        PaperProps={{
          sx: {
            width: isOpen ? `${DRAWER_WIDTH}px` : `${COLLAPSED_WIDTH}px`,
            overflowX: 'hidden',
            backgroundColor: theme.palette.primary.main,
            color: theme.palette.primary.contrastText,
            transition: `width ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.6, 1)`,
            borderRight: `1px solid ${theme.palette.divider}`,
            [`@media (max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE})`]: {
              width: isOpen ? `${DRAWER_WIDTH}px` : '0px',
            },
          },
        }}
        sx={{
          width: isOpen ? `${DRAWER_WIDTH}px` : `${COLLAPSED_WIDTH}px`,
          flexShrink: 0,
          whiteSpace: 'nowrap',
          transition: `width ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.6, 1)`,
          direction: theme.direction,
        }}
      >
        <DrawerHeader>
          <ToggleButton
            onClick={handleToggle}
            aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            aria-expanded={isOpen}
            aria-controls="sidebar-content"
          >
            {document.dir === 'rtl' ? (
              isOpen ? (
                <ChevronRight />
              ) : (
                <ChevronLeft />
              )
            ) : isOpen ? (
              <ChevronLeft />
            ) : (
              <ChevronRight />
            )}
          </ToggleButton>
        </DrawerHeader>

        <div id="sidebar-content" role="region" aria-label={ariaLabel}>
          <Navigation
            isCollapsed={!isOpen}
            theme={theme}
            ariaLabel={ariaLabel}
            onNavigationError={onError}
          />
        </div>
      </StyledDrawer>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export default Sidebar;
