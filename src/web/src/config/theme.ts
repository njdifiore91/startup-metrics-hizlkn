// deepmerge v4.3.1 - Deep merging of theme objects for customization
import deepmerge from 'deepmerge';

/**
 * Comprehensive type definition for the theme object structure
 */
export interface ThemeType {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    surface: string;
    overlay: string;
  };
  typography: {
    fontFamily: {
      primary: string;
      monospace: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    fontWeight: {
      regular: number;
      medium: number;
      bold: number;
    };
    lineHeight: {
      normal: number;
      tight: number;
      loose: number;
    };
  };
  spacing: {
    base: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  breakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
    largeDesktop: string;
  };
  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  transitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  zIndex: {
    modal: number;
    dropdown: number;
    header: number;
    tooltip: number;
    base: number;
  };
}

/**
 * Default theme configuration implementing design system specifications
 */
export const theme: ThemeType = {
  colors: {
    primary: '#151e2d',    // Brand primary color
    secondary: '#46608C',  // Brand secondary color
    accent: '#168947',     // Brand accent color
    background: '#DBEAAC', // Brand background color
    text: '#0D3330',       // Brand text color
    error: '#dc3545',      // Error state color
    warning: '#ffc107',    // Warning state color
    success: '#28a745',    // Success state color
    info: '#17a2b8',       // Info state color
    surface: '#ffffff',    // Surface color for cards/panels
    overlay: 'rgba(0, 0, 0, 0.5)', // Modal/overlay background
  },
  typography: {
    fontFamily: {
      primary: 'Inter, sans-serif',
      monospace: 'monospace',
    },
    fontSize: {
      xs: '12px',  // Labels, captions
      sm: '14px',  // Body small
      md: '16px',  // Body default
      lg: '20px',  // Subheadings
      xl: '24px',  // Headings
      xxl: '32px', // Large headings
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      loose: 1.75,
    },
  },
  spacing: {
    base: 8,      // Base spacing unit
    xs: 8,        // Extra small spacing
    sm: 16,       // Small spacing
    md: 24,       // Medium spacing
    lg: 32,       // Large spacing
    xl: 48,       // Extra large spacing
    xxl: 64,      // Extra extra large spacing
  },
  breakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    largeDesktop: '1440px',
  },
  shadows: {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.1)',
  },
  transitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
  },
  zIndex: {
    modal: 1000,
    dropdown: 100,
    header: 50,
    tooltip: 75,
    base: 1,
  },
};

/**
 * Theme provider props interface
 */
export interface ThemeProvider {
  theme: ThemeType;
}

/**
 * Creates a custom theme by deeply merging with the default theme
 * @param customTheme - Partial theme overrides
 * @returns Complete theme configuration
 */
export function createTheme(customTheme: Partial<ThemeType>): ThemeType {
  return deepmerge(theme, customTheme, {
    // Clone arrays instead of merging them
    arrayMerge: (_, sourceArray) => sourceArray,
  });
}