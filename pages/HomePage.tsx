
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { usePageTitle } from '../hooks/usePageTitle';
import { ChevronRightIcon } from '../components/icons';

const ChoiceCard: React.FC<{
  to: string;
  state?: any;
  title: string;
  subtitle: string;
  cta: string;
  className: string;
  icon: React.ReactNode;
}> = ({ to, state, title, subtitle, cta, className, icon }) => {
  const { direction } = useTranslation();
  return (
    <ReactRouterDOM.Link
      to={to}
      state={state}
      className={`relative group flex-1 w-full min-h-[45vh] lg:min-h-[70vh] flex flex-col items-center justify-center p-6 sm:p-8 text-center rounded-2xl shadow-lg overflow-hidden transition-all duration-300 ease-in-out hover:shadow-2xl hover:scale-[1.02] ${className}`}
    >
      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors duration-300 z-0"></div>
      <div className="relative z-10 flex flex-col items-center">
        <div className="mb-4 text-white/80 group-hover:text-white transition-colors">
            {icon}
        </div>
        <h2 className="text-3xl lg:text-4xl font-bold mb-3 text-white">{title}</h2>
        <p className="text-lg text-white/90 max-w-sm mx-auto">{subtitle}</p>
        <div className="mt-8">
          <span className="inline-flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-accent bg-white group-hover:bg-gray-100 transition-colors">
            {cta}
            <ChevronRightIcon className={`w-5 h-5 ${direction === 'rtl' ? 'mr-2 transform scale-x-[-1]' : 'ml-2'}`} />
          </span>
        </div>
      </div>
    </ReactRouterDOM.Link>
  );
};


export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle('pageTitleHome');

  return (
    <div className="flex-grow flex flex-col items-center justify-center animate-fadeIn p-4 sm:p-6 lg:p-8">
      <div 
        className="absolute inset-0 bg-center bg-cover opacity-20" 
        style={{ backgroundImage: "url('/flower-texture.png')" }}
      ></div>
      <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        <ChoiceCard
          to="/find"
          title={t('home.client.title')}
          subtitle={t('home.client.subtitle')}
          cta={t('home.client.cta')}
          className="bg-accent"
          icon={<i className="fas fa-heart-pulse fa-3x"></i>}
        />
        
        <ChoiceCard
          to="/login"
          state={{ isSigningUp: true }}
          title={t('home.professional.title')}
          subtitle={t('home.professional.subtitle')}
          cta={t('home.professional.cta')}
          className="bg-highlight"
           icon={<i className="fas fa-briefcase fa-3x"></i>}
        />
        
      </div>
    </div>
  );
};
