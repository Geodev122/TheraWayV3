
import React, { Suspense } from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LanguageProvider } from './contexts/LanguageContext';
import { useTranslation } from './hooks/useTranslation';
import { Navbar } from './components/Navbar';
import { LoginPromptModal } from './components/auth/LoginPromptModal';
import { UserRole } from './types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { ErrorBoundary } from './components/ErrorBoundary';
import { firebaseConfig } from './firebase';
import { FirebaseConfigMissing } from './components/FirebaseConfigMissing';


// Lazy load page components for better performance
const HomePage = React.lazy(() => import('./pages/HomePage').then(module => ({ default: module.HomePage })));
const LoginPage = React.lazy(() => import('./pages/LoginPage').then(module => ({ default: module.LoginPage })));
const TherapistFinderPage = React.lazy(() => import('./pages/TherapistFinderPage').then(module => ({ default: module.TherapistFinderPage })));
const TherapistDashboardRoutes = React.lazy(() => import('./pages/dashboard/therapist/TherapistDashboardPage').then(module => ({ default: module.TherapistDashboardRoutes })));
const ClinicOwnerDashboardRoutes = React.lazy(() => import('./pages/dashboard/clinic-owner/ClinicOwnerDashboardPage').then(module => ({ default: module.ClinicOwnerDashboardRoutes })));
const AdminDashboardRoutes = React.lazy(() => import('./pages/dashboard/admin/AdminDashboardPage').then(module => ({ default: module.AdminDashboardRoutes })));
const ClientProfilePage = React.lazy(() => import('./pages/dashboard/client/ClientProfilePage').then(module => ({ default: module.ClientProfilePage })));


const ProtectedRoute: React.FC<{ children: React.ReactNode; allowedRoles: UserRole[] }> = ({ children, allowedRoles }) => {
  const { isAuthenticated, user, authLoading } = useAuth(); 
  const location = ReactRouterDOM.useLocation();
  const { t } = useTranslation();

  if (authLoading) { 
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-accent" title={t('loading')}/>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <ReactRouterDOM.Navigate to="/login" state={{ from: location }} replace />;
  }

  // Check if the user has at least one of the allowed roles
  // Updated to check for custom claims first for efficiency
  const isAdminByClaim = user?.customClaims?.admin === true;
  const hasRole = isAdminByClaim || (user && allowedRoles.some(role => user.roles.includes(role)));

  if (!hasRole) {
    // If user doesn't have the required role, redirect to their highest-priority dashboard
    let defaultDashboard = '/'; 
    if (isAdminByClaim || user?.roles.includes(UserRole.ADMIN)) defaultDashboard = '/dashboard/admin';
    else if (user?.roles.includes(UserRole.THERAPIST)) defaultDashboard = '/dashboard/therapist';
    else if (user?.roles.includes(UserRole.CLINIC_OWNER)) defaultDashboard = '/dashboard/clinic';
    else if (user?.roles.includes(UserRole.CLIENT)) defaultDashboard = '/dashboard/client/profile';
    
    return <ReactRouterDOM.Navigate to={defaultDashboard} replace />; 
  }

  return <>{children}</>;
};


const AppContent: React.FC = () => {
  const { isAuthenticated, authLoading, isLoginPromptVisible, closeLoginPrompt, actionAttempted, user } = useAuth(); 
  const { t } = useTranslation();

  // This initial loader is for Auth state, not Language state (which has its own).
  if (authLoading && !isLoginPromptVisible && !user) {  
     return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-accent" title={t('loading')}/>
      </div>
    );
  }
  
  const LoadingFallback: React.FC = () => (
    <div className="flex items-center justify-center flex-grow pt-20">
      <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-accent" title={t('loading')}/>
    </div>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background"> 
      <Navbar />
      <main className="flex-grow flex flex-col pt-[calc(4rem+1px)]"> 
        <Suspense fallback={<LoadingFallback />}>
          <ReactRouterDOM.Routes>
            {/* Public Routes */}
            <ReactRouterDOM.Route path="/" element={<HomePage />} />
            <ReactRouterDOM.Route path="/login" element={<LoginPage />} />
            <ReactRouterDOM.Route path="/find" element={<TherapistFinderPage />} /> 
            <ReactRouterDOM.Route path="/find/therapist/:therapistId" element={<TherapistFinderPage />} />

            {/* --- Redirects for backward compatibility --- */}
            <ReactRouterDOM.Route path="/therapists" element={<ReactRouterDOM.Navigate to="/find" replace />} />
            <ReactRouterDOM.Route path="/therapist/:therapistId" element={<ReactRouterDOM.Navigate to="/find/therapist/:therapistId" replace />} />


            {/* Protected Dashboard Routes */}
            <ReactRouterDOM.Route 
              path="/dashboard/client/profile"
              element={
                <ProtectedRoute allowedRoles={[UserRole.CLIENT, UserRole.ADMIN]}>
                  <ClientProfilePage />
                </ProtectedRoute>
              }
            />
            <ReactRouterDOM.Route 
              path="/dashboard/therapist/*" 
              element={
                <ProtectedRoute allowedRoles={[UserRole.THERAPIST, UserRole.ADMIN]}>
                  <TherapistDashboardRoutes />
                </ProtectedRoute>
              } 
            />
            <ReactRouterDOM.Route 
              path="/dashboard/clinic/*" 
              element={
                <ProtectedRoute allowedRoles={[UserRole.CLINIC_OWNER, UserRole.ADMIN]}>
                  <ClinicOwnerDashboardRoutes />
                </ProtectedRoute>
              } 
            />
            <ReactRouterDOM.Route 
              path="/dashboard/admin/*" 
              element={
                <ProtectedRoute allowedRoles={[UserRole.ADMIN]}>
                  <AdminDashboardRoutes />
                </ProtectedRoute>
              } 
            />
            
            <ReactRouterDOM.Route 
              path="*" 
              element={
                authLoading ? <LoadingFallback /> : 
                isAuthenticated && user ? (
                  user.customClaims?.admin || user.roles.includes(UserRole.ADMIN) ? <ReactRouterDOM.Navigate to="/dashboard/admin" replace /> :
                  user.roles.includes(UserRole.THERAPIST) ? <ReactRouterDOM.Navigate to="/dashboard/therapist" replace /> :
                  user.roles.includes(UserRole.CLINIC_OWNER) ? <ReactRouterDOM.Navigate to="/dashboard/clinic" replace /> :
                  user.roles.includes(UserRole.CLIENT) ? <ReactRouterDOM.Navigate to="/dashboard/client/profile" replace /> :
                  <ReactRouterDOM.Navigate to="/" replace /> 
                ) : <ReactRouterDOM.Navigate to="/" replace /> // Default to homepage if not authenticated
              } 
            />
          </ReactRouterDOM.Routes>
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

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false, // Optional: disable aggressive refetching
    },
  },
});

const App: React.FC = () => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    return <FirebaseConfigMissing />;
  }

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <LanguageProvider>
          <AuthProvider>
            <ReactRouterDOM.BrowserRouter>
              <AppContent />
              <Toaster position="top-center" reverseOrder={false} toastOptions={{
                className: 'font-semibold',
                style: {
                    borderRadius: '8px',
                    background: '#3C3633',
                    color: '#fff',
                }
              }}/>
            </ReactRouterDOM.BrowserRouter>
          </AuthProvider>
        </LanguageProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
