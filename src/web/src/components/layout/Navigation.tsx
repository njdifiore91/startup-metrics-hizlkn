/**
 * Enhanced Navigation Component for Startup Metrics Benchmarking Platform
 * Provides secure, accessible, and responsive main menu structure with role-based access control
 * @version 1.0.0
 */

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import styled from '@emotion/styled';
import {
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Collapse,
  useMediaQuery,
  Theme
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  ExpandLess,
  ExpandMore,
  ChevronLeft,
  ChevronRight
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { analytics } from '@analytics/react';
import { UI_CONSTANTS } from '../../config/constants';

// Interfaces
interface NavigationProps {
  isCollapsed: boolean;
  theme: Theme;
  ariaLabel?: string;
  onNavigationError?: (error: Error) => void;
}

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ReactNode;
  roles: string[];
  permissions: string[];
  children?: NavItem[];
  ariaLabel?: string;
}

// Styled Components
const StyledNavigation = styled.nav<{ isCollapsed: boolean; theme: Theme }>`
  width: ${props => props.isCollapsed ? '64px' : UI_CONSTANTS.SIDEBAR_WIDTH};
  height: 100vh;
  background-color: ${props => props.theme.palette?.primary?.main || '#1976d2'};
  color: ${props => props.theme.palette?.primary?.contrastText || '#ffffff'};
  transition: width 0.3s ease;
  overflow-x: hidden;
  overflow-y: auto;
  position: fixed;
  left: 0;
  top: ${UI_CONSTANTS.HEADER_HEIGHT};
  z-index: 1000;
  
  @media (max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE}) {
    width: ${props => props.isCollapsed ? '0' : UI_CONSTANTS.SIDEBAR_WIDTH};
  }

  /* Scrollbar styling */
  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-track {
    background: ${props => props.theme.palette?.primary?.dark || '#1565c0'};
  }

  &::-webkit-scrollbar-thumb {
    background: ${props => props.theme.palette?.primary?.light || '#42a5f5'};
    border-radius: 3px;
  }
`;

const StyledListItem = styled(ListItem)<{ active?: boolean }>`
  padding: ${props => props.theme.spacing?.(2) || '16px'};
  color: ${props => props.active ? props.theme.palette?.secondary?.main || '#f50057' : 'inherit'};
  
  &:hover {
    background-color: ${props => props.theme.palette?.primary?.dark || '#1565c0'};
  }

  .MuiListItemIcon-root {
    color: inherit;
    min-width: 40px;
  }
`;

// Navigation Items Configuration
const NAV_ITEMS: NavItem[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    roles: ['user', 'admin'],
    permissions: ['view:dashboard'],
    ariaLabel: 'Navigate to Dashboard'
  },
  {
    id: 'benchmarks',
    label: 'Benchmarks',
    path: '/benchmarks',
    icon: <AssessmentIcon />,
    roles: ['user', 'admin'],
    permissions: ['view:benchmarks'],
    ariaLabel: 'Navigate to Benchmarks'
  },
  {
    id: 'metrics',
    label: 'Company Metrics',
    path: '/metrics',
    icon: <TimelineIcon />,
    roles: ['user', 'admin'],
    permissions: ['view:metrics', 'edit:metrics'],
    ariaLabel: 'Navigate to Company Metrics'
  },
  {
    id: 'admin',
    label: 'Admin Panel',
    path: '/admin',
    icon: <AdminPanelSettingsIcon />,
    roles: ['admin'],
    permissions: ['admin:access'],
    ariaLabel: 'Navigate to Admin Panel'
  }
];

export const Navigation: React.FC<NavigationProps> = ({
  isCollapsed,
  theme,
  ariaLabel = 'Main Navigation',
  onNavigationError
}) => {
  const { user, validateSession } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(`(max-width: ${UI_CONSTANTS.BREAKPOINTS.MOBILE})`);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  // Filter navigation items based on user role and permissions
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (!user) return false;
    return item.roles.includes(user.role) &&
           item.permissions.every(permission => user.permissions?.includes(permission));
  });

  // Handle navigation item click
  const handleNavClick = useCallback(async (path: string, item: NavItem) => {
    try {
      // Validate session before navigation
      const isSessionValid = await validateSession();
      if (!isSessionValid) {
        throw new Error('Session expired');
      }

      // Track navigation event
      analytics.track('navigation_click', {
        path,
        itemId: item.id,
        timestamp: new Date().toISOString()
      });

      // Handle mobile menu
      if (isMobile) {
        setExpandedItems([]);
      }

      navigate(path);
    } catch (error) {
      onNavigationError?.(error as Error);
    }
  }, [navigate, validateSession, isMobile, onNavigationError]);

  // Toggle expanded state for items with children
  const toggleExpand = (itemId: string) => {
    setExpandedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  // Reset expanded items on mobile when collapsed
  useEffect(() => {
    if (isMobile && isCollapsed) {
      setExpandedItems([]);
    }
  }, [isMobile, isCollapsed]);

  // Render navigation item
  const renderNavItem = (item: NavItem) => {
    const isActive = location.pathname === item.path;
    const isExpanded = expandedItems.includes(item.id);

    return (
      <React.Fragment key={item.id}>
        <StyledListItem
          active={isActive}
          onClick={() => item.children ? toggleExpand(item.id) : handleNavClick(item.path, item)}
          aria-label={item.ariaLabel}
          aria-expanded={item.children ? isExpanded : undefined}
          aria-current={isActive ? 'page' : undefined}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          {!isCollapsed && (
            <>
              <ListItemText primary={item.label} />
              {item.children && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
            </>
          )}
        </StyledListItem>
        {item.children && (
          <Collapse in={isExpanded && !isCollapsed} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children.map(child => renderNavItem(child))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <StyledNavigation
      isCollapsed={isCollapsed}
      theme={theme}
      aria-label={ariaLabel}
      role="navigation"
    >
      <List component="nav" aria-label={ariaLabel}>
        {filteredNavItems.map(renderNavItem)}
      </List>
      {!isMobile && (
        <div onClick={() => navigate(isCollapsed ? '/' : -1)}>
          {isCollapsed ? <ChevronRight /> : <ChevronLeft />}
        </div>
      )}
    </StyledNavigation>
  );
};

export default Navigation;