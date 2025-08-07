
import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { UserRole } from '../../../types';
import {
    BriefcaseIcon, BuildingOfficeIcon, ShieldCheckIcon, ChartBarIcon, CogIcon, UsersIcon,
    DocumentDuplicateIcon, TagIcon, PhotoIcon, ChevronDownIcon, ChevronUpIcon,
    ChatBubbleLeftRightIcon, DocumentTextIcon, ClockIcon
} from '../../icons';
import { useTranslation } from '../../../hooks/useTranslation';

interface DashboardLayoutProps {
  role: UserRole;
  children?: React.ReactNode; 
}

interface NavItem {
  path: string;
  labelKey: string; 
  icon: React.ReactNode;
  adminOnly?: boolean;
  therapistOnly?: boolean;
  clinicOnly?: boolean;
}

const therapistNavItems: NavItem[] = [
  { path: '', labelKey: 'dashboardMyProfileTab', icon: <BriefcaseIcon />, therapistOnly: true },
  { path: 'licenses', labelKey: 'dashboardLicensesTab', icon: <DocumentDuplicateIcon />, therapistOnly: true},
  { path: 'analytics', labelKey: 'dashboardAnalyticsTab', icon: <ChartBarIcon />, therapistOnly: true},
  { path: 'space-rental', labelKey: 'dashboardSpaceRentalTab', icon: <BuildingOfficeIcon />, therapistOnly: true},
  { path: 'settings', labelKey: 'dashboardSettingsTab', icon: <CogIcon />, therapistOnly: true },
];

const clinicNavItems: NavItem[] = [
  { path: '', labelKey: 'dashboardClinicProfileTab', icon: <BuildingOfficeIcon />, clinicOnly: true },
  { path: 'my-clinics', labelKey: 'dashboardMyClinicsTab', icon: <BriefcaseIcon />, clinicOnly: true},
  { path: 'bookings', labelKey: 'dashboardBookingsTab', icon: <ClockIcon />, clinicOnly: true},
  { path: 'analytics', labelKey: 'dashboardAnalyticsTab', icon: <ChartBarIcon />, clinicOnly: true},
  { path: 'settings', labelKey: 'dashboardSettingsTab', icon: <CogIcon />, clinicOnly: true},
];

const adminNavItems: NavItem[] = [
  { path: '', labelKey: 'dashboardTherapistsValidationTab', icon: <UsersIcon /> },
  { path: 'clinic-approval', labelKey: 'dashboardClinicApprovalTab', icon: <BuildingOfficeIcon /> },
  { path: 'communication', labelKey: 'dashboardCommunicationTab', icon: <ChatBubbleLeftRightIcon /> },
  { path: 'reports', labelKey: 'dashboardReportsTab', icon: <ChartBarIcon /> },
  { path: 'activity-log', labelKey: 'dashboardActivityLogTab', icon: <DocumentTextIcon /> },
  { path: 'site-management', labelKey: 'dashboardSiteManagementTab', icon: <CogIcon /> },
];


export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, children }) => {
  const { t, direction } = useTranslation();
  let navItems: NavItem[] = [];
  let dashboardTitleKey = '';
  let baseRoute = '';

  switch (role) {
    case UserRole.THERAPIST:
      navItems = therapistNavItems;
      dashboardTitleKey = 'dashboardTherapistTitle';
      baseRoute = '/dashboard/therapist';
      break;
    case UserRole.CLINIC_OWNER:
      navItems = clinicNavItems;
      dashboardTitleKey = 'dashboardClinicOwnerTitle';
      baseRoute = '/dashboard/clinic';
      break;
    case UserRole.ADMIN:
      navItems = adminNavItems;
      dashboardTitleKey = 'dashboardAdminTitle';
      baseRoute = '/dashboard/admin';
      break;
    default:
      return <div className="p-8 text-textOnLight">{t('invalidDashboardRole', {default: 'Invalid dashboard role.'})}</div>;
  }
  
  navItems = navItems.filter(item => 
    (!item.adminOnly || role === UserRole.ADMIN) &&
    (!item.therapistOnly || role === UserRole.THERAPIST) &&
    (!item.clinicOnly || role === UserRole.CLINIC_OWNER)
  );

  return (
    <div className="flex flex-col flex-grow"> 
      <main className="flex-grow p-4 sm:p-6 bg-background text-textDarker overflow-y-auto pt-6 pb-[calc(70px+1rem)]"> 
        <h1 className="text-2xl sm:text-3xl font-bold text-accent mb-6">{t(dashboardTitleKey)}</h1>
        <div className="bg-primary p-4 sm:p-6 rounded-xl shadow-card">
          {children || <ReactRouterDOM.Outlet />} 
        </div>
      </main>

      <nav 
        className="fixed bottom-0 left-0 right-0 h-[70px] bg-primary/95 backdrop-blur-md border-t border-secondary/70 shadow-top-lg z-50 flex justify-around items-stretch"
        aria-label={t('dashboardNavigationLabel', { default: 'Dashboard Navigation' })}
      >
        {navItems.map(item => (
          <ReactRouterDOM.NavLink
            key={item.path}
            to={`${baseRoute}/${item.path}`.replace(/\/$/, '')} 
            end={item.path === ''} 
            className={({ isActive }) =>
              `flex-1 flex flex-col items-center justify-center h-full p-1.5 group focus:outline-none focus:ring-2 focus:ring-accent/50 focus:ring-offset-1 focus:ring-offset-background relative
               transition-all duration-200 ease-in-out active:scale-95 hover:bg-accent/5
              ${
                isActive 
                  ? 'text-accent font-semibold border-t-2 border-accent' 
                  : 'text-textOnLight/70 hover:text-accent' 
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`w-5 h-5 sm:w-6 sm:h-6 mb-0.5 transition-transform duration-200 ease-in-out group-hover:scale-110 ${isActive ? 'text-accent' : 'text-textOnLight/60 group-hover:text-accent'}`}>{item.icon}</span>
                <span className={`text-[10px] sm:text-xs truncate transition-opacity duration-200 ease-in-out group-hover:opacity-100 ${isActive ? 'font-medium' : ''}`}>{t(item.labelKey)}</span>
              </>
            )}
          </ReactRouterDOM.NavLink>
        ))}
      </nav>
    </div>
  );
};

