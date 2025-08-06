
import React from 'react';
import { Therapist } from '../types';
import { HeartIcon, MapPinIcon, WhatsAppIcon, FlowerTickIcon } from './icons';
import { Button } from './common/Button';
import { useTranslation } from '../hooks/useTranslation';

interface TherapistCardProps {
  therapist: Therapist;
  onViewProfile: (therapist: Therapist) => void;
  onToggleFavorite: (therapistId: string) => void;
  isFavorite: boolean;
}

const TherapistCardComponent: React.FC<TherapistCardProps> = ({ therapist, onViewProfile, onToggleFavorite, isFavorite }) => {
  const { t, direction } = useTranslation();
  
  const handleWhatsAppClick = (e: React.MouseEvent) => {
    e.stopPropagation(); 
    window.open(`https://wa.me/${therapist.whatsappNumber.replace(/\D/g, '')}?text=${encodeURIComponent(t('whatsappGreeting', { name: therapist.name.split(' ').pop() || '', appName: t('appName') }))}`, '_blank');
  };

  const allSpecializations = [
    ...therapist.specializations.filter(s => s.toLowerCase() !== 'other'),
    ...(therapist.otherSpecializations || [])
  ];

  return (
    <div 
      className="bg-primary rounded-xl shadow-card flex flex-col h-full transition-all duration-300 ease-in-out theraway-card-hover cursor-pointer"
      onClick={() => onViewProfile(therapist)}
      role="button"
      aria-label={`${t('viewProfileFor', { name: therapist.name })}`}
    >
      <div className="relative">
        <img 
            className="w-full h-56 object-cover rounded-t-xl" 
            src={therapist.profilePictureUrl} 
            alt={`${t('profileOf', { name: therapist.name })}`}
            loading="lazy" 
        />
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(therapist.id); }}
          className="absolute top-3 right-3 bg-primary/80 backdrop-blur-sm p-2.5 rounded-full shadow-md hover:bg-red-100/80 transition-colors text-textOnLight/80 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          aria-label={isFavorite ? t('removeFromFavorites') : t('addToFavorites')}
        >
          <HeartIcon className={`w-5 h-5 ${isFavorite ? 'text-red-500' : ''}`} filled={isFavorite} />
        </button>
         {therapist.isVerified && (
            <div className="absolute top-3 left-3 bg-accent/80 backdrop-blur-sm p-1.5 rounded-full shadow-md" title={t('verified') ?? "Verified"}>
                <FlowerTickIcon className="w-5 h-5 text-white" />
            </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-xl font-semibold text-textDarker truncate" title={therapist.name}>{therapist.name}</h3>
        </div>
        
        <p className="text-xs text-textOnLight/70 mb-1.5">
            {t('specializations')}: <span className="font-medium text-textOnLight/90">{allSpecializations.slice(0,2).join(', ')}{allSpecializations.length > 2 ? '...' : ''}</span>
        </p>
        <p className="text-xs text-textOnLight/70 mb-3 flex items-center">
            <MapPinIcon className={`inline w-3.5 h-3.5 text-accent flex-shrink-0 ${direction === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`} /> 
            <span className="truncate" title={therapist.locations[0]?.address}>{therapist.locations[0]?.address.split(',').slice(0,2).join(',') || t('onlinePractice')}</span>
        </p>
        
        <p className="text-sm text-textOnLight/80 mb-5 line-clamp-3 flex-grow leading-relaxed">{therapist.bio}</p>

        <div className="mt-auto pt-4 border-t border-secondary/70">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button 
                variant="primary" 
                size="md" 
                className="w-full sm:w-auto flex-1"
                onClick={(e) => { e.stopPropagation(); onViewProfile(therapist); }}
            >
                {t('viewProfile')}
            </Button>
            {therapist.whatsappNumber && (
            <Button 
                variant="ghost" 
                size="md" 
                className="w-full sm:w-auto flex-1 border !border-green-500 !text-green-600 hover:!bg-green-500/10"
                onClick={handleWhatsAppClick}
                leftIcon={<WhatsAppIcon className="text-green-500"/>}
            >
                {t('connectOnWhatsApp')}
            </Button>
            )}
            </div>
        </div>
      </div>
    </div>
  );
};

export const TherapistCard = React.memo(TherapistCardComponent);
