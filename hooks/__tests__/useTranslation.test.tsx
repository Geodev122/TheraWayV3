import React, { useEffect } from 'react';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';

import { LanguageProvider } from '../../contexts/LanguageContext';
import { useTranslation } from '../useTranslation';

// Mock react-hot-toast to prevent errors during tests
vi.mock('react-hot-toast', () => ({
  default: { error: vi.fn() }
}));

describe('useTranslation', () => {
  beforeEach(() => {
    // Reset localStorage and mock fetch for translations
    localStorage.clear();
    (global as any).fetch = vi.fn((url: RequestInfo) => {
      if (typeof url === 'string' && url.includes('en.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ missingKey: 'English Translation' })
        });
      }
      if (typeof url === 'string' && url.includes('ar.json')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({})
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('falls back to English when Arabic translation is missing', async () => {
    const TestComponent = () => {
      const { t, setLanguage, isLoaded } = useTranslation();
      useEffect(() => {
        setLanguage('ar');
      }, [setLanguage]);

      if (!isLoaded) return null;
      return <div>{t('missingKey')}</div>;
    };

    render(
      <LanguageProvider>
        <TestComponent />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('English Translation')).toBeDefined();
    });
  });

  it('throws error when used outside LanguageProvider', () => {
    const OutsideComponent = () => {
      useTranslation();
      return null;
    };

    expect(() => render(<OutsideComponent />)).toThrow(
      'useTranslation must be used within a LanguageProvider'
    );
  });
});
