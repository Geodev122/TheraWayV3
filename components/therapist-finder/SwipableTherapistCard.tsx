import React, {useState} from 'react';
import { Therapist } from '../../types';
import { MapPinIcon, PlayIcon, InformationCircleIcon, FlowerTickIcon } from '../icons';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../common/Button';

interface SpotlightTherapistCardProps {
  therapist: Therapist;
  onViewProfile: () => void;
}

const SpotlightTherapistCardComponent: React.FC<SpotlightTherapistCardProps> = ({ therapist, onViewProfile }) => {
  const [showVideo, setShowVideo] = useState(false);
  const { t, direction } = useTranslation();

  const handleVideoToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (therapist.introVideoUrl) {
      setShowVideo(!showVideo);
    }
  };
  
  const allSpecializations = [
    ...therapist.specializations.filter(s => s.toLowerCase() !== 'other'),
    ...(therapist.otherSpecializations || [])
  ];

  return (
    <div
        className="w-full h-full bg-primary rounded-2xl shadow-card overflow-hidden flex flex-col select-none group"
        role="article"
        aria-label={`${t('profileOf', { name: therapist.name, default: `Profile of ${therapist.name}`})}`}
    >
      {/* Image/Video Area */}
      <div
        className="relative w-full flex-grow min-h-0 bg-gray-700" // Darker bg for image loading
      >
        {showVideo && therapist.introVideoUrl ? (
           <video
            src={therapist.introVideoUrl}
            controls
            autoPlay
            playsInline
            className="w-full h-full object-cover"
            onClick={(e) => e.stopPropagation()}
            onEnded={() => setShowVideo(false)}
            aria-label={t('introVideoOf', { name: therapist.name, default: `Intro video of ${therapist.name}`})}
          >
            {t('videoNotSupported', {default: "Your browser does not support the video tag."})}
          </video>
        ) : (
          <img
            src={therapist.profilePictureUrl}
            alt={t('profileOf', { name: therapist.name, default: `Profile of ${therapist.name}`})}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        )}

        {/* Gradient Overlay for Text on Image */}
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/80 via-black/50 to-transparent pointer-events-none"></div>
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-black/30 via-black/10 to-transparent pointer-events-none"></div>

        {/* Play Icon */}
        {!showVideo && therapist.introVideoUrl && (
            <button 
              onClick={handleVideoToggle}
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 opacity-0 group-hover:opacity-100 focus:opacity-100 focus:outline-none`}
              aria-label={t('playIntroVideo', {default: "Play intro video"})}
            >
              <PlayIcon className="w-20 h-20 text-white/80 drop-shadow-lg"/>
            </button>
        )}
        
        {/* Verification Icon */}
        {therapist.isVerified && (
            <div className={`absolute top-4 ${direction === 'rtl' ? 'right-4' : 'left-4'} bg-accent/70 backdrop-blur-sm p-2 rounded-full shadow-md`} title={t('verified') ?? "Verified"}>
                <FlowerTickIcon className="w-5 h-5 text-white" />
            </div>
        )}

        {/* Name & Basic Info on Image Area */}
        <div className={`absolute bottom-0 left-0 right-0 p-4 sm:p-5 text-white ${direction === 'rtl' ? 'text-right' : 'text-left'}`}>
          <h2 className="text-2xl sm:text-3xl font-bold truncate mb-0.5" title={therapist.name}>
            {therapist.name}
          </h2>
          <p className="text-sm sm:text-base text-white/90 truncate mb-1">
            {allSpecializations[0]}
            {allSpecializations.length > 1 ? ` & ${allSpecializations.length -1} ${t('moreSpecializations', {default: 'more'})}` : ""}
          </p>
           <div className={`flex items-center text-xs sm:text-sm text-white/80 truncate`}>
            <MapPinIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 opacity-80 flex-shrink-0 ${direction === 'rtl' ? 'ml-1.5' : 'mr-1.5'}`} />
            <span className="truncate opacity-90" title={therapist.locations[0]?.address}>
              {therapist.locations[0]?.address.split(',').slice(0,1).join('') || t('onlinePractice', {default: 'Online Practice'})}
            </span>
          </div>
        </div>
      </div>

      {/* Bio and Action Area */}
      <div className={`flex-shrink-0 h-auto p-4 sm:p-5 text-textOnLight/80 bg-primary flex flex-col gap-3`}>
         <p className="text-sm leading-relaxed line-clamp-3">
           {therapist.bio}
         </p>
         <Button 
            variant="secondary" 
            isFullWidth 
            onClick={onViewProfile}
            className="mt-auto"
          >
           {t('viewFullProfile')}
         </Button>
      </div>
    </div>
  );
};

export const SpotlightTherapistCard = React.memo(SpotlightTherapistCardComponent);
