import 'styled-components';
import { Theme } from '../theme';

declare module 'styled-components' {
  export interface DefaultTheme extends Theme {}

  export interface ThemedStyledProps<P, T> {
    theme: T;
  }

  export type StyledComponent<P extends object, T = any> = React.ComponentType<P & { theme?: T }>;

  export interface ThemedCssFunction<T> {
    (
      strings: TemplateStringsArray,
      ...interpolations: Array<Interpolation<ThemedStyledProps<any, T>>>
    ): string;
    <P extends object>(
      strings: TemplateStringsArray,
      ...interpolations: Array<Interpolation<ThemedStyledProps<P, T>>>
    ): string;
  }

  export type Interpolation<P> =
    | ((props: P) => Interpolation<P>)
    | string
    | number
    | boolean
    | null
    | undefined
    | { [key: string]: any }
    | Array<Interpolation<P>>;

  export interface StyledComponentBase<
    C extends keyof JSX.IntrinsicElements | React.ComponentType<any>,
    T = any,
    O extends object = {}
  > {
    (
      strings: TemplateStringsArray,
      ...interpolations: Array<Interpolation<ThemedStyledProps<any, T>>>
    ): StyledComponent<any, T>;
    <P extends object>(
      strings: TemplateStringsArray,
      ...interpolations: Array<Interpolation<ThemedStyledProps<P & O, T>>>
    ): StyledComponent<P, T>;
  }

  export type StyledInterface = {
    [Tag in keyof JSX.IntrinsicElements]: StyledComponentBase<Tag>;
  };

  export type ThemedBaseStyledInterface<T> = {
    [K in keyof JSX.IntrinsicElements]: StyledComponentBase<K, T>;
  };

  export interface ThemedStyledInterface<T> extends ThemedBaseStyledInterface<T> {
    <C extends React.ComponentType<any>>(component: C): StyledComponentBase<C, T>;
  }

  export const css: ThemedCssFunction<DefaultTheme>;
  export const keyframes: (
    strings: TemplateStringsArray,
    ...interpolations: Array<Interpolation<any>>
  ) => string;
  export const createGlobalStyle: <P extends object = {}>(
    strings: TemplateStringsArray,
    ...interpolations: Array<Interpolation<P>>
  ) => React.ComponentType<P>;
  export const ThemeProvider: React.ComponentType<{
    theme: DefaultTheme | ((theme: DefaultTheme) => DefaultTheme);
  }>;
  export const ServerStyleSheet: {
    new (): {
      collectStyles: (tree: React.ReactNode) => React.ReactNode;
      getStyleTags: () => string;
      getStyleElement: () => React.ReactElement[];
      seal: () => void;
    };
  };
  export const StyleSheetManager: React.ComponentType<{
    sheet?: any;
    target?: HTMLElement;
    disableCSSOMInjection?: boolean;
  }>;

  const styled: StyledInterface;
  export default styled;
}
