import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from '../components/common/Button';
import { ExclamationTriangleIcon } from '../components/icons';

export const NotFoundPage: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle('pageNotFoundTitle');

  return (
    <main role="main" className="flex flex-col flex-grow items-center justify-center text-center p-6 bg-background">
      <div className="bg-primary p-8 sm:p-12 rounded-xl shadow-card max-w-lg w-full">
        <ExclamationTriangleIcon className="w-20 h-20 text-accent/40 mx-auto mb-6" />
        <h1 className="text-3xl sm:text-4xl font-bold text-accent mb-3">
          {t('pageNotFoundHeading')}
        </h1>
        <p className="text-textOnLight/80 mb-8" role="alert">
          {t('pageNotFoundMessage')}
        </p>
        <Link to="/">
          <Button variant="primary" size="lg">
            {t('goToHomepageButton')}
          </Button>
        </Link>
      </div>
    </main>
  );
};
