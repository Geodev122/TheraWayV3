import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { usePageTitle } from '../hooks/usePageTitle';
import { DEFAULT_USER_ROLE } from '../constants';
import { Button } from '../components/common/Button';
import { UserRole } from '../types';
import { CheckboxField } from '../components/dashboard/shared/FormElements';
import { useForm, SubmitHandler } from 'react-hook-form';
import toast from 'react-hot-toast';

// Using Font Awesome icons via <i> tags as per index.html setup
const GoogleIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fab fa-google ${className}`}></i>;
const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => <i className={`fab fa-facebook-f ${className}`}></i>;

type FormInputs = {
  name: string;
  email: string;
  password: string;
};

export const LoginPage: React.FC = () => {
  const { t, direction } = useTranslation();
  const [pageTitleKey, setPageTitleKey] = useState('loginPageTitle'); 
  const [roles, setRoles] = useState<UserRole[]>([DEFAULT_USER_ROLE]);
  const [isSignup, setIsSignup] = useState(false);
  
  const { login, signup, signInWithGoogle, signInWithFacebook, isAuthenticated, authLoading, authError, user, actionAttempted, closeLoginPrompt, sendPasswordResetEmail } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const { register, handleSubmit, formState: { errors }, watch, reset, setValue } = useForm<FormInputs>();
  const emailForPasswordReset = watch('email');

  useEffect(() => {
    if ((location.state as any)?.isSigningUp) {
      setIsSignup(true);
      setPageTitleKey('signUpPageTitle');
    } else {
      setIsSignup(false);
      setPageTitleKey('loginPageTitle');
    }
    reset(); // Reset form on view change
  }, [location.state, isSignup, reset]);

  usePageTitle(pageTitleKey);

  useEffect(() => {
    // Display auth errors from context via toast
    if(authError) {
      toast.error(authError);
    }
  }, [authError]);

  if (isAuthenticated && user) {
    closeLoginPrompt(); 
    let redirectTo = '/'; 
    if (user.roles.includes(UserRole.ADMIN)) redirectTo = '/dashboard/admin';
    else if (user.roles.includes(UserRole.THERAPIST)) redirectTo = '/dashboard/therapist';
    else if (user.roles.includes(UserRole.CLINIC_OWNER)) redirectTo = '/dashboard/clinic';
    else if (user.roles.includes(UserRole.CLIENT)) redirectTo = '/dashboard/client/profile';
    
    const from = (location.state as any)?.from?.pathname || actionAttempted || redirectTo;
    return <Navigate to={from} replace />;
  }

  const handleRoleChange = (role: UserRole, isChecked: boolean) => {
    setRoles(prevRoles => {
        const newRoles = isChecked
            ? [...prevRoles, role]
            : prevRoles.filter(r => r !== role);
        if (newRoles.filter(r => r !== UserRole.CLIENT).length === 0 && !newRoles.includes(UserRole.CLIENT)) {
             newRoles.push(UserRole.CLIENT);
        }
        return [...new Set(newRoles)];
    });
  };

  const onSubmit: SubmitHandler<FormInputs> = async (data) => {
    if (isSignup) {
      await signup(data.name, data.email, data.password, roles);
    } else {
      await login(data.email, data.password);
    }
  };

  const handleForgotPassword = async () => {
    if (!emailForPasswordReset) {
      toast.error(t('enterEmailForPasswordReset'));
      return;
    }
    try {
      await sendPasswordResetEmail(emailForPasswordReset);
      toast.success(t('passwordResetEmailSent'));
    } catch (error: any) {
      console.error("Forgot password error:", error);
      toast.error(t('passwordResetFailed'));
    }
  };

  return (
    <div className="min-h-screen flex items-start justify-center bg-background px-5 pt-0 pb-5">
      <div className="bg-primary text-textOnLight p-8 sm:p-10 rounded-xl shadow-2xl w-full max-w-md mt-8 sm:mt-12">
        <div className="text-center mb-8">
          <Link to="/" className="text-4xl font-bold text-accent hover:text-accent/90 transition-colors">
            {t('appName')}
          </Link>
          {actionAttempted && !isSignup && (
            <p className="text-gray-600 mt-2 text-sm">
                {t('loginTo', { action: actionAttempted })}
            </p>
          )}
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {isSignup && (
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                {t('fullName')} <span className="text-red-500">*</span>
              </label>
              <input
                id="name"
                type="text"
                {...register("name", { required: isSignup })}
                className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent/80 sm:text-sm transition-colors text-textOnLight bg-primary"
                placeholder={t('yourNamePlaceholder')}
              />
              {errors.name && <p className="text-xs text-danger mt-1">Full name is required.</p>}
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              {t('emailAddress')} <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email", { required: true, pattern: /^\S+@\S+$/i })}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent/80 sm:text-sm transition-colors text-textOnLight bg-primary"
              placeholder="you@example.com"
            />
             {errors.email && <p className="text-xs text-danger mt-1">A valid email is required.</p>}
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              {t('password')} <span className="text-red-500">*</span>
            </label>
            <input
              id="password"
              type="password"
              autoComplete={isSignup ? "new-password" : "current-password"}
              {...register("password", { required: true, minLength: 6 })}
              className="mt-1 block w-full px-4 py-3 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/80 focus:border-accent/80 sm:text-sm transition-colors text-textOnLight bg-primary"
              placeholder="••••••••"
            />
            {errors.password && <p className="text-xs text-danger mt-1">Password must be at least 6 characters.</p>}
          </div>

          {isSignup && (
             <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('iAmA')} <span className="text-red-500">*</span>
                </label>
                <div className="space-y-2 rounded-md border border-gray-300 p-3">
                    <CheckboxField
                        id="roleClient"
                        label={t('clientLookingForTherapist')}
                        checked={roles.includes(UserRole.CLIENT)}
                        onChange={e => handleRoleChange(UserRole.CLIENT, e.target.checked)}
                        containerClassName="!mb-0"
                    />
                    <CheckboxField
                        id="roleTherapist"
                        label={t('therapist')}
                        checked={roles.includes(UserRole.THERAPIST)}
                        onChange={e => handleRoleChange(UserRole.THERAPIST, e.target.checked)}
                        containerClassName="!mb-0"
                    />
                    <CheckboxField
                        id="roleClinicOwner"
                        label={t('clinicOwner')}
                        checked={roles.includes(UserRole.CLINIC_OWNER)}
                        onChange={e => handleRoleChange(UserRole.CLINIC_OWNER, e.target.checked)}
                        containerClassName="!mb-0"
                    />
                </div>
            </div>
          )}

          {!isSignup && (
            <div className="flex items-center justify-end">
              <div className="text-sm">
                <button type="button" onClick={handleForgotPassword} className="font-medium text-accent hover:text-accent/80">{t('forgotPassword')}</button>
              </div>
            </div>
          )}

          <div>
            <Button type="submit" variant="primary" className="w-full !py-3 text-base" isFullWidth isLoading={authLoading} disabled={authLoading}>
              {authLoading ? t('loading') : (isSignup ? t('signUp') : t('signIn'))}
            </Button>
          </div>
        </form>

        <div className="mt-6 relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-primary text-gray-500">{t('orContinueWith', { default: 'Or continue with'})}</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3">
          <Button
            variant="light"
            onClick={signInWithGoogle}
            disabled={authLoading}
            isFullWidth
            className="!py-3 !text-base !border-gray-300 !text-textOnLight hover:!bg-gray-100"
            leftIcon={<GoogleIcon className={`text-lg ${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />}
          >
            {t('signInWithGoogle', { default: "Sign in with Google" })}
          </Button>
          <Button
            variant="light"
            onClick={signInWithFacebook}
            disabled={authLoading}
            isFullWidth
            className="!py-3 !text-base !bg-[#1877F2] !text-white hover:!bg-[#166FE5] !border-[#1877F2]"
            leftIcon={<FacebookIcon className={`text-lg ${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />}
          >
            {t('signInWithFacebook', { default: "Sign in with Facebook" })}
          </Button>
        </div>

        <p className="mt-8 text-center text-sm text-gray-600">
          {isSignup ? t('alreadyHaveAccount') : t('dontHaveAccount')}{' '}
          <button 
            onClick={() => {
              setIsSignup(!isSignup); 
              setPageTitleKey(isSignup ? 'loginPageTitle' : 'signUpPageTitle'); 
            }} 
            className="font-medium text-accent hover:text-accent/80"
          >
            {isSignup ? t('signIn') : t('signUpNow')}
          </button>
        </p>
      </div>
    </div>
  );
};