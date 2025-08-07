
import React, { useState } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { Button } from './common/Button';
import { UserCircleIcon, MenuIcon, XIcon, BriefcaseIcon, BuildingOfficeIcon, ShieldCheckIcon, ChevronDownIcon } from './icons';
import { UserRole } from '../types';

export const Navbar: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const { t, language, setLanguage, direction } = useTranslation();
  const navigate = ReactRouterDOM.useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setIsMobileMenuOpen(false);
    navigate('/'); 
  };

  const handleLoginClick = () => {
    setIsMobileMenuOpen(false);
    navigate('/login');
  }

  const getNextLanguage = (lang: string) => {
    if (lang === 'en') return 'ar';
    if (lang === 'ar') return 'fr';
    return 'en';
  };

  const toggleLanguage = () => {
    setLanguage(getNextLanguage(language));
    setIsMobileMenuOpen(false);
  };

  const languageLabels: Record<string, string> = {
    en: t('english'),
    ar: t('arabic'),
    fr: t('french'),
  };

  const languageAbbreviations: Record<string, string> = {
    en: 'EN',
    ar: 'AR',
    fr: 'FR',
  };

  const nextLanguage = getNextLanguage(language);

  const publicLinks = [
    { path: '/find', labelKey: 'findTherapists' },
  ];

  const authenticatedUserLinks: {path: string, labelKey: string, icon?: React.ReactNode, roles: UserRole[]}[] = [];

  if (user) {
      if (user.roles.includes(UserRole.ADMIN)) {
        authenticatedUserLinks.push({ path: '/dashboard/admin', labelKey: 'adminPanel', icon: <ShieldCheckIcon className={`w-4 h-4 ${direction === 'rtl' ? 'ms-1.5' : 'me-1.5'}`}/>, roles: [UserRole.ADMIN] });
      }
      if (user.roles.includes(UserRole.THERAPIST)) {
        authenticatedUserLinks.push({ path: '/dashboard/therapist', labelKey: 'myDashboard', icon: <BriefcaseIcon className={`w-4 h-4 ${direction === 'rtl' ? 'ms-1.5' : 'me-1.5'}`}/>, roles: [UserRole.THERAPIST] });
      }
      if (user.roles.includes(UserRole.CLINIC_OWNER)) {
          authenticatedUserLinks.push({ path: '/dashboard/clinic', labelKey: 'clinicDashboard', icon: <BuildingOfficeIcon className={`w-4 h-4 ${direction === 'rtl' ? 'ms-1.5' : 'me-1.5'}`}/>, roles: [UserRole.CLINIC_OWNER] });
      }
      if (user.roles.includes(UserRole.CLIENT)) {
          authenticatedUserLinks.push({ path: '/dashboard/client/profile', labelKey: 'clientProfileManagementTab', icon: <UserCircleIcon className={`w-4 h-4 ${direction === 'rtl' ? 'ms-1.5' : 'me-1.5'}`}/>, roles: [UserRole.CLIENT] });
      }
  }
  
  const commonLinks: {path: string, labelKey: string}[] = [
    // { path: '/about', labelKey: 'aboutUs' },
    // { path: '/contact', labelKey: 'contact' },
  ];

  const linkBaseClass = "px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150";
  const desktopLinkClass = `text-textOnLight/80 hover:text-accent hover:bg-accent/10 ${linkBaseClass}`;
  const mobileLinkClass = `text-textOnLight/90 hover:text-accent hover:bg-accent/10 block ${linkBaseClass} text-base`;

  // Filter out duplicate links for users with multiple roles, e.g., an admin who is also a therapist.
  const uniqueAuthenticatedLinks = authenticatedUserLinks.filter((link, index, self) =>
    index === self.findIndex((l) => (
      l.path === link.path
    ))
  );


  const renderLinks = (isMobile: boolean) => (
    <>
      {publicLinks.map(link => (
        <ReactRouterDOM.Link 
          key={link.path} 
          to={link.path} 
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={isMobile ? mobileLinkClass : desktopLinkClass}
        >
          {t(link.labelKey)}
        </ReactRouterDOM.Link>
      ))}
      {isAuthenticated && uniqueAuthenticatedLinks.map(link => (
         <ReactRouterDOM.Link 
          key={link.path} 
          to={link.path} 
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={`${isMobile ? mobileLinkClass : desktopLinkClass} flex items-center`}
        >
          {link.icon}{t(link.labelKey)}
        </ReactRouterDOM.Link>
      ))}
      {commonLinks.map(link => (
        <ReactRouterDOM.Link 
          key={link.path} 
          to={link.path} 
          onClick={() => isMobile && setIsMobileMenuOpen(false)}
          className={isMobile ? mobileLinkClass : desktopLinkClass}
          >
          {t(link.labelKey)}
        </ReactRouterDOM.Link>
      ))}
    </>
  );

  return (
    <nav className="bg-background/80 backdrop-blur-md shadow-subtle sticky top-0 z-[1000] border-b border-secondary/50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <ReactRouterDOM.Link to="/" className="flex items-center text-decoration-none hover:opacity-90 transition-opacity">
              <img src="/logo.png" alt="TheraWay Logo" className="h-9 w-auto mr-2" />
              <span className="text-2xl font-bold">
                <span className="text-textDarker">Thera</span><span className="text-accent">Way</span>
              </span>
            </ReactRouterDOM.Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-1"> 
            {renderLinks(false)}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="!px-3 !py-2 !text-textOnLight/70 hover:!text-accent hover:!bg-accent/10"
              title={`Switch to ${languageLabels[nextLanguage]}`}
            >
              {languageLabels[nextLanguage]}
            </Button>
            {isAuthenticated && user ? (
              <div className="relative group">
                <Button 
                  variant="ghost" 
                  className={`flex items-center !px-3 !py-2 !text-textOnLight/80 group-hover:!text-accent group-hover:!bg-accent/10 rounded-lg`}
                >
                  {user.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt={user.name || 'User Avatar'} className={`h-7 w-7 rounded-full object-cover ${direction === 'rtl' ? 'ms-2' : 'me-2'}`} />
                  ) : (
                    <UserCircleIcon className={`h-6 w-6 text-textOnLight/60 group-hover:text-accent ${direction === 'rtl' ? 'ms-2' : 'me-2'}`} />
                  )}
                  <span className="text-sm font-medium truncate max-w-[100px] group-hover:text-accent">{user.name}</span>
                  <ChevronDownIcon className={`w-4 h-4 ${direction === 'rtl' ? 'mr-1' : 'ml-1'} text-textOnLight/60 group-hover:text-accent transition-transform duration-200 group-hover:rotate-180`} />
                </Button>
                <div className={`absolute mt-2 w-60 bg-primary rounded-xl shadow-modal py-1.5 hidden group-hover:block ring-1 ring-black ring-opacity-5 ${direction === 'rtl' ? 'start-0' : 'end-0'} z-50`}>
                  <div className="px-4 py-3 border-b border-secondary/70">
                    <p className="text-sm font-semibold text-textDarker truncate">{user.name}</p>
                    <p className="text-xs text-textOnLight/70 truncate">{user.email}</p>
                    <p className="text-xs text-accent font-medium capitalize mt-0.5">{user.roles.map(r => r.toLowerCase().replace('_', ' ')).join(', ')}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className={`block w-full px-4 py-2.5 text-sm text-textOnLight hover:bg-secondary/50 hover:text-accent transition-colors ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
                  >
                    {t('logout')}
                  </button>
                </div>
              </div>
            ) : (
              <Button variant="primary" size="sm" onClick={handleLoginClick}>
                {t('loginSignup')}
              </Button>
            )}
          </div>

          <div className="md:hidden flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleLanguage}
              className="!p-2 !text-textOnLight/70 hover:!text-accent hover:!bg-accent/10"
              title={`Switch to ${languageLabels[nextLanguage]}`}
            >
              {languageAbbreviations[nextLanguage]}
            </Button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className={`inline-flex items-center justify-center p-2 rounded-md text-textOnLight/70 hover:text-accent hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent ${direction === 'rtl' ? 'ms-2' : 'me-2'}`}
              aria-controls="mobile-menu"
              aria-expanded={isMobileMenuOpen}
            >
              <span className="sr-only">Open main menu</span>
              {isMobileMenuOpen ? (
                <XIcon className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <MenuIcon className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </div>

      {isMobileMenuOpen && (
        <div className="md:hidden bg-primary shadow-lg border-t border-secondary/50 animate-fadeIn">
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
            {renderLinks(true)}
          </div>
          <div className="pt-4 pb-3 border-t border-secondary/70">
            {isAuthenticated && user ? (
              <>
                <div className="flex items-center px-5">
                  {user.profilePictureUrl ? (
                    <img src={user.profilePictureUrl} alt={user.name || 'User Avatar'} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <UserCircleIcon className="h-10 w-10 text-accent" />
                  )}
                  <div className={`${direction === 'rtl' ? 'me-3' : 'ms-3'}`}>
                    <div className="text-base font-medium text-textDarker">{user.name}</div>
                    <div className="text-sm font-medium text-textOnLight/70">{user.email} ({user.roles.map(r => r.toLowerCase().replace('_', ' ')).join(', ')})</div>
                  </div>
                </div>
                <div className="mt-3 px-2 space-y-1">
                  <button
                    onClick={handleLogout}
                    className={`${mobileLinkClass} w-full ${direction === 'rtl' ? 'text-right' : 'text-left'}`}
                  >
                    {t('logout')}
                  </button>
                </div>
              </>
            ) : (
              <div className="px-2">
                <Button variant="primary" isFullWidth onClick={handleLoginClick}>
                  {t('loginSignup')}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};
