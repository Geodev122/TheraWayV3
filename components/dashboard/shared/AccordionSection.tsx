import React from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '../../icons';
import { useTranslation } from '../../../hooks/useTranslation';

interface AccordionSectionProps {
    titleKey: string;
    icon?: React.ReactElement<{ className?: string }>;
    isOpen: boolean;
    onClick: () => void;
    children: React.ReactNode;
    badgeText?: string;
    badgeColor?: string;
}

export const AccordionSection: React.FC<AccordionSectionProps> = ({ titleKey, icon, isOpen, onClick, children, badgeText, badgeColor }) => {
    const { t, direction } = useTranslation();
    return (
        <div className="border border-secondary/70 rounded-lg overflow-hidden transition-all duration-300">
            <button
                type="button"
                className={`w-full flex items-center justify-between p-4 text-left font-medium text-textDarker hover:bg-secondary/30 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-accent/50 transition-colors ${isOpen ? 'bg-secondary/30 border-b border-secondary/70' : ''}`}
                onClick={onClick}
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${titleKey.replace(/\s+/g, '-')}`}
            >
                <span className="flex items-center">
                    {icon && React.cloneElement(icon, { className: `w-5 h-5 ${direction === 'rtl' ? 'ml-3' : 'mr-3'} text-accent`})}
                    <span className="font-semibold">{t(titleKey)}</span>
                     {badgeText && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeColor || 'bg-gray-200 text-gray-800'} ${direction === 'rtl' ? 'mr-3' : 'ml-3'}`}>
                            {badgeText}
                        </span>
                    )}
                </span>
                {isOpen ? <ChevronUpIcon className="w-5 h-5 text-gray-600" /> : <ChevronDownIcon className="w-5 h-5 text-gray-600" />}
            </button>
            {isOpen && (
                <div id={`accordion-content-${titleKey.replace(/\s+/g, '-')}`} className="p-4 sm:p-6 bg-primary">
                    {children}
                </div>
            )}
        </div>
    );
};
