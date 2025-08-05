

import React from 'react';
import * as ReactRouterDOM from 'react-router-dom';
import { Modal } from '../common/Modal';
import { Button } from '../common/Button';
import { UserCircleIcon, ExclamationTriangleIcon } from '../icons'; 
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  actionAttempted?: string | null;
}

export const LoginPromptModal: React.FC<LoginPromptModalProps> = ({ isOpen, onClose, actionAttempted }) => {
  const navigate = ReactRouterDOM.useNavigate();
  const { t, direction } = useTranslation();

  const handleLoginRedirect = () => {
    onClose();
    navigate('/login', { state: { fromAction: actionAttempted || 'interaction' } });
  };

  const handleSignupRedirect = () => {
    onClose();
    navigate('/login', { state: { fromAction: actionAttempted || 'interaction', isSigningUp: true } });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('authenticationRequired')} size="lg">
      <div className="text-center relative">
        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-textOnLight mb-2">{t('pleaseSignInOrSignUp')}</h3>
        <p className="text-gray-600 mb-6">
          {t('authModalMessage', { action: actionAttempted || t('continueAction', {default: "continue with this action"}), appName: t('appName')})}
        </p>
        <div className="space-y-3 sm:space-y-0 sm:flex sm:flex-row-reverse sm:gap-3 mb-6">
          <Button 
            variant="primary" 
            onClick={handleLoginRedirect}
            isFullWidth 
            className="sm:ml-3"
            leftIcon={<UserCircleIcon className={`w-5 h-5 ${direction === 'rtl' ? 'ms-2' : 'me-2'}`}/>}
          >
            {t('signInManually')}
          </Button>
          <Button 
            variant="primary" // Changed from "secondary" to "primary"
            onClick={handleSignupRedirect} 
            isFullWidth
          >
            {t('createAccount')}
          </Button>
        </div>

         <button 
            onClick={onClose}
            className="mt-8 text-sm text-gray-500 hover:text-gray-700"
        >
            {t('maybeLater')}
        </button>
      </div>
    </Modal>
  );
};
