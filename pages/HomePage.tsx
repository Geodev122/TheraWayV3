
import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { usePageTitle } from '../hooks/usePageTitle';
import { Button } from '../components/common/Button';
import { SearchIcon, BriefcaseIcon, UsersIcon } from '../components/icons';

// A helper component to render bold text within translations
const Txt: React.FC<{ tKey: string }> = ({ tKey }) => {
  const { t } = useTranslation();
  const text = t(tKey);
  // Split by <b>...</b> tags and render the inner part as bold.
  const parts = text.split(/<b>(.*?)<\/b>/g);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? <b key={i}>{part}</b> : part
      )}
    </>
  );
};

export const HomePage: React.FC = () => {
  const { t } = useTranslation();
  usePageTitle('pageTitleHome');

  return (
    <div className="flex-grow animate-fadeIn">
      {/* Hero Section */}
      <section className="relative bg-secondary/30 text-center py-20 sm:py-28 lg:py-32 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-primary/50 to-secondary/40 z-0"></div>
        <div 
          className="absolute inset-0 bg-center bg-no-repeat opacity-5" 
          style={{ backgroundImage: "url('/flower-texture.png')" }}
        ></div>
        <div className="relative z-10 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-textDarker tracking-tight leading-tight">
            {t('heroTitle', { default: 'Find Your Path to Mental Wellness' })}
          </h1>
          <p className="mt-4 sm:mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-textOnLight/80">
            {t('heroSubtitle', { default: 'TheraWay connects you with qualified therapists and professional clinic spaces, making mental healthcare accessible and seamless.' })}
          </p>
          <div className="mt-8 sm:mt-10">
            <Link to="/find">
              <Button size="xl" variant="primary" rightIcon={<SearchIcon className="w-6 h-6" />}>
                {t('heroCtaButton', { default: 'Find a Therapist Now' })}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 sm:py-20 bg-primary">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-accent">
              {t('howItWorksTitle', { default: 'How TheraWay Works' })}
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
            {/* For Clients */}
            <div className="bg-background p-8 rounded-xl shadow-card animate-slideUpFadeIn">
              <div className="flex items-center mb-4">
                <div className="bg-accent/10 p-3 rounded-full mr-4">
                  <UsersIcon className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-2xl font-semibold text-textDarker">
                  {t('forClientsTitle', { default: 'For Clients' })}
                </h3>
              </div>
              <ol className="space-y-4 text-textOnLight/90">
                <li className="flex">
                  <span className="bg-accent text-white rounded-full h-6 w-6 text-sm flex items-center justify-center mr-3 mt-1 flex-shrink-0">1</span>
                  <span><Txt tKey="forClientsStep1" /></span>
                </li>
                <li className="flex">
                  <span className="bg-accent text-white rounded-full h-6 w-6 text-sm flex items-center justify-center mr-3 mt-1 flex-shrink-0">2</span>
                  <span><Txt tKey="forClientsStep2" /></span>
                </li>
                <li className="flex">
                  <span className="bg-accent text-white rounded-full h-6 w-6 text-sm flex items-center justify-center mr-3 mt-1 flex-shrink-0">3</span>
                  <span><Txt tKey="forClientsStep3" /></span>
                </li>
              </ol>
            </div>

            {/* For Professionals */}
            <div className="bg-background p-8 rounded-xl shadow-card animate-slideUpFadeIn" style={{ animationDelay: '150ms' }}>
              <div className="flex items-center mb-4">
                <div className="bg-highlight/10 p-3 rounded-full mr-4">
                  <BriefcaseIcon className="w-8 h-8 text-highlight" />
                </div>
                <h3 className="text-2xl font-semibold text-textDarker">
                  {t('forTherapistsTitle', { default: 'For Professionals' })}
                </h3>
              </div>
              <ol className="space-y-4 text-textOnLight/90">
                <li className="flex">
                  <span className="bg-highlight text-white rounded-full h-6 w-6 text-sm flex items-center justify-center mr-3 mt-1 flex-shrink-0">1</span>
                  <span><Txt tKey="forTherapistsStep1" /></span>
                </li>
                <li className="flex">
                  <span className="bg-highlight text-white rounded-full h-6 w-6 text-sm flex items-center justify-center mr-3 mt-1 flex-shrink-0">2</span>
                  <span><Txt tKey="forTherapistsStep2" /></span>
                </li>
                <li className="flex">
                  <span className="bg-highlight text-white rounded-full h-6 w-6 text-sm flex items-center justify-center mr-3 mt-1 flex-shrink-0">3</span>
                  <span><Txt tKey="forTherapistsStep3" /></span>
                </li>
              </ol>
               <div className="mt-6 text-center">
                 <Link to="/login" state={{ isSigningUp: true }}>
                   <Button size="lg" variant="secondary">
                     {t('joinAsProfessionalButton', { default: 'Join as a Professional' })}
                   </Button>
                 </Link>
               </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};