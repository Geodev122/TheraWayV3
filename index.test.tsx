import React from 'react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('./App', () => ({ default: () => <div /> }));
vi.mock('./index.css', () => ({}));
vi.mock('@fortawesome/fontawesome-free/css/all.css', () => ({}));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

// Mock react-dom/client to throw on first createRoot call and succeed on subsequent calls
vi.mock('react-dom/client', async () => {
  const actual = await vi.importActual<typeof import('react-dom/client')>('react-dom/client');
  let shouldThrow = true;
  const createRoot = (container: Element | DocumentFragment) => {
    if (shouldThrow) {
      shouldThrow = false;
      throw new Error('test error');
    }
    return actual.createRoot(container);
  };
  return {
    ...actual,
    createRoot,
    default: { ...actual, createRoot },
  };
});

describe('index startup error handling', () => {
  it('renders StartupError when root render fails', async () => {
    document.body.innerHTML = '<div id="root"></div>';
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await import('./index');
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(consoleSpy).toHaveBeenCalled();
    expect(document.body.innerHTML).toContain('View setup documentation');

    consoleSpy.mockRestore();
  });
});
