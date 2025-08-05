

import React, { useState, useEffect } from 'react';
import { Therapist } from '../types';
import { Modal } from './common/Modal';
import { HeartIcon, MapPinIcon, WhatsAppIcon, ShareIcon, CheckCircleIcon } from './icons'; // Added ShareIcon, CheckCircleIcon
import { Button } from './common/Button';
import { useTranslation } from '../hooks/useTranslation';
import { usePageTitle } from '../hooks/usePageTitle';


interface TherapistDetailModalProps {
  therapist: Therapist | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleFavorite: (therapistId: string) => void;
  isFavorite: boolean;
}

export const TherapistDetailModal: React.FC<TherapistDetailModalProps> = ({ therapist, isOpen, onClose, onToggleFavorite, isFavorite }) => {
  const { t, direction } = useTranslation();
  const [linkCopied, setLinkCopied] = useState(false);
  
  // Set page title when modal is open for a therapist
  usePageTitle(therapist && isOpen ? 'therapistDetailTitle' : 'appName', therapist && isOpen ? {name: therapist.name} : undefined);


  if (!therapist) return null;

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanWhatsAppNumber = therapist.whatsappNumber.replace(/\D/g, '');
    const therapistLastName = therapist.name.split(' ').pop() || '';
    const whatsappMessage = encodeURIComponent(t('whatsappGreeting', { name: therapistLastName, appName: t('appName') }) || `Hello Dr. ${therapistLastName}, I found you on ${t('appName')}.`);
    window.open(`https://wa.me/${cleanWhatsAppNumber}?text=${whatsappMessage}`, '_blank');
  };

  const handleShareProfile = async () => {
    if (!therapist) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}#/therapist/${therapist.id}`;
    const shareData = {
      title: t('appName'),
      text: t('shareProfileOf', { name: therapist.name, default: `Check out ${therapist.name}'s profile on ${t('appName')}`}),
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.error("Error sharing:", err);
        // Fallback to copy if share is cancelled or fails for some reason
        copyToClipboard(shareUrl);
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (text: string) => {
     navigator.clipboard.writeText(text).then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2500);
      }).catch(err => {
        console.error('Failed to copy link: ', err);
        alert(t('shareError'));
      });
  };
  
  const allSpecializations = [
    ...therapist.specializations.filter(s => s.toLowerCase() !== 'other'),
    ...(therapist.otherSpecializations || [])
  ];

  const allLanguages = [
    ...therapist.languages.filter(l => l.toLowerCase() !== 'other'),
    ...(therapist.otherLanguages || [])
  ];

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={therapist.name} size="2xl">
        <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">
            <div className="lg:w-1/3 flex-shrink-0">
                <img 
                    src={therapist.profilePictureUrl} 
                    alt={`Profile of ${therapist.name}`} 
                    className="rounded-lg shadow-md w-full h-auto object-cover aspect-square mb-4"
                />
                <div className="space-y-2">
                    <Button
                        isFullWidth
                        onClick={(e) => { e.stopPropagation(); onToggleFavorite(therapist.id); }}
                        variant={isFavorite ? "secondary" : "primary"}
                        leftIcon={<HeartIcon className={`w-5 h-5 ${isFavorite ? 'text-red-500' : 'text-background'} ${direction === 'rtl' ? 'ms-2' : 'me-2'}`} filled={isFavorite} />}
                    >
                        {isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
                    </Button>
                    <Button 
                        variant="ghost" 
                        size="md" 
                        isFullWidth
                        onClick={handleWhatsAppClick}
                        leftIcon={<WhatsAppIcon className={`text-green-500 ${direction === 'rtl' ? 'ms-2' : 'me-2'}`}/>}
                        className="!border !border-green-500 !text-green-600 hover:!bg-green-500/10"
                    >
                        {t('connectOnWhatsApp')}
                    </Button>
                     <Button
                        isFullWidth
                        onClick={handleShareProfile}
                        variant="ghost"
                        leftIcon={<ShareIcon className={`w-5 h-5 text-accent ${direction === 'rtl' ? 'ms-2' : 'me-2'}`} />}
                        className="!border !border-accent/50 !text-accent hover:!bg-accent/10 relative"
                    >
                        {t('shareProfile')}
                         {linkCopied && (
                            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-accent text-textOnDark text-xs px-2 py-1 rounded-md shadow-lg flex items-center animate-fadeIn">
                                <CheckCircleIcon className="w-3 h-3 mr-1"/> {t('linkCopiedMessage')}
                            </span>
                        )}
                    </Button>
                </div>
            </div>
            <div className="lg:w-2/3">
                <Section title={t('about')}>
                    <p className="text-gray-600 leading-relaxed whitespace-pre-wrap">{therapist.bio}</p>
                </Section>

                <Section title={t('specializations')}>
                    <div className="flex flex-wrap gap-2">
                        {allSpecializations.map(spec => (
                            <span key={spec} className="bg-secondary/30 text-accent px-3 py-1 rounded-full text-sm font-medium">{spec}</span>
                        ))}
                    </div>
                </Section>

                <Section title={t('languagesSpoken')}>
                    <p className="text-gray-600">{allLanguages.join(', ')}</p>
                </Section>

                <Section title={t('qualifications')}>
                 <ul className={`list-disc list-inside text-gray-600 space-y-1 ${direction === 'rtl' ? 'pr-4' : 'ps-4'}`}>
                    {therapist.qualifications.map(q => <li key={q}>{q}</li>)}
                </ul>
                </Section>
                
                <Section title={t('practiceLocations')}>
                    {therapist.locations.map((loc, index) => (
                         <div key={index} className="text-gray-600 mb-2 flex items-start">
                            <MapPinIcon className={`w-5 h-5 text-accent flex-shrink-0 mt-1 ${direction === 'rtl' ? 'ms-2.5' : 'me-2.5'}`} /> 
                            <span>{loc.address}</span>
                        </div>
                    ))}
                    <div className="mt-3 h-48 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                        <MapPinIcon className={`w-8 h-8 text-gray-400 ${direction === 'rtl' ? 'ms-2' : 'me-2'}`}/> {t('interactiveMapPlaceholder')}
                    </div>
                </Section>
            </div>
        </div>
    </Modal>
  );
};

const Section: React.FC<{title: string; children: React.ReactNode}> = ({title, children}) => (
    <div className="mb-5">
        <h4 className="text-md font-semibold text-gray-500 uppercase tracking-wider mb-2 border-b border-gray-200 pb-1">{title}</h4>
        {children}
    </div>
);
