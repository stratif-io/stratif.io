import "@testing-library/jest-dom/vitest";

// Radix UI Select uses scrollIntoView internally; jsdom doesn't implement it
window.HTMLElement.prototype.scrollIntoView = () => {};

// Radix UI Select / Pointer Events need hasPointerCapture
if (!window.HTMLElement.prototype.hasPointerCapture) {
  window.HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!window.HTMLElement.prototype.setPointerCapture) {
  window.HTMLElement.prototype.setPointerCapture = () => {};
}
if (!window.HTMLElement.prototype.releasePointerCapture) {
  window.HTMLElement.prototype.releasePointerCapture = () => {};
}

// Recharts / Radix ScrollArea uses ResizeObserver
if (!window.ResizeObserver) {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Recharts / Radix may check matchMedia
if (!window.matchMedia) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  });
}

// jsdom's getComputedStyle crashes on CSS custom properties (variables) when
// dom-accessibility-api calls it during getByRole name computation. Patch it
// to return an empty CSSStyleDeclaration rather than throw.
const _origGetComputedStyle = window.getComputedStyle.bind(window);
window.getComputedStyle = (elt: Element, pseudoElt?: string | null) => {
  try {
    return _origGetComputedStyle(elt, pseudoElt);
  } catch {
    return new CSSStyleDeclaration();
  }
};

// Navigator clipboard API for copy tests - set up as configurable
// for use by userEvent and test code
Object.defineProperty(navigator, "clipboard", {
  configurable: true,
  writable: true,
  value: {
    writeText: () => Promise.resolve(),
  },
});
