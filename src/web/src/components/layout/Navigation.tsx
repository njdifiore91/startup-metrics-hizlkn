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
  Theme,
  useTheme,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Assessment as AssessmentIcon,
  Timeline as TimelineIcon,
  AdminPanelSettings as AdminPanelSettingsIcon,
  Person as PersonIcon,
  Description as DescriptionIcon,
  Group as UsersIcon,
  Settings as SettingsIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { UI_CONSTANTS } from '../../config/constants';
import { hasPermission, FEATURES, USER_ROLES, type UserRole } from '@/constants/roles';

interface IUser {
  id: string;
  role: string;
  permissions: string[];
  name?: string;
  email?: string;
}

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
  visible: boolean;
  children?: NavItem[];
  ariaLabel?: string;
}

interface StyledNavigationProps {
  isCollapsed: boolean;
  theme: Theme;
}

interface StyledListItemProps {
  active?: boolean;
  theme: Theme;
  onClick?: () => void;
  'aria-label'?: string;
  'aria-expanded'?: boolean;
  'aria-current'?: 'page' | undefined;
}

// Constants
const MOBILE_BREAKPOINT = '768px'; // Mobile breakpoint from UI_CONSTANTS
const DEFAULT_SPACING = 2; // Default spacing in rem

// Styled Components
const StyledNavigation = styled('nav')<StyledNavigationProps>`
  width: ${({ isCollapsed }) => (isCollapsed ? '64px' : UI_CONSTANTS.SIDEBAR_WIDTH)};
  height: calc(100vh - 64px);
  background-color: var(--color-surface);
  color: var(--color-text);
  transition: width 0.3s ease;
  overflow-x: hidden;
  overflow-y: auto;
  position: fixed;
  left: 0;
  top: 64px;
  z-index: var(--z-index-fixed);
  border-right: 1px solid var(--border-color-light);

  @media (max-width: ${MOBILE_BREAKPOINT}) {
    width: ${({ isCollapsed }) => (isCollapsed ? '0' : UI_CONSTANTS.SIDEBAR_WIDTH)};
  }

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

const StyledListItem = styled(ListItem)<{ active?: boolean }>`
  padding: 1rem;
  color: ${({ active }) => (active ? 'var(--color-accent)' : 'var(--color-text)')};
  margin: var(--spacing-xs) 0;
  border-radius: var(--border-radius-sm);
  cursor: pointer;

  &:hover {
    background-color: var(--color-background);
  }

  &:focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: -2px;
  }

  .MuiListItemIcon-root {
    color: inherit;
    min-width: 40px;
  }

  .MuiListItemText-root {
    margin-left: var(--spacing-sm);
  }
`;

// Updated Navigation Items Configuration based on roles and permissions
const getNavItems = (userRole: UserRole): NavItem[] => [
  {
    id: 'dashboard',
    label: 'Dashboard',
    path: '/dashboard',
    icon: <DashboardIcon />,
    visible: true, // Available to all roles
    children: [
      {
        id: 'benchmarks',
        label: 'Benchmark Data',
        path: '/dashboard/benchmarks',
        icon: <AssessmentIcon />,
        visible: hasPermission(userRole, FEATURES.benchmarkData, 'read'),
      },
      {
        id: 'company-data',
        label: 'Company Data',
        path: '/dashboard/company-data',
        icon: <TimelineIcon />,
        visible: hasPermission(userRole, FEATURES.companyData, 'read'),
      },
    ],
  },
  {
    id: 'reports',
    label: 'Reports',
    path: '/reports',
    icon: <DescriptionIcon />,
    visible: hasPermission(userRole, FEATURES.reports, 'read'),
    children:
      userRole === USER_ROLES.ADMIN
        ? [
            {
              id: 'system-reports',
              label: 'System Analytics',
              path: '/reports/system',
              icon: <AssessmentIcon />,
              visible: true,
            },
            {
              id: 'custom-reports',
              label: 'Custom Reports',
              path: '/reports/custom',
              icon: <DescriptionIcon />,
              visible: true,
            },
          ]
        : [],
  },
  {
    id: 'profile',
    label: 'Profile',
    path: '/profile',
    icon: <PersonIcon />,
    visible: hasPermission(userRole, FEATURES.profile, 'read'),
  },
  {
    id: 'admin',
    label: 'Administration',
    path: '/admin',
    icon: <AdminPanelSettingsIcon />,
    visible: userRole === USER_ROLES.ADMIN,
    children: [
      {
        id: 'user-management',
        label: 'User Management',
        path: '/admin/users',
        icon: <UsersIcon />,
        visible: hasPermission(userRole, FEATURES.users, 'full'),
      },
      {
        id: 'settings',
        label: 'System Settings',
        path: '/admin/settings',
        icon: <SettingsIcon />,
        visible: hasPermission(userRole, FEATURES.users, 'full'),
      },
    ],
  },
];

export const Navigation: React.FC<NavigationProps> = ({
  isCollapsed,
  theme,
  ariaLabel = 'Main Navigation',
  onNavigationError,
}) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isMobile = useMediaQuery(`(max-width: ${MOBILE_BREAKPOINT})`);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  const navItems = user ? getNavItems(user.role as UserRole) : [];
  const filteredNavItems = navItems.filter((item) => item.visible);

  // Handle navigation item click
  const handleNavClick = useCallback(
    (path: string) => {
      navigate(path);
      if (isMobile) {
        setExpandedItems([]);
      }
    },
    [navigate, isMobile]
  );

  // Toggle expanded state for items with children
  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const renderNavItem = (item: NavItem, level = 0) => {
    const isActive = location.pathname === item.path;
    const isExpanded = expandedItems.includes(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const visibleChildren = item.children?.filter((child) => child.visible) || [];

    if (!item.visible) return null;

    return (
      <React.Fragment key={item.id}>
        <StyledListItem
          onClick={() => (hasChildren ? toggleExpand(item.id) : handleNavClick(item.path))}
          active={isActive}
          style={{ paddingLeft: `${(level + 1) * 16}px` }}
          aria-expanded={hasChildren ? isExpanded : undefined}
          aria-current={isActive ? 'page' : undefined}
          aria-label={item.ariaLabel || item.label}
        >
          <ListItemIcon>{item.icon}</ListItemIcon>
          {!isCollapsed && (
            <>
              <ListItemText primary={item.label} />
              {hasChildren && (isExpanded ? <ExpandLess /> : <ExpandMore />)}
            </>
          )}
        </StyledListItem>
        {hasChildren && (
          <Collapse in={isExpanded && !isCollapsed} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {visibleChildren.map((child) => renderNavItem(child, level + 1))}
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
        {filteredNavItems.map((item) => renderNavItem(item))}
      </List>
    </StyledNavigation>
  );
};

export default Navigation;
