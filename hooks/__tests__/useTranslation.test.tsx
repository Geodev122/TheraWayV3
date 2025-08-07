import React, { useEffect } from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

import { LanguageProvider } from '../../contexts/LanguageContext';
import { useTranslation } from '../useTranslation';

const TestComponent: React.FC<{ textKey: string }> = ({ textKey }) => {
  const { t, setLanguage } = useTranslation();

  useEffect(() => {
    setLanguage('ar');
  }, [setLanguage]);

  return <div>{t(textKey)}</div>;
};

describe('useTranslation', () => {
  it('falls back to English when key is missing in selected language', async () => {
    const fetchMock = vi.fn((url: RequestInfo) => {
      const path = typeof url === 'string' ? url : url.url;
      if (path.includes('en.json')) {
        return Promise.resolve({ ok: true, json: async () => ({ greeting: 'Hello' }) }) as any;
      }
      if (path.includes('ar.json')) {
        return Promise.resolve({ ok: true, json: async () => ({}) }) as any;
      }
      if (path.includes('fr.json')) {
        return Promise.resolve({ ok: true, json: async () => ({}) }) as any;
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    // @ts-expect-error - overriding global fetch for test
    global.fetch = fetchMock;

    render(
      <LanguageProvider>
        <TestComponent textKey="greeting" />
      </LanguageProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
    });
  });

  it('throws an error if used outside of LanguageProvider', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const OutsideComponent = () => {
      useTranslation();
      return null;
    };

    expect(() => render(<OutsideComponent />)).toThrow(
      'useTranslation must be used within a LanguageProvider'
    );

    errorSpy.mockRestore();
  });
});
