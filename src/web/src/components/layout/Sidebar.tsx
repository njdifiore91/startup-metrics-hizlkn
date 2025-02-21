/**
 * Enhanced Sidebar Component for Startup Metrics Benchmarking Platform
 * Implements responsive layout, accessibility, RTL support, and role-based access control
 * @version 1.0.0
 */

import React, { useEffect, useRef } from 'react';
import { Drawer, IconButton, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { UI_CONSTANTS } from '../../config/constants';
import styled from '@emotion/styled';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import DashboardIcon from '@mui/icons-material/Dashboard';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import SettingsIcon from '@mui/icons-material/Settings';
import TimelineIcon from '@mui/icons-material/Timeline';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import BuildIcon from '@mui/icons-material/Build';
import HistoryIcon from '@mui/icons-material/History';
// Constants
const DRAWER_WIDTH = 240;
const COLLAPSED_WIDTH = 64;
const TRANSITION_DURATION = 225;

// Interfaces
interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
  onNavigate: (path: string) => void;
  onError: (error: Error) => void;
  className?: string;
  ariaLabel?: string;
}

const StyledDrawer = styled(Drawer)`
  width: ${DRAWER_WIDTH}px;
  flex-shrink: 0;
  white-space: nowrap;
  z-index: 1100;

  & .MuiDrawer-paper {
    width: ${DRAWER_WIDTH}px;
    box-sizing: border-box;
    background-color: var(--color-surface);
    color: var(--color-text);
    border-right: 1px solid var(--border-color-light);
    transition: width ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.6, 1);
    overflow-x: hidden;
    margin-top: var(--header-height);
    height: calc(100% - var(--header-height));
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
  min-height: 48px;
  border-bottom: 1px solid var(--border-color-light);
  background-color: var(--color-surface);
`;

const ToggleButton = styled(IconButton)`
  color: var(--color-text);
  width: 32px;
  height: 32px;
  border-radius: var(--border-radius-sm);
  transition: background-color 0.2s ease;

  &:hover {
    background-color: var(--color-background);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }

  svg {
    width: 20px;
    height: 20px;
  }
`;

const NavigationContainer = styled.div`
  height: calc(100% - 48px);
  overflow-y: auto;
  overflow-x: hidden;

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: var(--color-background);
  }

  &::-webkit-scrollbar-thumb {
    background: var(--border-color-normal);
    border-radius: 3px;
  }
`;

/**
 * Enhanced Sidebar component with accessibility and performance optimizations
 */
export const Sidebar: React.FC<SidebarProps> = React.memo(
  ({ isOpen, onToggle, onNavigate, onError, className, ariaLabel = 'Main Sidebar Navigation' }) => {
    const theme = useTheme();
    const { isAuthenticated } = useAuth();
    const isMobile = useMediaQuery(`(max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE})`);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const user = useSelector((state: RootState) => state.auth.user);

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

    const getMenuItems = (userRole: string) => {
      const baseItems = [
        {
          text: 'Dashboard',
          icon: <DashboardIcon />,
          path: '/dashboard'
        }
      ];

      const roleSpecificItems = {
        ANALYST: [
          {
            text: 'Analytics',
            icon: <AnalyticsIcon />,
            path: '/analytics'
          },
          {
            text: 'Benchmarks',
            icon: <TimelineIcon />,
            path: '/benchmarks'
          },
          {
            text: 'Company Metrics',
            icon: <AssessmentIcon />,
            path: '/company-metrics'
          }
        ],
        USER: [
          {
            text: 'Benchmarks',
            icon: <TimelineIcon />,
            path: '/benchmarks'
          },
          {
            text: 'Metrics',
            icon: <AssessmentIcon />,
            path: '/metrics'
          }
        ],
        ADMIN: [
          {
            text: 'Analytics',
            icon: <AnalyticsIcon />,
            path: '/analytics'
          },
          {
            text: 'Benchmarks',
            icon: <TimelineIcon />,
            path: '/benchmarks'
          },
          {
            text: 'User Management',
            icon: <PeopleIcon />,
            path: '/admin/users'
          },
          {
            text: 'Audit Logs',
            icon: <HistoryIcon />,
            path: '/admin/audit-logs'
          },
          {
            text: 'Admin Settings',
            icon: <BuildIcon />,
            path: '/admin/settings'
          }
        ]
      };

      const settingsItem = {
        text: 'Settings',
        icon: <SettingsIcon />,
        path: '/settings'
      };

      return [
        ...baseItems,
        ...(roleSpecificItems[userRole as keyof typeof roleSpecificItems] || []),
        settingsItem
      ];
    };

    const menuItems = getMenuItems(user?.role || 'USER');

    const handleClick = (path: string) => {
      try {
        onNavigate(path);
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Navigation failed'));
      }
    };

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
        <NavigationContainer id="sidebar-content" role="region" aria-label={ariaLabel}>
          <List>
            {menuItems.map((item) => (
              <ListItem
                button
                key={item.text}
                onClick={() => handleClick(item.path)}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItem>
            ))}
          </List>
        </NavigationContainer>
      </StyledDrawer>
    );
  }
);

Sidebar.displayName = 'Sidebar';

export default Sidebar;
