import 'styled-components';
import { CSSProp } from 'styled-components';

declare module 'styled-components' {
  import { CSSProperties, ComponentType } from 'react';

  export interface DefaultTheme {
    // Add theme properties if needed
  }

  export interface ThemedStyledProps<P, T> {
    theme: T;
  }

  export interface StyledComponent<P = {}, T = DefaultTheme>
    extends ComponentType<P & { theme?: T }> {}

  export interface ThemedCssFunction<T> {
    (strings: TemplateStringsArray, ...interpolations: any[]): string;
    <P>(strings: TemplateStringsArray, ...interpolations: any[]): string;
  }

  export interface Keyframes {
    getName(): string;
  }

  export interface ThemedBaseStyledInterface<T> {
    <P extends object>(component: ComponentType<P>): StyledComponent<P, T>;
    <P extends object>(component: string): StyledComponent<P, T>;
  }

  export interface ThemedStyledInterface<T> extends ThemedBaseStyledInterface<T> {
    [key: string]: ThemedBaseStyledInterface<T>;
  }

  export type StyledInterface = ThemedStyledInterface<DefaultTheme>;

  export const css: ThemedCssFunction<DefaultTheme>;
  export const keyframes: (strings: TemplateStringsArray, ...interpolations: any[]) => Keyframes;
  export const createGlobalStyle: any;
  export const ThemeProvider: ComponentType<{
    theme: DefaultTheme | ((theme: DefaultTheme) => DefaultTheme);
  }>;

  export default styled as StyledInterface & {
    default: StyledInterface;
  };
}

declare module 'react' {
  interface Attributes {
    css?: CSSProp;
  }
}
