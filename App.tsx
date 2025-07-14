import React, { Suspense, useMemo } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { Navbar } from './components/Navbar'; 
import { LoginPromptModal } from './components/auth/LoginPromptModal';
import { UserRole, User } from './types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';


// Lazy load page components for better performance
const HomePage = React.lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const TherapistFinderPage = React.lazy(() => import('./pages/TherapistFinderPage').then(module => ({ default: module.TherapistFinderPage })));
const TherapistDashboardRoutes = React.lazy(() => import('./pages/dashboard/therapist/TherapistDashboardPage').then(module => ({ default: module.TherapistDashboardRoutes })));
const ClinicOwnerDashboardRoutes = React.lazy(() => import('./pages/dashboard/clinic-owner/ClinicOwnerDashboardPage').then(module => ({ default: module.ClinicOwnerDashboardRoutes })));
const AdminDashboardRoutes = React.lazy(() => import('./pages/dashboard/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardRoutes })));
const ClientProfilePage = React.lazy(() => import('./pages/dashboard/client/ClientProfilePage').then(module => ({ default: module.ClientProfilePage })));
const NotFoundPage = React.lazy(() => import('./pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));

// Helper function to determine the highest priority dashboard for a user
const getDashboardPathForUser = (user: User | null): string => {
  if (!user) return '/';

  const { roles, customClaims } = user;
  const isAdmin = customClaims?.admin === true || roles.includes(UserRole.ADMIN);

  if (isAdmin) return '/dashboard/admin';
  if (roles.includes(UserRole.THERAPIST)) return '/dashboard/therapist';
  if (roles.includes(UserRole.CLINIC_OWNER)) return '/dashboard/clinic';
  if (roles.includes(UserRole.CLIENT)) return '/dashboard/client/profile';
  
  return '/'; // Fallback to home page for users with no specific role dashboard
};

const LegacyTherapistRedirect: React.FC = () => {
  const { therapistId } = useParams<{ therapistId: string }>();
  return <Navigate to={`/find/therapist/${therapistId}`} replace />;
};

// --- Reusable Loader Components ---
const FullScreenLoader: React.FC<{ title?: string }> = ({ title }) => (
  <div className="flex items-center justify-center min-h-screen bg-background">
    <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-accent" title={title || 'Loading...'}/>
  </div>
);

const PageLoader: React.FC<{ title?: string }> = ({ title }) => (
  <div className="flex items-center justify-center flex-grow pt-20">
    <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-accent" title={title || 'Loading page...'}/>
  </div>
);

/**
 * A layout component that provides the main UI shell (Navbar, etc.) for the application.
 * It uses an <Outlet> to render the current page's content.
 */
const AppLayout: React.FC = () => {
  const { isLoginPromptVisible, closeLoginPrompt, actionAttempted } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-grow flex flex-col pt-[calc(4rem+1px)]">
        <Suspense fallback={<PageLoader title={t('loading')} />}>
          <Outlet />
        </Suspense>
      </main>
      <LoginPromptModal
        isOpen={isLoginPromptVisible}
        onClose={closeLoginPrompt}
        actionAttempted={actionAttempted}
      />
    </div>
  );
};

/**
 * A layout component that protects all dashboard routes.
 * It ensures the user is authenticated before rendering child routes via an <Outlet>.
 */
const DashboardAuthGuard: React.FC = () => {
  const { isAuthenticated, authLoading } = useAuth();
  const location = useLocation();

  if (authLoading) {
    return <FullScreenLoader title="Verifying access..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

/**
 * A component that guards specific routes based on user roles.
 * This should be used inside an authenticated context (like DashboardAuthGuard).
 */
const RoleGuard: React.FC<{ children: React.ReactNode; allowedRoles: UserRole[] }> = ({ children, allowedRoles }) => {
  const { user } = useAuth();

  const isAdminByClaim = useMemo(() => user?.customClaims?.admin === true, [user]);
  const hasRole = useMemo(() => isAdminByClaim || (user && allowedRoles.some(role => user.roles.includes(role))), [user, isAdminByClaim, allowedRoles]);

  if (!hasRole) {
    // If the user is authenticated but lacks the required role, redirect them to their default dashboard.
    return <Navigate to={getDashboardPathForUser(user)} replace />; 
  }

  return <>{children}</>;
};

/**
 * A component to handle the redirect for the base /dashboard path.
 */
const DashboardRedirect: React.FC = () => {
  const { user } = useAuth();
  // This component is only rendered for authenticated users, so user should not be null.
  return <Navigate to={getDashboardPathForUser(user)} replace />;
};
  
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        {/* --- Public Routes --- */}
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/find" element={<TherapistFinderPage />} />
        <Route path="/find/therapist/:therapistId" element={<TherapistFinderPage />} />

        {/* --- Redirects for backward compatibility --- */}
        <Route path="/therapists" element={<Navigate to="/find" replace />} />
        <Route path="/therapist/:therapistId" element={<LegacyTherapistRedirect />} />

        {/* --- Protected Dashboard Routes --- */}
        <Route element={<DashboardAuthGuard />}>
          <Route path="/dashboard" element={<DashboardRedirect />} />
          <Route path="/dashboard/client/profile" element={
            <RoleGuard allowedRoles={[UserRole.CLIENT, UserRole.ADMIN]}>
              <ClientProfilePage />
            </RoleGuard>
          } />
          <Route path="/dashboard/therapist/*" element={
            <RoleGuard allowedRoles={[UserRole.THERAPIST, UserRole.ADMIN]}>
              <TherapistDashboardRoutes />
            </RoleGuard>
          } />
          <Route path="/dashboard/clinic/*" element={
            <RoleGuard allowedRoles={[UserRole.CLINIC_OWNER, UserRole.ADMIN]}>
              <ClinicOwnerDashboardRoutes />
            </RoleGuard>
          } />
          <Route path="/dashboard/admin/*" element={
            <RoleGuard allowedRoles={[UserRole.ADMIN]}>
              <AdminDashboardRoutes />
            </RoleGuard>
          } />
        </Route>

        {/* --- Not Found Route --- */}
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Optional: disable aggressive refetching
    },
  },
});

const AppStartup: React.FC = () => {
  const { authLoading } = useAuth();
  const { isLoaded: languageIsLoaded } = useLanguage();

  // This unified loader prevents content from rendering until both auth and language are ready.
  if (authLoading || !languageIsLoaded) {
    return <FullScreenLoader title="Loading..." />;
  }

  return <AppRoutes />;
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider> 
          <AuthProvider>
            <BrowserRouter>
              <AppStartup />
              <Toaster position="top-center" reverseOrder={false} toastOptions={{
                className: 'font-semibold',
                style: {
                    borderRadius: '8px',
                    background: '#3C3633',
                    color: '#fff',
                }
              }}/>
            </BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
