

import React from 'react';
import { XIcon } from '../icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | 'full'; 
  titleClassName?: string;
  contentClassName?: string;
  headerClassName?: string;
}

const ModalComponent: React.FC<ModalProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children, 
    size = 'md',
    titleClassName = 'text-xl font-semibold text-textDarker',
    contentClassName = 'p-5 sm:p-6 overflow-y-auto flex-grow text-textOnLight',
    headerClassName = 'flex items-center justify-between p-5 border-b border-secondary/70'
}) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    full: 'max-w-full h-full sm:max-w-4xl md:max-w-5xl lg:max-w-6xl' 
  };

  return (
    <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm flex justify-center items-center z-[1010] p-4 transition-opacity duration-300 ease-in-out animate-fadeIn"
        onClick={onClose} 
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
    >
      <div
        className={`bg-primary rounded-xl shadow-modal relative w-full ${sizeClasses[size]} transform transition-all duration-300 ease-out flex flex-col max-h-[90vh] animate-modalShow`}
        onClick={(e) => e.stopPropagation()} 
      >
        <div className={headerClassName}>
            {title && <h2 id="modal-title" className={titleClassName}>{title}</h2>}
            <button
            onClick={onClose}
            className="text-textOnLight/60 hover:text-accent transition-colors p-1.5 rounded-full hover:bg-accent/10 focus:outline-none focus:ring-2 focus:ring-accent/50"
            aria-label="Close modal"
            >
            <XIcon className="w-5 h-5" />
            </button>
        </div>
        <div className={contentClassName}>
            {children}
        </div>
      </div>
    </div>
  );
};

export const Modal = React.memo(ModalComponent);