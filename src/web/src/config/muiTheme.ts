import { createTheme, ThemeOptions } from '@mui/material/styles';
import { Components } from '@mui/material/styles/components';

const muiTheme = createTheme({
  palette: {
    primary: {
      main: '#151e2d',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#46608C',
    },
    error: {
      main: '#dc3545',
    },
    warning: {
      main: '#ffc107',
    },
    success: {
      main: '#28a745',
    },
    info: {
      main: '#17a2b8',
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
  spacing: 8,
  breakpoints: {
    values: {
      xs: 320,
      sm: 768,
      md: 1024,
      lg: 1440,
      xl: 1920,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: '4px',
          padding: '8px 16px',
          '&:hover': {
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          },
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#ffffff',
          borderRight: '1px solid rgba(0, 0, 0, 0.12)',
        },
      },
    },
  },
} as ThemeOptions);

export default muiTheme;
