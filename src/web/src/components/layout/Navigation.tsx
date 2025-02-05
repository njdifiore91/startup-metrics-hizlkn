/**
 * Enhanced Navigation Component for Startup Metrics Benchmarking Platform
 * Provides secure, accessible, and responsive main menu structure with role-based access control
 * @version 1.0.0
 */

import React, { useState, useCallback } from 'react';
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
  History as HistoryIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { hasPermission, FEATURES, USER_ROLES, type UserRole } from '@/constants/roles';

// Constants
const MOBILE_BREAKPOINT = '768px';

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

const StyledList = styled(List)`
  padding: var(--spacing-sm);
  position: relative;
  z-index: 1;
` as typeof List;

const StyledListItem = styled(ListItem)`
  padding: 0.75rem 1rem;
  color: var(--color-text);
  margin: var(--spacing-xs) 0;
  border-radius: var(--border-radius-sm);
  cursor: pointer;
  position: relative;
  z-index: 2;

  &[data-active="true"] {
    color: var(--color-accent);
  }

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

const StyledCollapse = styled(Collapse)`
  position: relative;
  z-index: 3;
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
        path: '/benchmarks',
        icon: <AssessmentIcon />,
        visible: hasPermission(userRole, FEATURES.benchmarkData, 'read'),
      },
      {
        id: 'company-metrics',
        label: 'Company Data',
        path: '/company-metrics',
        icon: <TimelineIcon />,
        visible: userRole === USER_ROLES.USER || userRole === USER_ROLES.ANALYST,
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
    id: 'settings',
    label: 'Settings',
    path: '/settings',
    icon: <SettingsIcon />,
    visible: hasPermission(userRole, FEATURES.users, 'read'),
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
        id: 'system-settings',
        label: 'System Settings',
        path: '/admin/settings',
        icon: <SettingsIcon />,
        visible: hasPermission(userRole, FEATURES.users, 'full'),
      },
      {
        id: 'audit-logs',
        label: 'Audit Logs',
        path: '/admin/audit-logs',
        icon: <HistoryIcon />,
        visible: hasPermission(userRole, FEATURES.users, 'full'),
      },
    ],
  },
];

// // Admin navigation items
// const adminNavItems = [
//   {
//     title: 'User Management',
//     path: '/admin/users',
//     icon: <GroupIcon />,
//   },
//   {
//     title: 'Metric Management',
//     path: '/admin/metrics',
//     icon: <BarChartIcon />,
//   },
//   {
//     title: 'Data Sources',
//     path: '/admin/sources',
//     icon: <StorageIcon />,
//   },
//   {
//     title: 'Audit Logs',
//     path: '/admin/audit',
//     icon: <HistoryIcon />,
//   },
// ];

export const Navigation: React.FC<NavigationProps> = ({
  isCollapsed,
  ariaLabel = 'Main Navigation',
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
          data-active={isActive}
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
          <StyledCollapse in={isExpanded && !isCollapsed} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {visibleChildren.map((child) => renderNavItem(child, level + 1))}
            </List>
          </StyledCollapse>
        )}
      </React.Fragment>
    );
  };

  return (
    <StyledList aria-label={ariaLabel}>
      {filteredNavItems.map((item) => renderNavItem(item))}
    </StyledList>
  );
};

export default Navigation;
