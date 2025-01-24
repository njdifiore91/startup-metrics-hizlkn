// deepmerge v4.3.1 - Deep merging of theme objects for customization
import deepmerge from 'deepmerge';
import { createTheme as createMuiTheme, Theme, ThemeOptions } from '@mui/material/styles';

/**
 * Comprehensive type definition for our custom theme properties
 */
export interface CustomTheme {
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
  customTypography: {
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
  customSpacing: {
    base: number;
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  customBreakpoints: {
    mobile: string;
    tablet: string;
    desktop: string;
    largeDesktop: string;
  };
  customShadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  customTransitions: {
    fast: string;
    normal: string;
    slow: string;
  };
  customZIndex: {
    modal: number;
    dropdown: number;
    header: number;
    tooltip: number;
    base: number;
  };
}

// Extend the default theme type
declare module '@mui/material/styles' {
  interface Theme extends CustomTheme {}
  interface ThemeOptions extends Partial<CustomTheme> {}
}

/**
 * Default theme configuration implementing design system specifications
 */
export const theme = createMuiTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#151e2d',
      light: '#2c3b54',
      dark: '#0c111b',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#46608C',
      light: '#6b82ac',
      dark: '#31436c',
      contrastText: '#ffffff',
    },
    error: {
      main: '#dc3545',
      light: '#e35d6a',
      dark: '#b02a37',
    },
    warning: {
      main: '#ffc107',
      light: '#ffcd39',
      dark: '#cc9a06',
    },
    success: {
      main: '#28a745',
      light: '#33c755',
      dark: '#1e7e34',
    },
    info: {
      main: '#17a2b8',
      light: '#1fc8e3',
      dark: '#117a8b',
    },
    background: {
      default: '#DBEAAC',
      paper: '#ffffff',
    },
    text: {
      primary: '#0D3330',
      secondary: '#46608C',
    },
  },
  typography: {
    fontFamily: 'Inter, sans-serif',
    fontSize: 16,
    fontWeightRegular: 400,
    fontWeightMedium: 500,
    fontWeightBold: 700,
    h1: {
      fontSize: '32px',
      fontWeight: 700,
    },
    h2: {
      fontSize: '24px',
      fontWeight: 700,
    },
    h3: {
      fontSize: '20px',
      fontWeight: 600,
    },
    body1: {
      fontSize: '16px',
      lineHeight: 1.5,
    },
    body2: {
      fontSize: '14px',
      lineHeight: 1.5,
    },
  },
  customSpacing: {
    base: 8,
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 64,
  },
  customBreakpoints: {
    mobile: '320px',
    tablet: '768px',
    desktop: '1024px',
    largeDesktop: '1440px',
  },
  colors: {
    primary: '#151e2d',
    secondary: '#46608C',
    accent: '#168947',
    background: '#DBEAAC',
    text: '#0D3330',
    error: '#dc3545',
    warning: '#ffc107',
    success: '#28a745',
    info: '#17a2b8',
    surface: '#ffffff',
    overlay: 'rgba(0, 0, 0, 0.5)',
  },
  customTypography: {
    fontFamily: {
      primary: 'Inter, sans-serif',
      monospace: 'monospace',
    },
    fontSize: {
      xs: '12px',
      sm: '14px',
      md: '16px',
      lg: '20px',
      xl: '24px',
      xxl: '32px',
    },
    fontWeight: {
      regular: 400,
      medium: 500,
      bold: 700,
    },
    lineHeight: {
      normal: 1.5,
      tight: 1.25,
      loose: 1.75,
    },
  },
  customShadows: {
    none: 'none',
    sm: '0 1px 3px rgba(0,0,0,0.12)',
    md: '0 4px 6px rgba(0,0,0,0.1)',
    lg: '0 10px 15px rgba(0,0,0,0.1)',
    xl: '0 20px 25px rgba(0,0,0,0.1)',
  },
  customTransitions: {
    fast: '150ms ease-in-out',
    normal: '300ms ease-in-out',
    slow: '500ms ease-in-out',
  },
  customZIndex: {
    modal: 1000,
    dropdown: 100,
    header: 50,
    tooltip: 75,
    base: 1,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        ':root': {
          // Brand Colors
          '--color-primary': '#151e2d',
          '--color-primary-light': '#2c3b54',
          '--color-primary-dark': '#0c111b',
          '--color-secondary': '#46608C',
          '--color-secondary-light': '#6b82ac',
          '--color-secondary-dark': '#31436c',
          '--color-accent': '#168947',
          '--color-accent-light': '#1ea55b',
          '--color-accent-dark': '#0f6332',
          '--color-background': '#DBEAAC',
          '--color-surface': '#ffffff',
          '--color-text': '#0D3330',
          '--color-error': '#dc3545',
          '--color-warning': '#ffc107',
          '--color-success': '#28a745',
          '--color-info': '#17a2b8',
          '--color-overlay': 'rgba(0, 0, 0, 0.5)',
          // Custom CSS variables
          '--font-family-primary': 'Inter, sans-serif',
          '--font-family-monospace': 'monospace',
          '--font-size-xs': '12px',
          '--font-size-sm': '14px',
          '--font-size-md': '16px',
          '--font-size-lg': '20px',
          '--font-size-xl': '24px',
          '--font-size-xxl': '32px',
          '--font-weight-regular': '400',
          '--font-weight-medium': '500',
          '--font-weight-bold': '700',
          '--line-height-tight': '1.25',
          '--line-height-normal': '1.5',
          '--line-height-loose': '1.75',
          '--spacing-base': '8px',
          '--spacing-xs': '8px',
          '--spacing-sm': '16px',
          '--spacing-md': '24px',
          '--spacing-lg': '32px',
          '--spacing-xl': '48px',
          '--spacing-xxl': '64px',
          '--shadow-none': 'none',
          '--shadow-sm': '0 1px 3px rgba(0,0,0,0.12)',
          '--shadow-md': '0 4px 6px rgba(0,0,0,0.1)',
          '--shadow-lg': '0 10px 15px rgba(0,0,0,0.1)',
          '--shadow-xl': '0 20px 25px rgba(0,0,0,0.1)',
          '--transition-fast': '150ms ease-in-out',
          '--transition-normal': '300ms ease-in-out',
          '--transition-slow': '500ms ease-in-out',
          '--z-index-modal': '1000',
          '--z-index-dropdown': '100',
          '--z-index-header': '50',
          '--z-index-tooltip': '75',
          '--z-index-base': '1',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundColor: '#ffffff',
        },
      },
    },
  },
});

/**
 * Theme provider props interface
 */
export interface ThemeProvider {
  theme: CustomTheme;
}

/**
 * Creates a custom theme by deeply merging with the default theme
 * @param customTheme - Partial theme overrides
 * @returns Complete theme configuration
 */
export function createTheme(customTheme: Partial<Theme>): Theme {
  return deepmerge(theme, customTheme, {
    arrayMerge: (_, sourceArray) => sourceArray,
  });
}
