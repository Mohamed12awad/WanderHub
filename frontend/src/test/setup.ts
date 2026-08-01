import "@testing-library/jest-dom";

// jsdom does not implement matchMedia, and ThemeProvider consults it to resolve
// the "system" colour mode. Without this any test that mounts the provider dies
// in a passive effect. Defaults to light so tests get a deterministic theme.
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
