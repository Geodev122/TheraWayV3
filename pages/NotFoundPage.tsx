import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export function NotFoundPage() {
    const { t } = useLanguage();

    return (
        <div className="flex flex-col items-center justify-center flex-grow text-center px-4">
            <h1 className="text-6xl font-bold text-primary mb-4">404</h1>
            <h2 className="text-2xl font-semibold text-text mb-2">{t('notFoundTitle', 'Page Not Found')}</h2>
            <p className="text-muted-foreground mb-6">{t('notFoundMessage', 'Sorry, the page you are looking for does not exist.')}</p>
            <Link
                to="/"
                className="px-6 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 transition-colors"
            >
                {t('goHome', 'Go to Homepage')}
            </Link>
        </div>
    );
}