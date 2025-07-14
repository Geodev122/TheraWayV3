
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Therapist, UserRole } from '../types';
import { APP_NAME, AVAILABILITY_OPTIONS, SPECIALIZATIONS_LIST, LANGUAGES_LIST } from '../constants';
import { TherapistDetailModal } from '../components/TherapistDetailModal';
import { Button } from '../components/common/Button';
import { SpotlightTherapistCard } from '../components/therapist-finder/SwipableTherapistCard';
import { TherapistCard } from '../components/TherapistCard';
import { TherapistMapView } from '../components/therapist-finder/TherapistMapView';
import { Modal } from '../components/common/Modal';
import { InputField, SelectField, CheckboxField } from '../components/dashboard/shared/FormElements';
import { useTranslation } from '../hooks/useTranslation';
import { usePageTitle } from '../hooks/usePageTitle';
import { db } from '../firebase';
import { collection, query, where, getDocs, doc, setDoc, deleteDoc, limit as firestoreLimit, startAfter, Timestamp, orderBy, documentId, getDoc } from 'firebase/firestore';

import {
    HeartIcon, ChevronLeftIcon, ChevronRightIcon, WhatsAppIcon, InformationCircleIcon,
    AdjustmentsHorizontalIcon, Squares2X2Icon, MapIcon, ListBulletIcon, XIcon, FilterSolidIcon,
    SearchIcon
} from '../components/icons';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useParams } from 'react-router-dom';


type ViewMode = 'spotlight' | 'grid' | 'map';

interface Filters {
    searchTerm: string;
    specializations: string[];
    languages: string[];
    availability: string[];
    locationSearch: string;
    showOnlyLiked?: boolean;
}

const ITEMS_PER_PAGE_GRID = 9;
const ITEMS_PER_FETCH_SPOTLIGHT = 20;
const NAVBAR_HEIGHT_PX = 64;
const BOTTOM_NAV_BAR_BASE_HEIGHT = 68;
const FILTER_BUTTON_PROTRUSION_SPACE = 28;
const ACTION_BUTTONS_SPOTLIGHT_AREA_HEIGHT_PX = 88;


const useKeyboardNavControls = (onPrev: () => void, onNext: () => void, onViewProfile: () => void, enabled: boolean) => {
  useEffect(() => {
    if (!enabled) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') onPrev();
      if (event.key === 'ArrowRight') onNext();
      if (event.key === 'ArrowUp') onViewProfile();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onPrev, onNext, onViewProfile, enabled]);
};


export const TherapistFinderPage: React.FC = () => {
  const { user, firebaseUser, isAuthenticated, promptLogin } = useAuth();
  const { t, direction } = useTranslation();
  usePageTitle('therapistFinderTitle');
  const navigate = useNavigate();
  const { therapistId: urlTherapistId } = useParams<{ therapistId: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [allTherapistsStorage, setAllTherapistsStorage] = useState<Therapist[]>([]);
  const [displayedTherapists, setDisplayedTherapists] = useState<Therapist[]>([]);
  const [apiError, setApiError] = useState<string | null>(null);
  const [lastVisibleDoc, setLastVisibleDoc] = useState<any>(null);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedTherapistForModal, setSelectedTherapistForModal] = useState<Therapist | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [cardAnimation, setCardAnimation] = useState<'left' | 'right' | 'up' | 'enter' | null>(urlTherapistId ? null : 'enter');

  const [viewMode, setViewMode] = useState<ViewMode>('spotlight');
  const [animateView, setAnimateView] = useState(false);

  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Filters>({
    searchTerm: '',
    specializations: [],
    languages: [],
    availability: [],
    locationSearch: '',
    showOnlyLiked: false,
  });
  const [gridCurrentPage, setGridCurrentPage] = useState(1);

  const mainContentAreaPaddingBottom = useMemo(() => {
    let navBarHeightForPadding = BOTTOM_NAV_BAR_BASE_HEIGHT;
    if (viewMode === 'spotlight') {
      navBarHeightForPadding += ACTION_BUTTONS_SPOTLIGHT_AREA_HEIGHT_PX;
    }
    return `${navBarHeightForPadding + 8}px`;
  }, [viewMode]);

  const availableSpecializations = useMemo(() => SPECIALIZATIONS_LIST.sort(), []);
  const availableLanguages = useMemo(() => LANGUAGES_LIST.sort(), []);
  const availableAvailabilities = useMemo(() => AVAILABILITY_OPTIONS, []);

  const fetchSingleTherapist = useCallback(async (id: string) => {
    setIsLoading(true);
    setApiError(null);
    try {
      const therapistDocRef = doc(db, 'therapistsData', id);
      const therapistDocSnap = await getDoc(therapistDocRef);
      if (therapistDocSnap.exists()) {
        const fetchedTherapist = { id: therapistDocSnap.id, ...therapistDocSnap.data() } as Therapist;
        if (fetchedTherapist.accountStatus === 'live') {
          setAllTherapistsStorage(prev => [fetchedTherapist, ...prev.filter(t => t.id !== fetchedTherapist.id)]);
          setDisplayedTherapists(prev => [fetchedTherapist, ...prev.filter(t => t.id !== fetchedTherapist.id)]);
          setSelectedTherapistForModal(fetchedTherapist);
          setIsDetailModalOpen(true);
          setCurrentIndex(0);
        } else {
          setApiError(t('therapistProfileNotLive'));
          navigate('/find', { replace: true });
        }
      } else {
        setApiError(t('therapistNotFound'));
        navigate('/find', { replace: true });
      }
    } catch (error: any) {
      console.error("Error fetching single therapist:", error);
      setApiError(error.message || t('unknownApiError'));
      navigate('/find', { replace: true });
    } finally {
      setIsLoading(false);
    }
  }, [t, navigate]);

  useEffect(() => {
    if (urlTherapistId && !isDetailModalOpen && !selectedTherapistForModal) {
      fetchSingleTherapist(urlTherapistId);
    }
  }, [urlTherapistId, fetchSingleTherapist, isDetailModalOpen, selectedTherapistForModal]);


  const fetchTherapistsFromFirestore = useCallback(async (filters: Filters, loadMore = false, currentLastVisibleForPagination?: any) => {
    if (urlTherapistId && !loadMore && !selectedTherapistForModal) return;

    if (!loadMore) setIsLoading(true);
    setApiError(null);

    try {
      const therapistsCollectionRef = collection(db, 'therapistsData');
      let qConstraints: any[] = [where('accountStatus', '==', 'live')];

      if (filters.specializations.length > 0) qConstraints.push(where('specializations', 'array-contains-any', filters.specializations));
      if (filters.languages.length > 0) qConstraints.push(where('languages', 'array-contains-any', filters.languages));
      if (filters.availability.length > 0) qConstraints.push(where('availability', 'array-contains-any', filters.availability));

      qConstraints.push(orderBy('name'));

      if (loadMore && currentLastVisibleForPagination) {
        qConstraints.push(startAfter(currentLastVisibleForPagination));
      }
      qConstraints.push(firestoreLimit(viewMode === 'spotlight' ? ITEMS_PER_FETCH_SPOTLIGHT : ITEMS_PER_PAGE_GRID * 3));

      const finalQuery = query(therapistsCollectionRef, ...qConstraints);
      const querySnapshot = await getDocs(finalQuery);

      const fetchedTherapists: Therapist[] = [];
      querySnapshot.forEach(docSnap => {
        fetchedTherapists.push({ id: docSnap.id, ...docSnap.data() } as Therapist);
      });

      const newLastVisibleUpdate = querySnapshot.docs[querySnapshot.docs.length - 1];

      let clientFilteredTherapists = fetchedTherapists.filter(therapist => {
        const searchTermLower = filters.searchTerm.toLowerCase();
        const nameMatch = therapist.name.toLowerCase().includes(searchTermLower);
        const bioMatch = therapist.bio.toLowerCase().includes(searchTermLower);

        const locationSearchLower = filters.locationSearch.toLowerCase();
        const locationMatch = filters.locationSearch
          ? therapist.locations.some(loc => loc.address.toLowerCase().includes(locationSearchLower))
          : true;
        return (nameMatch || bioMatch) && locationMatch;
      });

      if (isAuthenticated && filters.showOnlyLiked && favorites.size > 0) {
        clientFilteredTherapists = clientFilteredTherapists.filter(therapist => favorites.has(therapist.id));
      }

      if (loadMore) {
        setAllTherapistsStorage(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newUniqueTherapists = clientFilteredTherapists.filter(t => !existingIds.has(t.id));
            return [...prev, ...newUniqueTherapists];
        });
        setDisplayedTherapists(prev => {
            const existingIds = new Set(prev.map(t => t.id));
            const newUniqueTherapists = clientFilteredTherapists.filter(t => !existingIds.has(t.id));
            return [...prev, ...newUniqueTherapists];
        });
        setLastVisibleDoc(newLastVisibleUpdate);
      } else {
        setAllTherapistsStorage(clientFilteredTherapists);
        setDisplayedTherapists(clientFilteredTherapists);
        setCurrentIndex(0);
        setLastVisibleDoc(newLastVisibleUpdate);
        if (!urlTherapistId && !selectedTherapistForModal) {
          setCardAnimation(clientFilteredTherapists.length > 0 ? 'enter' : null);
        }
      }

    } catch (error: any) {
      console.error("Error fetching therapists from Firestore:", error);
      setApiError(error.message || t('unknownApiError'));
      if (!loadMore) {
        setDisplayedTherapists([]);
        setAllTherapistsStorage([]);
      }
    } finally {
      if (!loadMore) setIsLoading(false);
    }
  }, [isAuthenticated, favorites, t, viewMode, urlTherapistId, selectedTherapistForModal]);


  const fetchFavorites = useCallback(async () => {
    if (!isAuthenticated || !firebaseUser) {
        setFavorites(new Set());
        return;
    }
    try {
        const favCollectionRef = collection(db, `users/${firebaseUser.uid}/favorites`);
        const querySnapshot = await getDocs(favCollectionRef);
        const favIds = new Set<string>();
        querySnapshot.forEach(docSnap => favIds.add(docSnap.id));
        setFavorites(favIds);
    } catch (error) {
        console.error("Error fetching favorites:", error);
        setFavorites(new Set());
    }
  }, [isAuthenticated, firebaseUser]);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    if (urlTherapistId && selectedTherapistForModal) {
        if (viewMode === 'spotlight' && allTherapistsStorage.length <= 1) {
             fetchTherapistsFromFirestore(activeFilters, true, lastVisibleDoc);
        }
        return;
    }
    if (urlTherapistId && !selectedTherapistForModal) {
      return;
    }
    
    setLastVisibleDoc(null);
    fetchTherapistsFromFirestore(activeFilters, false, null);

  }, [activeFilters, viewMode, urlTherapistId, selectedTherapistForModal]);


  useEffect(() => {
    if (viewMode === 'spotlight' && !urlTherapistId && currentIndex >= displayedTherapists.length - 5 && displayedTherapists.length > 0 && !isLoading) {
        if (lastVisibleDoc || displayedTherapists.length < ITEMS_PER_FETCH_SPOTLIGHT ) {
             fetchTherapistsFromFirestore(activeFilters, true, lastVisibleDoc);
        }
    }
  }, [currentIndex, viewMode, displayedTherapists.length, lastVisibleDoc, activeFilters, fetchTherapistsFromFirestore, urlTherapistId, isLoading]);


  const numActiveFilters = useMemo(() => {
    let count = 0;
    if (activeFilters.searchTerm) count++;
    if (activeFilters.specializations.length > 0) count++;
    if (activeFilters.languages.length > 0) count++;
    if (activeFilters.availability.length > 0) count++;
    if (activeFilters.locationSearch) count++;
    if (activeFilters.showOnlyLiked && isAuthenticated) count++;
    return count;
  }, [activeFilters, isAuthenticated]);

  const handleViewModeChange = (newMode: ViewMode) => {
    if (newMode !== viewMode) {
        setViewMode(newMode);
        setAnimateView(true);
        setTimeout(() => setAnimateView(false), 350);
        if (newMode === 'grid') setGridCurrentPage(1);
    }
  };

  const currentTherapistForSpotlight = useMemo(() => {
    if (displayedTherapists.length === 0) return null;
    return displayedTherapists[currentIndex % displayedTherapists.length];
  }, [displayedTherapists, currentIndex]);

  const handleNext = () => {
    if (!currentTherapistForSpotlight) return;
    setCardAnimation(direction === 'rtl' ? 'left' : 'right');
    setTimeout(() => {
        setCurrentIndex(prev => prev + 1);
        setCardAnimation('enter');
    }, 300);
  };
  
  const handlePrev = () => {
    if (!currentTherapistForSpotlight || currentIndex === 0) return;
    setCardAnimation(direction === 'rtl' ? 'right' : 'left');
    setTimeout(() => {
        setCurrentIndex(prev => prev - 1);
        setCardAnimation('enter');
    }, 300);
  };


  useKeyboardNavControls(
    handlePrev,
    handleNext,
    () => currentTherapistForSpotlight && handleViewProfile(currentTherapistForSpotlight),
    viewMode === 'spotlight' && !isDetailModalOpen && !isFilterModalOpen
  );

  const toggleFavorite = useCallback(async (therapistId: string) => {
    if (!isAuthenticated || !firebaseUser || !user?.roles.includes(UserRole.CLIENT) ) {
      const therapistToLike = allTherapistsStorage.find(t => t.id === therapistId);
      promptLogin(t('like') + ` ${therapistToLike?.name || 'therapist'}`);
      return;
    }

    const isCurrentlyFavorite = favorites.has(therapistId);
    const favDocRef = doc(db, `users/${firebaseUser.uid}/favorites`, therapistId);

    setFavorites(prevFavorites => {
        const newFavorites = new Set(prevFavorites);
        if (isCurrentlyFavorite) newFavorites.delete(therapistId);
        else newFavorites.add(therapistId);
        return newFavorites;
    });

    try {
        if (isCurrentlyFavorite) {
            await deleteDoc(favDocRef);
        } else {
            await setDoc(favDocRef, { addedAt: Timestamp.now() });
        }
        if (activeFilters.showOnlyLiked) {
             fetchTherapistsFromFirestore(activeFilters, false, null);
        }
    } catch (error) {
        setFavorites(prevFavorites => {
            const newFavorites = new Set(prevFavorites);
            if (isCurrentlyFavorite) newFavorites.add(therapistId);
            else newFavorites.delete(therapistId);
            return newFavorites;
        });
        console.error("Error toggling favorite in Firestore:", error);
    }
  }, [isAuthenticated, firebaseUser, user, promptLogin, t, favorites, allTherapistsStorage, activeFilters, fetchTherapistsFromFirestore]);

  const handleConnect = (therapist: Therapist) => {
    if (!isAuthenticated) {
      promptLogin(t('connectOnWhatsApp') + ` ${therapist.name}`);
      return;
    }
    const cleanWhatsAppNumber = therapist.whatsappNumber.replace(/\D/g, '');
    const whatsappMessage = encodeURIComponent(t('whatsappGreeting', { name: therapist.name.split(' ').pop() || '', appName: t('appName') }) || `Hello Dr. ${therapist.name.split(' ').pop()}, I found you on ${t('appName')}.`);
    window.open(`https://wa.me/${cleanWhatsAppNumber}?text=${whatsappMessage}`, '_blank');
  };

  const handleViewProfile = (therapist: Therapist) => {
    setSelectedTherapistForModal(therapist);
    setIsDetailModalOpen(true);
    if (urlTherapistId !== therapist.id) { // Only navigate if not already on this therapist's URL
        navigate(`/find/therapist/${therapist.id}`, { replace: true });
    }
  };

  const handleCloseDetailModal = () => {
    setIsDetailModalOpen(false);
    setTimeout(() => {
      setSelectedTherapistForModal(null);
      if (urlTherapistId) {
        navigate('/find', { replace: true });
      }
    }, 300);
  };

  const applyFilters = (newFilters: Filters) => {
    setActiveFilters(newFilters);
    setGridCurrentPage(1);
    setIsFilterModalOpen(false);
  };

  const totalGridPages = Math.ceil(displayedTherapists.length / ITEMS_PER_PAGE_GRID);

  const LoadingIndicator: React.FC<{ className?: string, hint?: string }> = ({ className = "h-16 w-16", hint }) => (
    <div className={`flex flex-col items-center justify-center min-h-full`}>
        <div className={`animate-spin rounded-full border-t-4 border-b-4 border-accent ${className === "h-16 w-16" ? "h-16 w-16" : "h-10 w-10" }` } title={t('loading') ?? "Loading..."}></div>
        {hint && <p className="mt-3 text-sm text-textOnLight/70">{hint}</p>}
    </div>
  );

  const NoResultsDisplay: React.FC<{
      currentApiError: string | null;
      currentNumActiveFilters: number;
      onAdjustFiltersClick: () => void;
      isCurrentUserAdmin: boolean;
  }> = ({ currentApiError, currentNumActiveFilters, onAdjustFiltersClick, isCurrentUserAdmin }) => {
      const { t } = useTranslation();
      let titleKey = 'noResultsFound';
      let messageKey = 'noResultsMessage';
      let hintKey = '';
      let showAdjustFilters = true;

      if (currentApiError) {
          titleKey = 'errorLoadingTherapists';
          messageKey = currentApiError; // Use the actual error message
          hintKey = 'tryAgainLaterErrorHint';
          showAdjustFilters = false;
      } else if (currentNumActiveFilters > 0) {
          titleKey = 'noResultsFound';
          messageKey = 'noResultsMessage';
      } else {
          titleKey = 'noTherapistsAvailable';
          messageKey = isCurrentUserAdmin ? 'noTherapistsAdminMessage' : 'noTherapistsMessage';
          showAdjustFilters = !isCurrentUserAdmin;
      }

      return (
          <div className="flex flex-col flex-grow items-center justify-center text-center p-8 h-full animate-fadeIn">
              <InformationCircleIcon className="w-20 h-20 text-accent/40 mb-6"/>
              <h2 className="text-2xl font-semibold text-textDarker mb-3">{t(titleKey)}</h2>
              <p className="text-textOnLight/70 max-w-md mb-1">{t(messageKey)}</p>
              {hintKey && <p className="text-textOnLight/60 text-xs max-w-md mb-6">{t(hintKey)}</p>}

              {showAdjustFilters && (
                  <Button variant="primary" className="mt-4" onClick={onAdjustFiltersClick} leftIcon={<AdjustmentsHorizontalIcon/>}>
                      {t('adjustFilters')}
                  </Button>
              )}
              {isCurrentUserAdmin && !currentApiError && currentNumActiveFilters === 0 && (
                   <Button variant="primary" className="mt-4" onClick={() => navigate('/dashboard/admin')}>{t('goToAdminPanel')}</Button>
              )}
          </div>
      );
  };

  const getCardAnimationClass = () => {
    if (!currentTherapistForSpotlight) return '';
    if (cardAnimation === 'left') return 'animate-swipe-left';
    if (cardAnimation === 'right') return 'animate-swipe-right';
    if (cardAnimation === 'up') return 'animate-swipe-up';
    if (cardAnimation === 'enter') return 'animate-card-enter';
    return '';
  };

  const fixedCardContainerStyle: React.CSSProperties = useMemo(() => ({
    position: 'fixed',
    top: `${NAVBAR_HEIGHT_PX + 8}px`,
    left: `8px`,
    right: `8px`,
    bottom: `${BOTTOM_NAV_BAR_BASE_HEIGHT + ACTION_BUTTONS_SPOTLIGHT_AREA_HEIGHT_PX + 8}px`,
    zIndex: 30,
  }), []);

  const renderSpotlightView = () => {
    if (isLoading && displayedTherapists.length === 0) {
        return <div className="flex-grow flex items-center justify-center"><LoadingIndicator hint={t('fetchingTherapistsHint', { default: "Fetching therapists..."})}/></div>;
    }

    if (!currentTherapistForSpotlight && !isDetailModalOpen && !isLoading) {
        return <div className="flex-grow flex items-center justify-center">
                   <NoResultsDisplay
                       currentApiError={apiError}
                       currentNumActiveFilters={numActiveFilters}
                       onAdjustFiltersClick={() => setIsFilterModalOpen(true)}
                       isCurrentUserAdmin={user?.roles.includes(UserRole.ADMIN) || false}
                   />
               </div>;
    }

    return (
        <div
          style={fixedCardContainerStyle}
          className={`rounded-2xl shadow-xl overflow-hidden flex items-center justify-center bg-background ${animateView ? 'animate-slideUpFadeIn' : ''} ${isDetailModalOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
        >
           {currentTherapistForSpotlight && (
            <div
              key={currentTherapistForSpotlight.id + currentIndex}
              className={`w-full h-full ${getCardAnimationClass()}`}
            >
                <SpotlightTherapistCard
                    therapist={currentTherapistForSpotlight}
                    onViewProfile={() => handleViewProfile(currentTherapistForSpotlight)}
                />
            </div>
           )}
        </div>
    );
  };

  const renderGridView = () => {
    if (isLoading && displayedTherapists.length === 0) return <div className="w-full h-full flex items-center justify-center"><LoadingIndicator hint={t('fetchingTherapistsHint', { default: "Fetching therapists..."})}/></div>;
    if (displayedTherapists.length === 0 && !isLoading) return <div className={`w-full h-full flex items-center justify-center ${animateView ? 'animate-slideUpFadeIn' : ''}`}>
        <NoResultsDisplay
            currentApiError={apiError}
            currentNumActiveFilters={numActiveFilters}
            onAdjustFiltersClick={() => setIsFilterModalOpen(true)}
            isCurrentUserAdmin={user?.roles.includes(UserRole.ADMIN) || false}
        />
    </div>;

    const startIndex = (gridCurrentPage - 1) * ITEMS_PER_PAGE_GRID;
    const endIndex = startIndex + ITEMS_PER_PAGE_GRID;
    const paginatedForGrid = displayedTherapists.slice(startIndex, endIndex);

    return (
        <div className={`w-full max-w-7xl mx-auto h-full ${animateView ? 'animate-slideUpFadeIn' : ''}`}>
             <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 pb-8">
                {paginatedForGrid.map(therapist => (
                <TherapistCard
                    key={therapist.id}
                    therapist={therapist}
                    onViewProfile={handleViewProfile}
                    onToggleFavorite={toggleFavorite}
                    isFavorite={favorites.has(therapist.id)}
                />
                ))}
            </div>
            {totalGridPages > 1 && (
            <div className="flex justify-center items-center mt-2 mb-6 space-x-2">
              <Button
                onClick={() => setGridCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={gridCurrentPage === 1}
                variant="light" size="md" leftIcon={direction === 'rtl' ? <ChevronRightIcon /> :<ChevronLeftIcon/>}
                className="active:scale-95 !shadow-subtle hover:!shadow-card"
              > {t('prev')} </Button>
              <span className="text-sm text-textOnLight/80">
                {t('pageLabel', { default: 'Page' })} {gridCurrentPage} {t('ofLabel', { default: 'of' })} {totalGridPages}
              </span>
              <Button
                onClick={() => setGridCurrentPage(prev => Math.min(totalGridPages, prev + 1))}
                disabled={gridCurrentPage === totalGridPages}
                variant="light" size="md" rightIcon={direction === 'rtl' ? <ChevronLeftIcon /> :<ChevronRightIcon />}
                className="active:scale-95 !shadow-subtle hover:!shadow-card"
              > {t('next')} </Button>
            </div>
          )}
        </div>
    );
  };

  const renderMapView = () => {
    if (isLoading && displayedTherapists.length === 0) return <div className="w-full h-full flex items-center justify-center"><LoadingIndicator hint={t('fetchingTherapistsHint', { default: "Fetching therapists..."})}/></div>;
    if (displayedTherapists.length === 0 && !isLoading) return <div className={`w-full h-full flex items-center justify-center ${animateView ? 'animate-slideUpFadeIn' : ''}`}>
        <NoResultsDisplay
            currentApiError={apiError}
            currentNumActiveFilters={numActiveFilters}
            onAdjustFiltersClick={() => setIsFilterModalOpen(true)}
            isCurrentUserAdmin={user?.roles.includes(UserRole.ADMIN) || false}
        />
    </div>;

    return (
        <div className={`w-full h-full ${animateView ? 'animate-slideUpFadeIn' : ''}`}>
            <TherapistMapView therapists={displayedTherapists} onViewProfile={handleViewProfile} />
        </div>
    );
  };

  const filterButtonActive = isFilterModalOpen || numActiveFilters > 0;
  
  let contentArea;
  if (viewMode === 'spotlight') contentArea = renderSpotlightView();
  else if (viewMode === 'grid') contentArea = renderGridView();
  else if (viewMode === 'map') contentArea = renderMapView();

  return (
    <div className="flex flex-col flex-grow bg-background overflow-hidden" style={{paddingBottom: mainContentAreaPaddingBottom}}>
       <style>{`
        @keyframes swipe-left { from { transform: translateX(0) rotate(0) scale(1); opacity: 1; } to { transform: translateX(${direction === 'rtl' ? '120%' : '-120%'}) rotate(${direction === 'rtl' ? '10deg' : '-10deg'}) scale(0.9); opacity: 0; } }
        .animate-swipe-left { animation: swipe-left 0.3s ease-out forwards; }
        @keyframes swipe-right { from { transform: translateX(0) rotate(0) scale(1); opacity: 1; } to { transform: translateX(${direction === 'rtl' ? '-120%' : '120%'}) rotate(${direction === 'rtl' ? '-10deg' : '10deg'}) scale(0.9); opacity: 0; } }
        .animate-swipe-right { animation: swipe-right 0.3s ease-out forwards; }
        @keyframes swipe-up { from { transform: translateY(0) scale(1); opacity: 1; } to { transform: translateY(-100%) scale(0.85); opacity: 0; } }
        .animate-swipe-up { animation: swipe-up 0.3s ease-out forwards; }
        @keyframes card-enter { from { transform: scale(0.95) translateY(10px); opacity: 0; } to { transform: scale(1) translateY(0); opacity: 1; } }
        .animate-card-enter { animation: card-enter 0.3s ease-out forwards; }
        @keyframes slide-up-fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-slideUpFadeIn { animation: slide-up-fade-in 0.35s ease-out forwards; }
      `}</style>

      {isLoading && !selectedTherapistForModal ? (
        <div className="flex flex-col flex-grow items-center justify-center text-center p-8 bg-background">
          <LoadingIndicator hint={t('initializingAppHint', {default: "Initializing application..."})}/>
        </div>
      ) : (
        <>
          <div className={`w-full flex-grow flex flex-col relative overflow-hidden ${
              viewMode === 'spotlight' ? '' :
              viewMode === 'grid' ? 'px-4 pt-4 overflow-y-auto' :
              viewMode === 'map' ? 'p-0' : ''
          }`}>
            {contentArea}
          </div>

          {viewMode === 'spotlight' && currentTherapistForSpotlight && !isDetailModalOpen && (
            <div
                className="fixed left-0 right-0 bg-background/95 backdrop-blur-md shadow-top-lg px-3 flex flex-col items-center justify-center border-t border-secondary/50"
                style={{
                    bottom: `${BOTTOM_NAV_BAR_BASE_HEIGHT}px`,
                    height: `${ACTION_BUTTONS_SPOTLIGHT_AREA_HEIGHT_PX}px`,
                    zIndex: 950
                }}
            >
                <div className="flex items-center justify-around w-full max-w-xs sm:max-w-sm mx-auto">
                    <Button
                        variant="light" size="lg" onClick={handlePrev}
                        disabled={currentIndex === 0}
                        className="!p-3 sm:!p-4 rounded-full !shadow-card hover:!shadow-card-hover !text-textOnLight hover:!bg-secondary/50 active:scale-95 disabled:opacity-50"
                        aria-label={t('skip')} title={`${t('skip')} (${direction === 'rtl' ? 'ArrowRight' : 'ArrowLeft'})`}
                    ><ChevronLeftIcon className={`w-6 h-6 sm:w-7 sm:h-7 text-accent ${direction === 'rtl' ? 'transform scale-x-[-1]' : ''}`} /></Button>

                    <Button
                        variant="light" size="lg" onClick={() => toggleFavorite(currentTherapistForSpotlight.id)}
                        className={`!p-4 sm:!p-5 rounded-full !shadow-card hover:!shadow-card-hover active:scale-95 transform scale-110 hover:scale-115 ${favorites.has(currentTherapistForSpotlight.id) ? '!text-red-500 bg-red-500/10' : '!text-textOnLight hover:!text-red-400 hover:!bg-red-500/5'}`}
                        aria-label={favorites.has(currentTherapistForSpotlight.id) ? t('unlike') : t('like')}
                        title={favorites.has(currentTherapistForSpotlight.id) ? t('unlike') : t('like')}
                    ><HeartIcon filled={favorites.has(currentTherapistForSpotlight.id)} className="w-6 h-6 sm:w-8 sm:h-8" /></Button>

                    <Button
                        variant="light" size="lg" onClick={handleNext}
                        className="!p-3 sm:!p-4 rounded-full !shadow-card hover:!shadow-card-hover !text-textOnLight hover:!bg-secondary/50 active:scale-95"
                        aria-label={t('next')} title={`${t('next')} (${direction === 'rtl' ? 'ArrowLeft' : 'ArrowRight'})`}
                    ><ChevronRightIcon className={`w-6 h-6 sm:w-7 sm:h-7 text-accent ${direction === 'rtl' ? 'transform scale-x-[-1]' : ''}`} /></Button>
                </div>
                <p className="text-[11px] sm:text-xs text-textOnLight/60 text-center mt-1.5">{t('useArrowKeysForNav')}</p>
            </div>
          )}

          <nav
            className="fixed bottom-0 left-0 right-0 bg-transparent z-[1000] flex justify-center"
            style={{ height: `${BOTTOM_NAV_BAR_BASE_HEIGHT + FILTER_BUTTON_PROTRUSION_SPACE}px` }}
            role="navigation"
            aria-label={t('mainNavigation')}
          >
            <div
              className="relative w-full max-w-md mx-auto bg-primary rounded-t-xl sm:rounded-full shadow-top-lg flex items-end px-1 sm:px-2"
              style={{ height: `${BOTTOM_NAV_BAR_BASE_HEIGHT}px` }}
            >
              <div className="absolute left-1/2 sm:left-6 transform -translate-x-1/2 sm:-translate-x-0 -top-[calc(56px/2-4px)] z-10 flex flex-col items-center group">
                 <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className={`w-14 h-14 bg-primary rounded-full shadow-xl flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-1 focus:ring-offset-primary transition-all hover:scale-105 active:scale-95
                               ${filterButtonActive ? 'ring-2 ring-accent ring-offset-primary shadow-accent/30' : ''}`}
                    aria-label={filterButtonActive ? t('filterActiveAction', { count: numActiveFilters }) : t('filtersButtonLabel')}
                    aria-pressed={filterButtonActive}
                  >
                    <span className={`w-7 h-7 text-accent`}>
                      {numActiveFilters > 0 ? <FilterSolidIcon /> : <AdjustmentsHorizontalIcon />}
                    </span>
                    {numActiveFilters > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 border-2 border-primary">
                        {numActiveFilters}
                      </span>
                    )}
                  </button>
                  <span
                    className={`mt-1 text-[10px] leading-tight font-medium group-hover:text-accent
                               ${filterButtonActive ? 'text-accent' : 'text-textOnLight/90'}`}
                  >
                    {t('filtersButtonLabel')}
                  </span>
              </div>
              <div className="flex flex-1 justify-end items-stretch h-full">
                {[
                  { key: 'spotlight', icon: <SearchIcon />, labelKey: 'viewModeSpotlight', currentView: 'spotlight' },
                  { key: 'grid', icon: <Squares2X2Icon />, labelKey: 'viewModeGrid', currentView: 'grid' },
                  { key: 'map', icon: <MapIcon />, labelKey: 'viewModeMap', currentView: 'map' },
                ].map(item => (
                  <button
                    key={item.key}
                    onClick={() => handleViewModeChange(item.currentView as ViewMode)}
                    className={`flex-1 flex flex-col items-center justify-center h-full p-1.5 group focus:outline-none relative transition-all duration-200 ease-in-out active:scale-95 hover:bg-accent/5 rounded-lg
                               ${viewMode === item.currentView ? 'text-accent font-semibold' : 'text-subtleBlue hover:text-accent'}`}
                    aria-label={t(item.labelKey)}
                    aria-pressed={viewMode === item.currentView}
                  >
                    <span className={`w-6 h-6 mb-0.5 transition-colors duration-200 ease-in-out
                                     ${viewMode === item.currentView ? 'text-accent' : 'text-accent opacity-70 group-hover:opacity-100'}`}>
                      {item.icon}
                    </span>
                    <span className="text-[10px] leading-tight truncate">{t(item.labelKey)}</span>
                    {viewMode === item.currentView && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 bg-accent rounded-full"></span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {selectedTherapistForModal && (
            <TherapistDetailModal
              therapist={selectedTherapistForModal}
              isOpen={isDetailModalOpen}
              onClose={handleCloseDetailModal}
              onToggleFavorite={toggleFavorite}
              isFavorite={selectedTherapistForModal ? favorites.has(selectedTherapistForModal.id) : false}
            />
          )}
          <FilterModalComponent
            isOpen={isFilterModalOpen}
            onClose={() => setIsFilterModalOpen(false)}
            currentFilters={activeFilters}
            onApplyFilters={applyFilters}
            availableSpecializations={availableSpecializations}
            availableLanguages={availableLanguages}
            availableAvailabilities={availableAvailabilities}
            t={t}
          />
        </>
      )}
    </div>
  );
};


interface FilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: Filters;
    onApplyFilters: (filters: Filters) => void;
    availableSpecializations: string[];
    availableLanguages: string[];
    availableAvailabilities: string[];
    t: (key: string, replacements?: Record<string, string | number | undefined>) => string;
}

const FilterModalComponent: React.FC<FilterModalProps> = ({
    isOpen,
    onClose,
    currentFilters,
    onApplyFilters,
    availableSpecializations,
    availableLanguages,
    availableAvailabilities,
    t
}) => {
    const { isAuthenticated, user, promptLogin } = useAuth();
    const [tempFilters, setTempFilters] = useState<Filters>(currentFilters);

    useEffect(() => {
        if (isOpen) {
            setTempFilters(currentFilters);
        }
    }, [currentFilters, isOpen]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const inputElement = e.target as HTMLInputElement;

        if (type === 'checkbox') {
            const isArrayCheckbox = name.includes('.');
            if (isArrayCheckbox) {
                const [key, val] = name.split('.');
                setTempFilters(prev => ({
                    ...prev,
                    [key]: inputElement.checked
                        ? [...((prev[key as keyof Filters] as string[] || [])), val]
                        : ((prev[key as keyof Filters] as string[] || [])).filter(item => item !== val)
                }));
            } else {
                setTempFilters(prev => ({
                    ...prev,
                    [name]: inputElement.checked
                }));
            }
        } else {
            setTempFilters(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
        }
    };

    const handleSubmit = () => {
        onApplyFilters(tempFilters);
    };

    const handleReset = () => {
        const resetFilters: Filters = {
            searchTerm: '',
            specializations: [],
            languages: [],
            availability: [],
            locationSearch: '',
            showOnlyLiked: false,
        };
        setTempFilters(resetFilters);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('filterTherapists')} size="xl">
            <div className="space-y-6">
                <InputField
                    label={t('searchByName')}
                    id="searchTerm"
                    name="searchTerm"
                    value={tempFilters.searchTerm}
                    onChange={handleInputChange}
                    placeholder={t('searchByNamePlaceholder', {default: "e.g., Dr. Evelyn"})}
                    containerClassName="mb-3"
                />
                <InputField
                    label={t('searchByLocationAddress')}
                    id="locationSearch"
                    name="locationSearch"
                    value={tempFilters.locationSearch || ''}
                    onChange={handleInputChange}
                    placeholder={t('searchByLocationPlaceholder', {default: "e.g., Wellness Ave, Mindful City"})}
                    containerClassName="mb-3"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-textOnLight mb-1">{t('specializations')}</label>
                        <div className="max-h-48 overflow-y-auto border border-secondary rounded-md p-3 space-y-2 bg-background">
                            {availableSpecializations.map(spec => (
                                <CheckboxField key={spec} id={`spec-${spec.replace(/[^a-zA-Z0-9]/g, "")}`} name={`specializations.${spec}`} label={spec} checked={(tempFilters.specializations || []).includes(spec)} onChange={handleInputChange} className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent" containerClassName="!mb-0"/>
                            ))}
                        </div>
                         <p className="text-xs text-textOnLight/70 mt-1.5">{t('selectOneOrMoreSpecializations')}</p>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-textOnLight mb-1">{t('languages')}</label>
                        <div className="max-h-48 overflow-y-auto border border-secondary rounded-md p-3 space-y-2 bg-background">
                            {availableLanguages.map(lang => (
                                <CheckboxField key={lang} id={`lang-${lang.replace(/[^a-zA-Z0-9]/g, "")}`} name={`languages.${lang}`} label={lang} checked={(tempFilters.languages || []).includes(lang)} onChange={handleInputChange} className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent" containerClassName="!mb-0"/>
                            ))}
                        </div>
                        <p className="text-xs text-textOnLight/70 mt-1.5">{t('selectOneOrMoreLanguages')}</p>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-textOnLight mb-1">{t('availability')}</label>
                    <div className="max-h-40 overflow-y-auto border border-secondary rounded-md p-3 space-y-2 bg-background">
                        {availableAvailabilities.map(avail => (
                            <CheckboxField key={avail} id={`avail-${avail.replace(/[^a-zA-Z0-9]/g, "")}`} name={`availability.${avail}`} label={t(avail.toLowerCase().replace(/\s+/g, ''), {default: avail})} checked={(tempFilters.availability || []).includes(avail)} onChange={handleInputChange} className="h-4 w-4 text-accent border-gray-300 rounded focus:ring-accent" containerClassName="!mb-0"/>
                        ))}
                    </div>
                    <p className="text-xs text-textOnLight/70 mt-1.5">{t('selectAvailabilityHint')}</p>
                </div>

                {(isAuthenticated && user?.roles.includes(UserRole.CLIENT)) ? (
                    <CheckboxField
                        label={t('filterShowOnlyLikedLabel')}
                        id="showOnlyLiked"
                        name="showOnlyLiked"
                        checked={tempFilters.showOnlyLiked || false}
                        onChange={handleInputChange}
                        description={t('filterShowOnlyLikedDescription')}
                        containerClassName="!mb-0 pt-4 border-t border-secondary/70 mt-4"
                    />
                ) : (
                    <div className="text-center py-4 border-t border-secondary/70 mt-4">
                        <p className="text-sm text-gray-600">{t('loginToUsePersonalFilters', {action: t('usePersonalFilters', {default: "use personal filters"})})}</p>
                        <Button
                            variant="link"
                            onClick={() => {
                                onClose();
                                promptLogin(t('usePersonalFilters', {default: "use personal filters"}));
                            }}
                            className="mt-1.5 !text-sm !text-accent hover:!underline"
                        >
                            {t('loginNowPrompt')}
                        </Button>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-5 border-t border-secondary/70 mt-4">
                    <Button variant="light" onClick={handleReset} className="w-full sm:w-auto">{t('resetFilters')}</Button>
                    <Button variant="primary" onClick={handleSubmit} className="w-full sm:w-auto">{t('applyFilters')}</Button>
                </div>
            </div>
        </Modal>
    );
};
