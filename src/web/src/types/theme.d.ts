import '@mui/material/styles';
import { Theme as MuiTheme, ThemeOptions as MuiThemeOptions } from '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Theme extends MuiTheme {
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
    components?: {
      MuiCssBaseline?: {
        styleOverrides?: {
          ':root'?: {
            '--color-primary'?: string;
            '--color-secondary'?: string;
            '--color-accent'?: string;
            '--color-background'?: string;
            '--color-text'?: string;
            '--color-error'?: string;
            '--color-warning'?: string;
            '--color-success'?: string;
            '--color-info'?: string;
            '--color-surface'?: string;
            '--color-overlay'?: string;
            '--font-family-primary'?: string;
            '--font-family-monospace'?: string;
            '--font-size-xs'?: string;
            '--font-size-sm'?: string;
            '--font-size-md'?: string;
            '--font-size-lg'?: string;
            '--font-size-xl'?: string;
            '--font-size-xxl'?: string;
            '--font-weight-regular'?: string;
            '--font-weight-medium'?: string;
            '--font-weight-bold'?: string;
            '--line-height-tight'?: string;
            '--line-height-normal'?: string;
            '--line-height-loose'?: string;
            '--spacing-base'?: string;
            '--spacing-xs'?: string;
            '--spacing-sm'?: string;
            '--spacing-md'?: string;
            '--spacing-lg'?: string;
            '--spacing-xl'?: string;
            '--spacing-xxl'?: string;
            '--shadow-none'?: string;
            '--shadow-sm'?: string;
            '--shadow-md'?: string;
            '--shadow-lg'?: string;
            '--shadow-xl'?: string;
            '--transition-fast'?: string;
            '--transition-normal'?: string;
            '--transition-slow'?: string;
            '--z-index-modal'?: string;
            '--z-index-dropdown'?: string;
            '--z-index-header'?: string;
            '--z-index-tooltip'?: string;
            '--z-index-base'?: string;
          };
        };
      };
    };
  }

  interface ThemeOptions extends MuiThemeOptions {
    colors?: {
      primary?: string;
      secondary?: string;
      accent?: string;
      background?: string;
      text?: string;
      error?: string;
      warning?: string;
      success?: string;
      info?: string;
      surface?: string;
      overlay?: string;
    };
    typography?: {
      fontFamily?: {
        primary?: string;
        monospace?: string;
      };
      fontSize?: {
        xs?: string;
        sm?: string;
        md?: string;
        lg?: string;
        xl?: string;
        xxl?: string;
      };
      fontWeight?: {
        regular?: number;
        medium?: number;
        bold?: number;
      };
      lineHeight?: {
        normal?: number;
        tight?: number;
        loose?: number;
      };
    };
    spacing?: {
      base?: number;
      xs?: number;
      sm?: number;
      md?: number;
      lg?: number;
      xl?: number;
      xxl?: number;
    };
    breakpoints?: {
      mobile?: string;
      tablet?: string;
      desktop?: string;
      largeDesktop?: string;
    };
    shadows?: {
      none?: string;
      sm?: string;
      md?: string;
      lg?: string;
      xl?: string;
    };
    transitions?: {
      fast?: string;
      normal?: string;
      slow?: string;
    };
    zIndex?: {
      modal?: number;
      dropdown?: number;
      header?: number;
      tooltip?: number;
      base?: number;
    };
    components?: {
      MuiCssBaseline?: {
        styleOverrides?: {
          ':root'?: {
            '--color-primary'?: string;
            '--color-secondary'?: string;
            '--color-accent'?: string;
            '--color-background'?: string;
            '--color-text'?: string;
            '--color-error'?: string;
            '--color-warning'?: string;
            '--color-success'?: string;
            '--color-info'?: string;
            '--color-surface'?: string;
            '--color-overlay'?: string;
            '--font-family-primary'?: string;
            '--font-family-monospace'?: string;
            '--font-size-xs'?: string;
            '--font-size-sm'?: string;
            '--font-size-md'?: string;
            '--font-size-lg'?: string;
            '--font-size-xl'?: string;
            '--font-size-xxl'?: string;
            '--font-weight-regular'?: string;
            '--font-weight-medium'?: string;
            '--font-weight-bold'?: string;
            '--line-height-tight'?: string;
            '--line-height-normal'?: string;
            '--line-height-loose'?: string;
            '--spacing-base'?: string;
            '--spacing-xs'?: string;
            '--spacing-sm'?: string;
            '--spacing-md'?: string;
            '--spacing-lg'?: string;
            '--spacing-xl'?: string;
            '--spacing-xxl'?: string;
            '--shadow-none'?: string;
            '--shadow-sm'?: string;
            '--shadow-md'?: string;
            '--shadow-lg'?: string;
            '--shadow-xl'?: string;
            '--transition-fast'?: string;
            '--transition-normal'?: string;
            '--transition-slow'?: string;
            '--z-index-modal'?: string;
            '--z-index-dropdown'?: string;
            '--z-index-header'?: string;
            '--z-index-tooltip'?: string;
            '--z-index-base'?: string;
          };
        };
      };
    };
  }
}
