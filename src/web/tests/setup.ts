// @testing-library/jest-dom v5.16.5
import '@testing-library/jest-dom';

/**
 * Mock implementation of ResizeObserver for testing responsive components
 */
class MockResizeObserver {
  private observedElements: Set<Element>;
  private callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.observedElements = new Set();
    this.callback = callback;
  }

  observe(element: Element): void {
    this.observedElements.add(element);
    // Trigger initial callback with mock entry
    this.callback([{
      target: element,
      contentRect: element.getBoundingClientRect(),
      borderBoxSize: [{ blockSize: 0, inlineSize: 0 }],
      contentBoxSize: [{ blockSize: 0, inlineSize: 0 }],
      devicePixelContentBoxSize: [{ blockSize: 0, inlineSize: 0 }],
    }], this);
  }

  unobserve(element: Element): void {
    this.observedElements.delete(element);
  }

  disconnect(): void {
    this.observedElements.clear();
  }
}

/**
 * Mock implementation of IntersectionObserver for testing visibility-based components
 */
class MockIntersectionObserver {
  private callback: IntersectionObserverCallback;
  private elements: Set<Element>;

  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    this.elements = new Set();
  }

  observe(element: Element): void {
    this.elements.add(element);
    // Trigger callback with mock intersection entry
    this.callback([{
      target: element,
      isIntersecting: true,
      boundingClientRect: element.getBoundingClientRect(),
      intersectionRatio: 1,
      intersectionRect: element.getBoundingClientRect(),
      rootBounds: null,
      time: Date.now(),
    }], this);
  }

  unobserve(element: Element): void {
    this.elements.delete(element);
  }

  disconnect(): void {
    this.elements.clear();
  }
}

/**
 * Mock implementation of MutationObserver for testing DOM mutations
 */
class MockMutationObserver {
  private callback: MutationCallback;

  constructor(callback: MutationCallback) {
    this.callback = callback;
  }

  observe(target: Node, options?: MutationObserverInit): void {
    // Implementation stores options for future mutation records
  }

  disconnect(): void {
    // Clean up any observation
  }

  takeRecords(): MutationRecord[] {
    return [];
  }
}

/**
 * Mock implementation of matchMedia for testing responsive designs
 */
const mockMatchMedia = (query: string): MediaQueryList => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: jest.fn(), // Deprecated
  removeListener: jest.fn(), // Deprecated
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
});

/**
 * Setup all global mocks and configurations for the test environment
 */
const setupGlobalMocks = (): void => {
  // Assign global mocks
  global.ResizeObserver = MockResizeObserver;
  global.IntersectionObserver = MockIntersectionObserver;
  global.MutationObserver = MockMutationObserver;
  global.matchMedia = mockMatchMedia;

  // Mock window methods that are not implemented in JSDOM
  Object.defineProperty(window, 'scrollTo', {
    value: jest.fn(),
    writable: true,
  });

  Object.defineProperty(window, 'resizeTo', {
    value: jest.fn(),
    writable: true,
  });

  // Mock storage
  const mockStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
    length: 0,
    key: jest.fn(),
  };

  Object.defineProperty(window, 'localStorage', {
    value: mockStorage,
  });

  Object.defineProperty(window, 'sessionStorage', {
    value: mockStorage,
  });

  // Configure console error handling
  const originalError = console.error;
  console.error = (...args: any[]) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: ReactDOM.render is no longer supported')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
};

// Initialize global test environment
setupGlobalMocks();

// Configure automatic cleanup after each test
afterEach(() => {
  // Clean up any mounted components
  jest.clearAllMocks();
  jest.clearAllTimers();
  
  // Reset any document body modifications
  document.body.innerHTML = '';
  
  // Clear any added event listeners
  window.localStorage.clear();
  window.sessionStorage.clear();
});

// Add custom matchers if needed beyond @testing-library/jest-dom
expect.extend({
  // Add any custom matchers here if needed
});