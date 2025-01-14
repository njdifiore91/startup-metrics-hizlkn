/**
 * Enhanced Sidebar Component for Startup Metrics Benchmarking Platform
 * Implements responsive layout, accessibility, RTL support, and role-based access control
 * @version 1.0.0
 */

import React, { useCallback, useEffect, useRef } from 'react';
import styled from '@emotion/styled';
import { Drawer, IconButton, useTheme, useMediaQuery, Theme } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { Navigation } from './Navigation.js';
import { useAuth } from '../../hooks/useAuth.js';
import { UI_CONSTANTS } from '../../config/constants.js';

// Constants
const DRAWER_WIDTH = parseInt(UI_CONSTANTS.SIDEBAR_WIDTH);
const COLLAPSED_WIDTH = 64;
const TRANSITION_DURATION = 225;

// Interfaces
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onError?: (error: Error) => void;
  className?: string;
  ariaLabel?: string;
}

// Styled Components
const StyledDrawer = styled(Drawer)<{ open: boolean; theme: Theme }>`
  width: ${props => props.open ? DRAWER_WIDTH : COLLAPSED_WIDTH}px;
  flex-shrink: 0;
  white-space: nowrap;
  background-color: ${props => props.theme.palette.primary.main};
  transition: width ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.6, 1);
  direction: ${props => props.theme.direction};

  & .MuiDrawer-paper {
    width: ${props => props.open ? DRAWER_WIDTH : COLLAPSED_WIDTH}px;
    overflow-x: hidden;
    background-color: ${props => props.theme.palette.primary.main};
    color: ${props => props.theme.palette.primary.contrastText};
    transition: width ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.6, 1);
    border-right: 1px solid ${props => props.theme.palette.divider};

    @media (max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE}) {
      width: ${props => props.open ? DRAWER_WIDTH : 0}px;
    }
  }
`;

const DrawerHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: ${props => props.theme.spacing(0, 1)};
  min-height: ${UI_CONSTANTS.HEADER_HEIGHT};
  position: sticky;
  top: 0;
  z-index: 1;
  background-color: inherit;
  border-bottom: 1px solid ${props => props.theme.palette.divider};
`;

const ToggleButton = styled(IconButton)`
  margin: ${props => props.theme.spacing(0, 0.5)};
  color: ${props => props.theme.palette.primary.contrastText};
  
  &:focus-visible {
    outline: 2px solid ${props => props.theme.palette.secondary.main};
    outline-offset: 2px;
  }
`;

/**
 * Enhanced Sidebar component with accessibility and performance optimizations
 */
export const Sidebar: React.FC<SidebarProps> = React.memo(({
  isOpen,
  onToggle,
  onError,
  className,
  ariaLabel = 'Main Sidebar Navigation'
}) => {
  const theme = useTheme();
  const { validateSession } = useAuth();
  const isMobile = useMediaQuery(`(max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE})`);
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

  return (
    <StyledDrawer
      ref={sidebarRef}
      variant={isMobile ? 'temporary' : 'permanent'}
      open={isOpen}
      theme={theme}
      className={className}
      aria-label={ariaLabel}
      role="navigation"
      onClose={isMobile ? handleToggle : undefined}
      ModalProps={{
        keepMounted: true // Better mobile performance
      }}
    >
      <DrawerHeader role="banner">
        <ToggleButton
          onClick={handleToggle}
          aria-label={isOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          aria-expanded={isOpen}
          aria-controls="sidebar-content"
          size="large"
        >
          {theme.direction === 'rtl' ? (
            isOpen ? <ChevronRight /> : <ChevronLeft />
          ) : (
            isOpen ? <ChevronLeft /> : <ChevronRight />
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
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;