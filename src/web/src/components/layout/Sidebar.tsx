/**
 * Enhanced Sidebar Component for Startup Metrics Benchmarking Platform
 * Implements responsive layout, accessibility, RTL support, and role-based access control
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import { Drawer, IconButton } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
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
}

const StyledDrawer = styled(Drawer)`
  width: ${DRAWER_WIDTH}px;
  flex-shrink: 0;
  white-space: nowrap;

  & .MuiDrawer-paper {
    width: ${DRAWER_WIDTH}px;
    box-sizing: border-box;
    background-color: var(--color-surface);
    color: var(--color-text);
    border-right: 1px solid var(--border-color-light);
    transition: width ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.6, 1);
    overflow-x: hidden;
  }

  &.collapsed {
    width: ${COLLAPSED_WIDTH}px;

    & .MuiDrawer-paper {
      width: ${COLLAPSED_WIDTH}px;
    }
  }

  @media (max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE}) {
    &.collapsed {
      width: 0;

      & .MuiDrawer-paper {
        width: 0;
      }
    }
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: var(--spacing-sm);
  min-height: 64px;
  border-bottom: 1px solid var(--border-color-light);
`;

const ToggleButton = styled(IconButton)`
  margin-right: var(--spacing-xs);
  color: var(--color-text);

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
  ({ isOpen, onToggle, onError, className, ariaLabel = 'Main Sidebar Navigation' }) => {
    const theme = useTheme();
    const { isAuthenticated } = useAuth();
    const isMobile = useMediaQuery(`(max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE})`);
    const sidebarRef = useRef<HTMLDivElement>(null);

    // Handle keyboard shortcuts
    useEffect(() => {
      const handleKeyPress = (event: KeyboardEvent) => {
        const isMod = event.metaKey || event.ctrlKey;
        if (isMod && event.key === 'b') {
          event.preventDefault();
          onToggle();
        }
      };

      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }, [onToggle]);

    // Handle focus management
    useEffect(() => {
      if (!isOpen && document.activeElement instanceof HTMLElement) {
        if (sidebarRef.current?.contains(document.activeElement)) {
          document.activeElement.blur();
        }
      }
    }, [isOpen]);

    if (!isAuthenticated) {
      return null;
    }

    return (
      <StyledDrawer
        ref={sidebarRef}
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isOpen}
        className={`${className} ${!isOpen ? 'collapsed' : ''}`}
        aria-label={ariaLabel}
        role="navigation"
        onClose={isMobile ? onToggle : undefined}
        ModalProps={{
          keepMounted: true,
        }}
      >
        <DrawerHeader>
          <ToggleButton
            onClick={onToggle}
            aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
            aria-expanded={isOpen}
            aria-controls="sidebar-content"
            size="small"
          >
            {isOpen ? <ChevronLeft /> : <ChevronRight />}
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
