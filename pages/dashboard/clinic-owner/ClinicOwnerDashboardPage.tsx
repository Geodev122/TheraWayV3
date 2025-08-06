
import React, { useState, useEffect, FormEvent, useCallback, useMemo } from 'react';
import { Outlet, Route, Routes, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { Clinic, UserRole, ClinicSpaceListing, MembershipHistoryItem, UserManagementInfo, MembershipStatus, ClinicBooking } from '../../../types';
import { 
    CLINIC_SPACE_PHOTO_MAX_SIZE_MB, 
    PAYMENT_RECEIPT_MAX_SIZE_MB, 
    PROFILE_PICTURE_MAX_SIZE_MB, 
    CLINIC_PHOTO_MAX_SIZE_MB,
    CLINIC_SPACE_FEATURES_LIST,
    CLINIC_MEMBERSHIP_FEE,
    STANDARD_MEMBERSHIP_TIER_NAME
} from '../../../constants';
import { DashboardLayout } from '../../../components/dashboard/shared/DashboardLayout';
import { Button } from '../../../components/common/Button';
import { InputField, TextareaField, FileUploadField, SelectField, CheckboxField, uploadFileToFirebase, deleteFileFromFirebase } from '../../../components/dashboard/shared/FormElements';
import { Modal } from '../../../components/common/Modal';
import {
    BuildingOfficeIcon, BriefcaseIcon, CogIcon, PhotoIcon,
    PlusCircleIcon, PencilIcon, TrashIcon, ArrowUpOnSquareIcon, CheckCircleIcon,
    ChevronDownIcon, ChevronUpIcon, UsersIcon, DocumentDuplicateIcon, MapPinIcon, ClockIcon, InformationCircleIcon, WhatsAppIcon
} from '../../../components/icons';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import {
  listMembershipHistory,
  createMembershipHistoryItem
} from '@firebasegen/default-connector';


interface OutletContextType {
  clinicData: Clinic | null;
  clinicOwnerUser: UserManagementInfo | null; 
  clinicSpaceListings: ClinicSpaceListing[];
  handleClinicProfileSave: (
    updatedProfile: Partial<Clinic>, 
    profilePicFile?: File | null, 
    additionalPhotoFiles?: (File|null)[], // New raw files (or null for unchanged/cleared slots)
    additionalPhotoPreviews?: (string|null)[] // UI Previews (blob URLs, existing server URLs, or null for cleared)
  ) => Promise<void>; 
  handleMembershipApplication: (receiptFile: File | null) => Promise<void>; 
  handleAddOrUpdateSpaceListing: (listing: ClinicSpaceListing, photoFiles: (File | null)[]) => Promise<void>; 
  handleDeleteSpaceListing: (listingId: string) => Promise<void>; 
  handleOwnerUserSave: (updatedUser: Partial<UserManagementInfo>) => Promise<void>; 
  isLoading: boolean;
  membershipHistory: MembershipHistoryItem[];
  // analyticsData: any; // Placeholder
}

interface AccordionSectionProps {
    titleKey: string;
    icon?: React.ReactElement<{ className?: string }>;
    isOpen: boolean;
    onClick: () => void;
    children: React.ReactNode;
    badgeText?: string;
    badgeColor?: string;
}
const AccordionSection: React.FC<AccordionSectionProps> = ({ titleKey, icon, isOpen, onClick, children, badgeText, badgeColor }) => {
    const { t } = useTranslation();
    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button
                type="button"
                className={`w-full flex items-center justify-between p-4 text-left font-medium text-textOnLight hover:bg-gray-50/50 focus:outline-none ${isOpen ? 'bg-gray-50/50 border-b border-gray-200' : ''}`}
                onClick={onClick}
                aria-expanded={isOpen}
                aria-controls={`accordion-content-${titleKey.replace(/\s+/g, '-')}`}
            >
                <span className="flex items-center">
                    {icon && React.cloneElement(icon, { className: `w-5 h-5 ${direction === 'rtl' ? 'ml-2' : 'mr-2'} text-accent`})}
                    {t(titleKey)}
                    {badgeText && (
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${badgeColor || 'bg-gray-100 text-gray-800'} ${direction === 'rtl' ? 'mr-2' : 'ml-2'}`}>
                            {badgeText}
                        </span>
                    )}
                </span>
                {isOpen ? <ChevronUpIcon className="w-5 h-5 text-gray-500" /> : <ChevronDownIcon className="w-5 h-5 text-gray-500" />}
            </button>
            {isOpen && (
                <div id={`accordion-content-${titleKey.replace(/\s+/g, '-')}`} className="p-4 bg-white">
                    {children}
                </div>
            )}
        </div>
    );
};

const ClinicProfileTabContent: React.FC = () => {
    const { t } = useTranslation();
    usePageTitle('dashboardClinicProfileTab');
    const { clinicData, handleClinicProfileSave, isLoading } = useOutletContext<OutletContextType>();
    
    const [profileData, setProfileData] = useState<Partial<Clinic>>(clinicData || {});
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [additionalPhotosFiles, setAdditionalPhotosFiles] = useState<(File|null)[]>(Array(5).fill(null));
    const [additionalPhotoPreviews, setAdditionalPhotoPreviews] = useState<(string|null)[]>(Array(5).fill(null));

    useEffect(() => {
        setProfileData(clinicData || {});
        setProfilePictureFile(null);
        
        const initialPreviews = Array(5).fill(null);
        const initialFiles = Array(5).fill(null);
        if (clinicData?.photos) {
            clinicData.photos.slice(0, 5).forEach((url, i) => initialPreviews[i] = url);
        }
        setAdditionalPhotoPreviews(initialPreviews);
        setAdditionalPhotosFiles(initialFiles);

    }, [clinicData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setProfileData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleAmenitiesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setProfileData(prev => ({ ...prev, amenities: e.target.value.split(',').map(a => a.trim()).filter(a => a) }));
    };

    const handleOperatingHoursChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const lines = e.target.value.split('\n');
        const hours: Record<string, string> = {};
        lines.forEach(line => {
            const parts = line.split(':');
            if (parts.length === 2) {
                hours[parts[0].trim()] = parts[1].trim();
            }
        });
        setProfileData(prev => ({ ...prev, operatingHours: hours }));
    };

    const handleProfilePictureFileChange = (file: File | null) => setProfilePictureFile(file);

    const handleAdditionalPhotoChange = (index: number, file: File | null) => {
        const newFiles = [...additionalPhotosFiles];
        newFiles[index] = file;
        setAdditionalPhotosFiles(newFiles);

        const newPreviews = [...additionalPhotoPreviews];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                newPreviews[index] = reader.result as string; // Blob URL for new file
                setAdditionalPhotoPreviews([...newPreviews]);
            };
            reader.readAsDataURL(file);
        } else {
            newPreviews[index] = null; // Cleared slot
            setAdditionalPhotoPreviews([...newPreviews]);
        }
    };
    
    const addPhotoSlot = () => { // This function might not be needed if we always show 5 slots.
        // If logic needs dynamic slots, this would be more complex.
        // For fixed 5 slots, user just fills them.
    };

    const removePhotoSlot = (index: number) => { // This is more accurately "clearPhotoSlot"
        handleAdditionalPhotoChange(index, null);
    };


    const handleProfileSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // Pass the full additionalPhotosFiles and additionalPhotoPreviews arrays
        await handleClinicProfileSave(
            profileData, 
            profilePictureFile, 
            additionalPhotosFiles, 
            additionalPhotoPreviews
        );
    };
    
    const [activeAccordion, setActiveAccordion] = useState<string | null>("businessProfile");

    if (isLoading && !clinicData) {
      return <div className="p-6 text-center text-textOnLight">{t('loading')}</div>;
    }

    return (
        <form onSubmit={handleProfileSubmit} className="space-y-3">
            <h2 className="text-2xl font-semibold text-textOnLight border-b border-gray-200 pb-4 mb-3 px-4 sm:px-0">{t('editClinicProfile')}</h2>
            <AccordionSection titleKey="clinicBusinessProfileTitle" icon={<BuildingOfficeIcon />} isOpen={activeAccordion === "businessProfile"} onClick={() => setActiveAccordion(activeAccordion === "businessProfile" ? null : "businessProfile")}>
                <FileUploadField
                    label={t('clinicProfilePictureLabel')} id="clinicProfilePictureUrl"
                    currentFileUrl={profileData.profilePictureUrl || clinicData?.profilePictureUrl}
                    onFileChange={handleProfilePictureFileChange}
                    accept="image/*" maxSizeMB={PROFILE_PICTURE_MAX_SIZE_MB}
                    description={t('uploadProfilePictureDescription', {size: PROFILE_PICTURE_MAX_SIZE_MB})}
                    required={!profileData.profilePictureUrl && !clinicData?.profilePictureUrl}
                />
                <InputField label={t('clinicBusinessName')} id="name" name="name" value={profileData.name || ''} onChange={handleChange} required />
                <TextareaField label={t('clinicProfileDescription')} id="description" name="description" value={profileData.description || ''} onChange={handleChange} rows={4} description={t('clinicDescriptionHelperText')} />
            </AccordionSection>

            <AccordionSection titleKey="contactAndLocationTitle" icon={<MapPinIcon />} isOpen={activeAccordion === "contactLocation"} onClick={() => setActiveAccordion(activeAccordion === "contactLocation" ? null : "contactLocation")}>
                 <InputField label={t('clinicFullAddressLabel')} id="address" name="address" value={profileData.address || ''} onChange={handleChange} required />
                 <InputField label={t('contactWhatsAppNumber')} id="whatsappNumber" name="whatsappNumber" type="tel" value={profileData.whatsappNumber || ''} onChange={handleChange} required />
            </AccordionSection>

            <AccordionSection titleKey="operatingHoursAndAmenitiesTitle" icon={<ClockIcon />} isOpen={activeAccordion === "hoursAmenities"} onClick={() => setActiveAccordion(activeAccordion === "hoursAmenities" ? null : "hoursAmenities")}>
                <TextareaField label={t('operatingHoursLabel')} id="operatingHours" name="operatingHours" 
                    value={profileData.operatingHours ? Object.entries(profileData.operatingHours).map(([day, time]) => `${day}: ${time}`).join('\n') : ''}
                    onChange={handleOperatingHoursChange} rows={3} description={t('operatingHoursHelperText')} 
                />
                <InputField label={t('generalAmenitiesLabel')} id="amenities" name="amenities" 
                    value={(profileData.amenities || []).join(', ')} 
                    onChange={handleAmenitiesChange} 
                    description={t('generalAmenitiesHelperText')}
                />
            </AccordionSection>

            <AccordionSection titleKey="additionalClinicPhotosTitle" icon={<PhotoIcon />} isOpen={activeAccordion === "additionalPhotos"} onClick={() => setActiveAccordion(activeAccordion === "additionalPhotos" ? null : "additionalPhotos")}>
                <div className="space-y-4">
                    {additionalPhotoPreviews.map((preview, index) => (
                        <div key={index} className="flex items-center gap-3 p-2 border border-dashed rounded">
                             <FileUploadField
                                label={`${t('photoLabel')} ${index + 1}`} id={`additionalPhoto-${index}`}
                                currentFileUrl={ (preview && !preview.startsWith('blob:')) ? preview : undefined } // Pass original server URL if preview is not a blob
                                onFileChange={(file: File | null) => handleAdditionalPhotoChange(index, file)}
                                accept="image/*" maxSizeMB={CLINIC_PHOTO_MAX_SIZE_MB}
                                containerClassName="!mb-0"
                            />
                            {/* Removed explicit remove button, clearing file input handles this via handleAdditionalPhotoChange(index, null) */}
                        </div>
                    ))}
                    {/* Add photo slot button might not be needed if always showing 5 slots */}
                    <p className="text-xs text-gray-500">{t('clinicSpacePhotosHelperText', { count: 5, size: CLINIC_PHOTO_MAX_SIZE_MB })}</p>
                </div>
            </AccordionSection>


            <div className="pt-6 border-t border-gray-200 mt-4">
                <Button type="submit" variant="primary" size="lg" disabled={isLoading} leftIcon={<ArrowUpOnSquareIcon />}>
                    {isLoading ? t('saving') : t('saveClinicProfileButton')}
                </Button>
            </div>
        </form>
    );
};
const ClinicMySpacesTabContent: React.FC = () => {
    const { t, direction } = useTranslation();
    usePageTitle('dashboardMyClinicsTab');
    const { clinicSpaceListings, handleAddOrUpdateSpaceListing, handleDeleteSpaceListing, isLoading } = useOutletContext<OutletContextType>();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentListing, setCurrentListing] = useState<ClinicSpaceListing | null>(null);
    const [listingFormData, setListingFormData] = useState<Partial<ClinicSpaceListing>>({});
    const [photoFiles, setPhotoFiles] = useState<(File|null)[]>([]); // Max 5 photos
    const [photoPreviews, setPhotoPreviews] = useState<(string|null)[]>([]);


    const openModal = (listing?: ClinicSpaceListing) => {
        setCurrentListing(listing || null);
        setListingFormData(listing || { rentalPrice: 0, features:[] });
        
        const initialFiles = Array(5).fill(null);
        const initialPreviews = Array(5).fill(null);
        if (listing?.photos) {
            listing.photos.slice(0,5).forEach((url, i) => initialPreviews[i] = url);
        }
        setPhotoFiles(initialFiles);
        setPhotoPreviews(initialPreviews);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setCurrentListing(null);
        setListingFormData({});
        setPhotoFiles([]);
        setPhotoPreviews([]);
    };

    const handleListingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
         if (name === "features") {
            setListingFormData(prev => ({ ...prev, features: value.split(',').map(f => f.trim()).filter(f => f)}));
        } else {
            setListingFormData(prev => ({ ...prev, [name]: type === 'number' ? parseFloat(value) : value }));
        }
    };

    const handlePhotoFileChange = (index: number, file: File | null) => {
        const newFiles = [...photoFiles];
        newFiles[index] = file;
        setPhotoFiles(newFiles);

        const newPreviews = [...photoPreviews];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                newPreviews[index] = reader.result as string; // Blob URL for new file
                setPhotoPreviews([...newPreviews]);
            };
            reader.readAsDataURL(file);
        } else { // File removed
            newPreviews[index] = (currentListing?.photos && currentListing.photos[index]) ? currentListing.photos[index] : null; // Revert to original or null
            setPhotoPreviews([...newPreviews]);
        }
    };

    const handleListingSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const listingToSave: ClinicSpaceListing = {
            id: currentListing?.id || `space-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            name: listingFormData.name || t('unnamedSpace'),
            description: listingFormData.description || '',
            photos: photoPreviews.filter(p => p && !p.startsWith('blob:')) as string[], // Pass existing server URLs
            rentalPrice: parseFloat(String(listingFormData.rentalPrice)) || 0,
            rentalDuration: listingFormData.rentalDuration || t('perHour'),
            rentalTerms: listingFormData.rentalTerms || '',
            features: listingFormData.features || [],
            // clinicId, clinicName, clinicAddress will be added by parent if it's a new listing
        };
        // Pass photoFiles (new File objects) for upload logic in shell
        await handleAddOrUpdateSpaceListing(listingToSave, photoFiles);
        closeModal();
    };

    const handleDelete = async (id: string) => {
        if (confirm(t('deleteListingConfirm'))) {
            await handleDeleteSpaceListing(id);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-accent flex items-center">
                    <BriefcaseIcon className={`w-6 h-6 ${direction === 'rtl' ? 'ml-2' : 'mr-2'}`} />
                    {t('manageYourClinicSpacesTitle')}
                </h3>
                <Button onClick={() => openModal()} leftIcon={<PlusCircleIcon />} variant="primary">
                    {t('addNewClinicListingButton')}
                </Button>
            </div>

            {isLoading && clinicSpaceListings.length === 0 ? <p>{t('loading')}</p> :
            clinicSpaceListings.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                    <BuildingOfficeIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg text-gray-600 mb-4">{t('noClinicSpacesListedMessage')}</p>
                    <Button onClick={() => openModal()} leftIcon={<PlusCircleIcon />} variant="primary" size="lg">
                        {t('createFirstListingButton')}
                    </Button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {clinicSpaceListings.map(listing => (
                        <div key={listing.id} className="bg-gray-50/50 p-4 rounded-lg shadow hover:shadow-xl transition-shadow">
                            <img src={listing.photos?.[0] || `https://picsum.photos/seed/${listing.id}/400/250`} alt={listing.name} className="w-full h-40 object-cover rounded-md mb-3" />
                            <h4 className="font-semibold text-lg text-textOnLight truncate" title={listing.name}>{listing.name}</h4>
                            <p className="text-sm text-accent mb-1">${listing.rentalPrice} / {listing.rentalDuration}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 mb-3">{listing.description}</p>
                            <div className="flex space-x-2">
                                <Button size="sm" variant="light" onClick={() => openModal(listing)} leftIcon={<PencilIcon className="w-4 h-4"/>}>{t('editButtonLabel')}</Button>
                                <Button size="sm" variant="danger" onClick={() => handleDelete(listing.id)} leftIcon={<TrashIcon className="w-4 h-4"/>}>{t('deleteButtonLabel')}</Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {isModalOpen && (
                <Modal isOpen={isModalOpen} onClose={closeModal} title={currentListing ? t('editClinicSpaceListingTitle') : t('addNewClinicSpaceListingTitle')} size="2xl">
                    <form onSubmit={handleListingSubmit} className="space-y-4">
                        <InputField label={t('clinicSpaceNameLabel')} id="name" name="name" value={listingFormData.name || ''} onChange={handleListingChange} required />
                        <TextareaField label={t('clinicSpaceDescriptionLabel')} id="description" name="description" value={listingFormData.description || ''} onChange={handleListingChange} rows={3} required />
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">{t('clinicSpacePhotosLabel')}</label>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {Array.from({ length: 5 }).map((_, index) => ( // Always render 5 slots
                                    <FileUploadField 
                                        key={index}
                                        label={`${t('photoLabel')} ${index + 1}`} id={`photo-${index}`}
                                        currentFileUrl={photoPreviews[index] && !photoPreviews[index]?.startsWith('blob:') ? photoPreviews[index] : undefined}
                                        onFileChange={(file: File | null) => handlePhotoFileChange(index, file)}
                                        accept="image/*" maxSizeMB={CLINIC_SPACE_PHOTO_MAX_SIZE_MB}
                                        containerClassName="!mb-0"
                                    />
                                ))}
                            </div>
                            <p className="mt-1 text-xs text-gray-500">{t('clinicSpacePhotosHelperText', { count: 5, size: CLINIC_SPACE_PHOTO_MAX_SIZE_MB })}</p>
                        </div>

                        <h4 className="text-md font-semibold pt-2 border-t border-gray-200">{t('rentalInformationTitle')}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <InputField label={t('rentalPriceField')} id="rentalPrice" name="rentalPrice" type="number" value={String(listingFormData.rentalPrice || '')} onChange={handleListingChange} required />
                            <InputField label={t('rentalDurationField')} id="rentalDuration" name="rentalDuration" value={listingFormData.rentalDuration || ''} onChange={handleListingChange} placeholder={t('rentalDurationPlaceholder')} required />
                        </div>
                        <TextareaField label={t('rentalTermsField')} id="rentalTerms" name="rentalTerms" value={listingFormData.rentalTerms || ''} onChange={handleListingChange} rows={3} description={t('rentalTermsHelperText')} />
                        
                        <InputField label={t('featuresAndFacilitiesLabel')} id="features" name="features" 
                            value={(listingFormData.features || []).join(', ')} onChange={handleListingChange} 
                            description={t('featuresHelperText', { exampleFeatures: CLINIC_SPACE_FEATURES_LIST.slice(0,2).join(', ')})} 
                        />

                        <div className="flex justify-end space-x-3 pt-3">
                            <Button type="button" variant="light" onClick={closeModal}>{t('cancelButtonLabel')}</Button>
                            <Button type="submit" variant="primary" disabled={isLoading}>
                                {isLoading ? t('saving') : (currentListing ? t('saveChangesButtonLabel') : t('addListingButtonLabel'))}
                            </Button>
                        </div>
                    </form>
                </Modal>
            )}
        </div>
    );
};
const ClinicBookingsTabContent: React.FC = () => {
    usePageTitle('dashboardBookingsTab');
    const { t } = useTranslation();
    const { clinicData } = useOutletContext<OutletContextType>();
    const [bookings, setBookings] = useState<ClinicBooking[]>([]);
    const [isLoadingBookings, setIsLoadingBookings] = useState(false);

    useEffect(() => {
        const fetchBookings = async () => {
            if (!clinicData) return;
            setIsLoadingBookings(true);
            try {
                const bookingsQuery = query(
                    collection(db, 'bookings'),
                    where('clinicId', '==', clinicData.id),
                    orderBy('startTime', 'desc')
                );
                const snapshot = await getDocs(bookingsQuery);
                const fetched: ClinicBooking[] = snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as Omit<ClinicBooking, 'id'>) }));
                setBookings(fetched);
            } catch (error) {
                console.error('Error fetching bookings:', error);
            }
            setIsLoadingBookings(false);
        };
        fetchBookings();
    }, [clinicData]);

    const handleApprove = async (bookingId: string) => {
        try {
            await updateDoc(doc(db, 'bookings', bookingId), { status: 'accepted' });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'accepted' } : b));
        } catch (error) {
            console.error('Error approving booking:', error);
        }
    };

    const handleDecline = async (bookingId: string) => {
        try {
            await updateDoc(doc(db, 'bookings', bookingId), { status: 'declined' });
            setBookings(prev => prev.map(b => b.id === bookingId ? { ...b, status: 'declined' } : b));
        } catch (error) {
            console.error('Error declining booking:', error);
        }
    };

    const handleMessageTherapist = (booking: ClinicBooking) => {
        if (!booking.therapistWhatsapp) return;
        const clinicName = clinicData?.name || t('yourClinic', { default: 'your clinic' });
        const message = t('whatsappGreetingClinicSpace', { spaceName: booking.spaceName || '', clinicName, appName: t('appName') });
        window.open(`https://wa.me/${booking.therapistWhatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    };

    const pendingBookings = bookings.filter(b => b.status === 'pending');
    const acceptedBookings = bookings.filter(b => b.status === 'accepted');
    const pastBookings = bookings.filter(b => b.status !== 'pending' && b.status !== 'accepted');

    const renderBooking = (booking: ClinicBooking, showActions = false) => (
        <div key={booking.id} className="border border-gray-200 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h4 className="text-md font-semibold text-textOnLight">{booking.spaceName || t('unnamedSpace')}</h4>
                <p className="text-sm text-gray-700">{booking.therapistName}</p>
                <p className="text-xs text-gray-500">{new Date(booking.startTime).toLocaleString()} - {new Date(booking.endTime).toLocaleString()}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
                {showActions && (
                    <>
                        <Button size="sm" variant="primary" onClick={() => handleApprove(booking.id)}>{t('approveButtonLabel')}</Button>
                        <Button size="sm" variant="danger" onClick={() => handleDecline(booking.id)}>{t('declineButtonLabel')}</Button>
                    </>
                )}
                <Button size="sm" variant="light" onClick={() => handleMessageTherapist(booking)} leftIcon={<WhatsAppIcon className="w-4 h-4" />}>{t('messageTherapistButtonLabel')}</Button>
            </div>
        </div>
    );

    const renderSection = (titleKey: string, items: ClinicBooking[], showActions = false) => (
        <div className="space-y-3">
            <h3 className="text-lg font-semibold text-accent">{t(titleKey)}</h3>
            {items.length === 0 ? (
                <p className="text-sm text-gray-500">{t('noBookingsMessage')}</p>
            ) : (
                items.map(b => renderBooking(b, showActions))
            )}
        </div>
    );

    if (isLoadingBookings) {
        return <div className="p-6 text-center text-textOnLight">{t('loading')}</div>;
    }

    return (
        <div className="space-y-8">
            {renderSection('pendingBookings', pendingBookings, true)}
            {renderSection('acceptedBookings', acceptedBookings)}
            {renderSection('pastBookings', pastBookings)}
        </div>
    );
};
const ClinicAnalyticsTabContent: React.FC = () => {
    usePageTitle('dashboardAnalyticsTab');
    const { t } = useTranslation();
    const { clinicData } = useOutletContext<OutletContextType>();

    interface ClinicAnalytics {
        totalClinicViews: number;
        totalTherapistConnections: number;
    }

    const [analytics, setAnalytics] = useState<ClinicAnalytics | null>(null);
    const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!clinicData?.id) return;
            setIsLoadingAnalytics(true);
            try {
                const analyticsDocRef = doc(db, `clinicsData/${clinicData.id}/analytics/summary`);
                const analyticsSnap = await getDoc(analyticsDocRef);
                if (analyticsSnap.exists()) {
                    setAnalytics(analyticsSnap.data() as ClinicAnalytics);
                } else {
                    setAnalytics({ totalClinicViews: 0, totalTherapistConnections: 0 });
                }
                setError(null);
            } catch (err) {
                console.error('Error fetching clinic analytics:', err);
                setError(t('errorLoadingAnalytics', { default: 'Unable to load analytics.' }));
            } finally {
                setIsLoadingAnalytics(false);
            }
        };
        fetchAnalytics();
    }, [clinicData?.id, t]);

    if (isLoadingAnalytics) {
        return <div className="p-6 text-center text-textOnLight">{t('loading')}</div>;
    }

    if (error) {
        return <div className="p-6 text-center text-red-500">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-semibold text-accent flex items-center">
                {t('clinicEngagementMetricsTitle')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50/50 p-6 rounded-lg shadow">
                    <h4 className="text-lg font-medium text-textOnLight">{t('totalClinicViewsLabel')}</h4>
                    <p className="text-3xl font-bold text-accent">{(analytics?.totalClinicViews ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('past30DaysLabel')}</p>
                </div>
                <div className="bg-gray-50/50 p-6 rounded-lg shadow">
                    <h4 className="text-lg font-medium text-textOnLight">{t('totalTherapistConnectionsLabel')}</h4>
                    <p className="text-3xl font-bold text-accent">{(analytics?.totalTherapistConnections ?? 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">{t('viaPlatformFeaturesLabel')}</p>
                </div>
            </div>
            <div className="bg-gray-50/50 p-6 rounded-lg shadow text-center">
                <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
                <p className="text-gray-600">{t('viewTrendsOverTimePlaceholder')}</p>
            </div>
        </div>
    );
};
const ClinicSettingsTabContent: React.FC = () => {
    usePageTitle('dashboardSettingsTab');
    const { t } = useTranslation();
    const { clinicData, clinicOwnerUser, handleOwnerUserSave, handleMembershipApplication, isLoading, membershipHistory } = useOutletContext<OutletContextType>();
    
    const [ownerFormData, setOwnerFormData] = useState(clinicOwnerUser || {name: '', email: '', id: '', roles: [UserRole.CLINIC_OWNER], isActive: true });
    const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
    const [paymentReceiptPreview, setPaymentReceiptPreview] = useState<string | null>(null);
    const [activeSettingsAccordion, setActiveSettingsAccordion] = useState<string | null>('ownerInfo');

    useEffect(() => {
        setOwnerFormData(clinicOwnerUser || {name: '', email: '', id: '', roles: [UserRole.CLINIC_OWNER], isActive: true });
    }, [clinicOwnerUser]);

    useEffect(() => {
        if (clinicData?.theraWayMembership?.paymentReceiptUrl) {
            setPaymentReceiptPreview(clinicData.theraWayMembership.paymentReceiptUrl);
        }
    }, [clinicData?.theraWayMembership?.paymentReceiptUrl]);

    const handleOwnerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setOwnerFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };
    const handleOwnerSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleOwnerUserSave(ownerFormData);
    };

    const handlePaymentReceiptFileChange = (file: File | null) => {
        setPaymentReceiptFile(file);
        if(file) {
            const reader = new FileReader();
            reader.onloadend = () => setPaymentReceiptPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setPaymentReceiptPreview(clinicData?.theraWayMembership?.paymentReceiptUrl || null);
        }
    };
    const handleMembershipSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentReceiptFile && !clinicData?.theraWayMembership?.paymentReceiptUrl) {
             alert(t('paymentReceiptRequiredError')); return;
        }
        await handleMembershipApplication(paymentReceiptFile);
        setPaymentReceiptFile(null);
        // Preview will update from clinicData
        const receiptInput = document.getElementById('clinicPaymentReceiptFile') as HTMLInputElement;
        if(receiptInput) receiptInput.value = "";
    };

    const getStatusPillClasses = (status?: MembershipStatus['status'] | Clinic['accountStatus']) => {
        switch (status) {
            case 'active': case 'live': return 'bg-green-100 text-green-700';
            case 'pending_payment': case 'pending_approval': return 'bg-yellow-100 text-yellow-700';
            case 'expired': case 'rejected': return 'bg-red-100 text-red-700';
            case 'cancelled': case 'draft': return 'bg-blue-100 text-blue-700';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusTextKey = (status?: Clinic['accountStatus']) => {
        if (!status) return 'statusNotAvailable';
        return `clinicAccountStatus${status.charAt(0).toUpperCase() + status.slice(1).replace('_', '')}`;
    }

    const needsMembershipAction = !clinicData?.theraWayMembership?.renewalDate || 
                                  new Date(clinicData.theraWayMembership.renewalDate) < new Date() || 
                                  clinicData?.accountStatus === 'rejected' ||
                                  clinicData?.accountStatus === 'draft';


    return (
        <div className="space-y-3">
             {/* Account Status Info Box for Transparency */}
            <div className="p-4 border border-accent/20 bg-accent/5 rounded-lg">
                <h4 className="font-semibold text-accent text-lg mb-2">{t('accountStatusLabel')}</h4>
                <div className="flex items-center gap-3 mb-2">
                    <span className={`px-3 py-1 text-md font-semibold rounded-full ${getStatusPillClasses(clinicData?.accountStatus)}`}>
                        {t(getStatusTextKey(clinicData?.accountStatus), {default: clinicData?.accountStatus || 'N/A' })}
                    </span>
                </div>
                 {clinicData?.accountStatus === 'rejected' && clinicData.adminNotes && (
                    <div className="mt-2 p-3 bg-red-100/50 border border-red-200 rounded-md">
                         <p className="text-sm font-semibold text-red-800">{t('adminNotesLabel')}:</p>
                         <p className="text-sm text-red-700 mt-1">{clinicData.adminNotes}</p>
                    </div>
                )}
                 {clinicData?.theraWayMembership?.status === 'pending_approval' && (
                    <p className="text-sm text-yellow-700 mt-1">{t('applicationUnderReviewMsg')}</p>
                )}
                 {clinicData?.accountStatus === 'live' && clinicData.theraWayMembership?.renewalDate && (
                    <p className="text-sm text-green-700 mt-1">{t('renewalDateLabel')}: {new Date(clinicData.theraWayMembership.renewalDate).toLocaleDateString()}</p>
                 )}
            </div>

            <AccordionSection titleKey="clinicSettingsAccordionOwnerInfoTitle" icon={<UsersIcon />} isOpen={activeSettingsAccordion === "ownerInfo"} onClick={() => setActiveSettingsAccordion(activeSettingsAccordion === "ownerInfo" ? null : "ownerInfo")}>
                <form onSubmit={handleOwnerSubmit} className="space-y-4">
                    <InputField label={t('accountFullNameLabel')} id="name" name="name" value={ownerFormData.name} onChange={handleOwnerChange} />
                    <InputField label={t('accountEmailLabel')} id="email" name="email" type="email" value={ownerFormData.email} disabled description={t('emailChangeDisabledNote')}/>
                    <Button type="submit" disabled={isLoading}>{isLoading ? t('saving') : t('saveChangesButtonLabel')}</Button>
                </form>
            </AccordionSection>

            <AccordionSection 
                titleKey="clinicSettingsAccordionMembershipTitle" 
                icon={<CheckCircleIcon />} 
                isOpen={activeSettingsAccordion === "membership"} 
                onClick={() => setActiveSettingsAccordion(activeSettingsAccordion === "membership" ? null : "membership")}
            >
                 {needsMembershipAction ? (
                    <form onSubmit={handleMembershipSubmit} className="mt-4 pt-4 border-t border-dashed space-y-3">
                         <h5 className="font-medium">{t(clinicData?.accountStatus === 'rejected' ? 'resubmitApplicationTitle' : clinicData?.theraWayMembership?.renewalDate && new Date(clinicData.theraWayMembership.renewalDate) < new Date() ? 'renewMembershipTitle' : 'applyForStandardMembershipTitle')} ({t('clinicMembershipFeeLabel', { price: CLINIC_MEMBERSHIP_FEE})})</h5>
                        <FileUploadField 
                            label={t('attachPaymentReceiptLabel')} id="clinicPaymentReceiptFile"
                            currentFileUrl={paymentReceiptPreview}
                            onFileChange={handlePaymentReceiptFileChange} maxSizeMB={PAYMENT_RECEIPT_MAX_SIZE_MB} accept=".pdf,.jpg,.png"
                            description={t('paymentReceiptDescription', {size: PAYMENT_RECEIPT_MAX_SIZE_MB})}
                            required={!clinicData?.theraWayMembership?.paymentReceiptUrl && !paymentReceiptFile}
                        />
                        <Button type="submit" disabled={isLoading || (!paymentReceiptFile && !clinicData?.theraWayMembership?.paymentReceiptUrl)}>{isLoading ? t('submittingApplication') : t('submitApplicationButton')}</Button>
                    </form>
                ) : (
                    <p className="text-sm text-gray-600">{t('membershipIsActive')}</p>
                )}
            </AccordionSection>

             <AccordionSection 
                titleKey="membershipHistoryTitle" 
                icon={<DocumentDuplicateIcon />}
                isOpen={activeSettingsAccordion === 'history'}
                onClick={() => setActiveSettingsAccordion(activeSettingsAccordion === 'history' ? null : 'history')}
            >
                 {isLoading && membershipHistory.length === 0 ? <p>{t('loading')}...</p> :
                  membershipHistory.length > 0 ? (
                    <ul className="space-y-2 mt-3">
                        {membershipHistory.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(item => (
                            <li key={item.id} className="text-xs p-2 border-b border-gray-100">
                                <strong>{new Date(item.date).toLocaleDateString()}:</strong> {item.action}
                                {item.details && <span className="text-gray-500"> - {item.details}</span>}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500 mt-2">{t('noMembershipHistoryAvailable')}</p>
                )}
            </AccordionSection>

        </div>
    );
};
const ClinicOwnerDashboardPageShell: React.FC = () => {
    const { user: authContextUser, firebaseUser, updateUserAuthContext } = useAuth();
    const { t } = useTranslation();
    const [clinicData, setClinicData] = useState<Clinic | null>(null);
    const [clinicSpaceListings, setClinicSpaceListings] = useState<ClinicSpaceListing[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [membershipHistory, setMembershipHistory] = useState<MembershipHistoryItem[]>([]);


    const clinicOwnerUser = useMemo(() => {
        if (!authContextUser) return null;
        return {
            id: authContextUser.id,
            name: authContextUser.name || '',
            email: authContextUser.email,
            roles: authContextUser.roles,
            profilePictureUrl: authContextUser.profilePictureUrl,
            isActive: true // Assuming active if logged in
        } as UserManagementInfo;
    }, [authContextUser]);


    const fetchClinicDashboardData = useCallback(async () => {
        if (!firebaseUser) return;
        setIsLoading(true);
        try {
            // Fetch Clinic Data (assuming clinic ID is same as owner's user ID for now)
            const clinicDocRef = doc(db, 'clinicsData', firebaseUser.uid);
            const clinicDocSnap = await getDoc(clinicDocRef);
            let currentClinicData: Clinic;

            if (clinicDocSnap.exists()) {
                currentClinicData = { id: clinicDocSnap.id, ...clinicDocSnap.data() } as Clinic;
            } else {
                // Create a draft clinic profile if none exists
                currentClinicData = {
                    id: firebaseUser.uid, // Using user ID as clinic ID here
                    ownerId: firebaseUser.uid,
                    name: t('newClinicNamePlaceholder', { name: authContextUser?.name || 'Owner' }),
                    description: t('newClinicDescriptionPlaceholder'),
                    address: '',
                    whatsappNumber: '',
                    operatingHours: {},
                    amenities: [],
                    accountStatus: 'draft',
                    theraWayMembership: { status: 'none' },
                    photos: [],
                    profilePictureUrl: `https://picsum.photos/seed/${firebaseUser.uid}-clinic/400/300`
                };
                await setDoc(clinicDocRef, {...currentClinicData, createdAt: serverTimestamp(), updatedAt: serverTimestamp()});
            }
            setClinicData(currentClinicData);

            // Fetch Clinic Spaces for this clinic
            const spacesQuery = query(collection(db, 'clinicSpaces'), where('clinicId', '==', currentClinicData.id));
            const spacesSnapshot = await getDocs(spacesQuery);
            setClinicSpaceListings(spacesSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as ClinicSpaceListing)));
            
            // Fetch membership history
            const historyResp = await listMembershipHistory();
            const items = (historyResp.data.membership_history || [])
              .filter((h: MembershipHistoryItem) => h.clinicId === currentClinicData.id)
              .sort((a: MembershipHistoryItem, b: MembershipHistoryItem) => new Date(b.date).getTime() - new Date(a.date).getTime());
            setMembershipHistory(items);


        } catch (error) {
            console.error("Error fetching clinic dashboard data:", error);
        } finally {
            setIsLoading(false);
        }
    }, [firebaseUser, authContextUser, t]);

    useEffect(() => {
        fetchClinicDashboardData();
    }, [fetchClinicDashboardData]);


    const handleClinicProfileSave = async (
        updatedProfile: Partial<Clinic>, 
        profilePicFile?: File | null, 
        newPhotoFiles?: (File|null)[], // Raw new files, or null for unchanged/cleared slots
        photoPreviewsForSave?: (string|null)[] // UI Previews (blob URLs for new, existing server URLs, or null for cleared)
    ) => {
        if (!firebaseUser || !clinicData) return;
        setIsLoading(true);
        const dataToSave: Partial<Clinic> = { ...updatedProfile };
        delete dataToSave.id; delete dataToSave.ownerId; 
        
        const oldProfilePicUrl = clinicData.profilePictureUrl;
        const originalServerPhotos = clinicData.photos || [];

        try {
            // Profile Picture Logic (remains the same)
            if (profilePicFile) {
                const filePath = `clinic_profiles/${clinicData.id}/profile_picture/${profilePicFile.name}-${Date.now()}`;
                dataToSave.profilePictureUrl = await uploadFileToFirebase(profilePicFile, filePath);
                 if(oldProfilePicUrl && oldProfilePicUrl !== dataToSave.profilePictureUrl) await deleteFileFromFirebase(oldProfilePicUrl).catch((e: any)=>console.warn("Old clinic profile pic delete failed",e));
            } else if (updatedProfile.profilePictureUrl === null && oldProfilePicUrl) { 
                 await deleteFileFromFirebase(oldProfilePicUrl).catch((e: any)=>console.warn("Clinic profile pic delete failed",e));
                 dataToSave.profilePictureUrl = undefined;
            }


            // Refined Additional Photos Logic
            const finalPhotoUrls: string[] = [];
            if (newPhotoFiles && photoPreviewsForSave) {
                for (let i = 0; i < 5; i++) { // Assuming max 5 slots
                    const newFile = newPhotoFiles[i];
                    const previewUrl = photoPreviewsForSave[i];
                    const originalUrlInSlot = originalServerPhotos[i] || null;

                    if (newFile) { // A new file was selected and uploaded for this slot
                        const filePath = `clinic_profiles/${clinicData.id}/additional_photos/photo_${i}_${newFile.name}-${Date.now()}`;
                        const uploadedUrl = await uploadFileToFirebase(newFile, filePath);
                        finalPhotoUrls.push(uploadedUrl);
                        if (originalUrlInSlot && originalUrlInSlot !== uploadedUrl) {
                            await deleteFileFromFirebase(originalUrlInSlot).catch((e: any) => console.warn("Old additional photo (replaced) delete failed", e));
                        }
                    } else if (previewUrl && !previewUrl.startsWith('blob:') && originalServerPhotos.includes(previewUrl)) {
                        // No new file, and the preview is an existing server URL that was part of originalPhotos: keep it
                        finalPhotoUrls.push(previewUrl);
                    } else if (originalUrlInSlot && !previewUrl) {
                        // An existing server URL was there, but preview is now null (meaning user cleared it in UI)
                        await deleteFileFromFirebase(originalUrlInSlot).catch((e: any) => console.warn("Old additional photo (cleared) delete failed", e));
                    }
                }
            }
            dataToSave.photos = finalPhotoUrls;
            
            // Fallback: Ensure any original photos not explicitly kept or replaced are deleted
            originalServerPhotos.forEach(async oldUrl => {
                if (!finalPhotoUrls.includes(oldUrl)) {
                    // This photo was in the original list but not in the final list.
                    // It should have been handled by the loop above if it was cleared or replaced.
                    // This is a safeguard but might be redundant if the loop is perfect.
                    // Could be useful if array was shortened.
                     await deleteFileFromFirebase(oldUrl).catch((e: any) => console.warn("Old additional photo (fallback delete) failed", e));
                }
            });


            const clinicDocRef = doc(db, 'clinicsData', clinicData.id);
            await updateDoc(clinicDocRef, { ...dataToSave, updatedAt: serverTimestamp() });
            setClinicData(prev => prev ? ({ ...prev, ...dataToSave }) as Clinic : null);
            alert(t('clinicProfileSavedSuccess'));
        } catch (error: any) {
            console.error("Error saving clinic profile:", error);
            alert(t('errorSavingClinicProfile', { default: `Error saving clinic profile: ${error.message}` }));
        }
        setIsLoading(false);
    };

    const handleMembershipApplication = async (receiptFile: File | null) => {
        if (!firebaseUser || !clinicData) return;
        setIsLoading(true);
        let paymentReceiptUrl = clinicData.theraWayMembership?.paymentReceiptUrl;
        const oldReceiptUrl = clinicData.theraWayMembership?.paymentReceiptUrl;
        try {
            if (receiptFile) {
                const filePath = `clinic_payment_receipts/${clinicData.id}/${receiptFile.name}-${Date.now()}`;
                paymentReceiptUrl = await uploadFileToFirebase(receiptFile, filePath);
                if (oldReceiptUrl && oldReceiptUrl !== paymentReceiptUrl) await deleteFileFromFirebase(oldReceiptUrl).catch((e: any)=>console.warn("Old clinic receipt delete failed",e));
            }
            if (!paymentReceiptUrl) {
                alert(t('paymentReceiptRequiredError')); setIsLoading(false); return;
            }
            
            const membershipUpdateForFirestore: any = { // For Firestore
                theraWayMembership: {
                    ...(clinicData.theraWayMembership || {}),
                    status: 'pending_approval',
                    applicationDate: Timestamp.now().toDate().toISOString(),
                    paymentReceiptUrl,
                    tierName: STANDARD_MEMBERSHIP_TIER_NAME,
                },
                accountStatus: 'pending_approval',
                updatedAt: serverTimestamp(),
            };

            const membershipUpdateForState: Partial<Clinic> = { // For local state
                 theraWayMembership: {
                    ...(clinicData.theraWayMembership || {}),
                    status: 'pending_approval',
                    applicationDate: membershipUpdateForFirestore.theraWayMembership.applicationDate,
                    paymentReceiptUrl: membershipUpdateForFirestore.theraWayMembership.paymentReceiptUrl,
                    tierName: STANDARD_MEMBERSHIP_TIER_NAME,
                },
                accountStatus: 'pending_approval',
            }

            const clinicDocRef = doc(db, 'clinicsData', clinicData.id);
            await updateDoc(clinicDocRef, membershipUpdateForFirestore);

            const historyEntry: MembershipHistoryItem = {
                id: `hist-${Date.now()}`,
                clinicId: clinicData.id,
                date: new Date().toISOString(),
                action: t('membershipAppliedAction', { tier: STANDARD_MEMBERSHIP_TIER_NAME }),
                details: t('receiptUploadedDetails')
            };
            await createMembershipHistoryItem(historyEntry);

            setClinicData(prev => prev ? ({ ...prev, ...membershipUpdateForState }) : null);
            setMembershipHistory(prev => [historyEntry, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));

            alert(t('membershipApplicationSubmitted'));
        } catch (error: any) {
            console.error("Error submitting clinic membership:", error);
            alert(t('errorSubmittingMembership', { default: `Error submitting membership: ${error.message}` }));
        }
        setIsLoading(false);
    };

    const handleAddOrUpdateSpaceListing = async (listing: ClinicSpaceListing, newPhotoFiles: (File | null)[]) => {
        if (!firebaseUser || !clinicData) return;
        setIsLoading(true);
        
        const listingToSave = { ...listing, clinicId: clinicData.id, clinicName: clinicData.name, clinicAddress: clinicData.address };
        const existingListingFromServer = clinicSpaceListings.find(l => l.id === listing.id);
        const originalServerPhotos = existingListingFromServer?.photos || [];
        const finalPhotoUrls: string[] = [];

        try {
            for (let i = 0; i < 5; i++) { // Assuming max 5 slots
                const newFile = newPhotoFiles[i]; // File object for this slot, if any
                const originalUrlInSlot = originalServerPhotos[i] || null;

                if (newFile) { // A new file was selected for this slot
                    const filePath = `clinic_spaces/${clinicData.id}/${listingToSave.id}/photo_${i}_${newFile.name}-${Date.now()}`;
                    const uploadedUrl = await uploadFileToFirebase(newFile, filePath);
                    finalPhotoUrls.push(uploadedUrl);
                    if (originalUrlInSlot && originalUrlInSlot !== uploadedUrl) {
                        await deleteFileFromFirebase(originalUrlInSlot).catch((e: any) => console.warn("Old space photo (replaced) delete failed", e));
                    }
                } else if (originalUrlInSlot && listing.photos?.includes(originalUrlInSlot)) { 
                    // No new file, and original URL was part of the submitted listing's photos (meaning it wasn't cleared in UI)
                    finalPhotoUrls.push(originalUrlInSlot);
                } else if (originalUrlInSlot && (!listing.photos || !listing.photos.includes(originalUrlInSlot))) {
                    // Original URL existed, but it's not in the submitted listing.photos (meaning it was cleared)
                    await deleteFileFromFirebase(originalUrlInSlot).catch((e: any) => console.warn("Old space photo (cleared) delete failed", e));
                }
            }
            listingToSave.photos = finalPhotoUrls;
            
            const spaceDocRef = doc(db, 'clinicSpaces', listingToSave.id);
            if (existingListingFromServer) { 
                await updateDoc(spaceDocRef, { ...listingToSave, updatedAt: serverTimestamp() });
            } else { 
                await setDoc(spaceDocRef, { ...listingToSave, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
            }
            
            fetchClinicDashboardData(); 
            alert(t('clinicSpaceListingSavedSuccess'));
        } catch (error: any) {
            console.error("Error saving clinic space:", error);
             alert(t('errorSavingSpaceListing', { default: `Error saving space listing: ${error.message}` }));
        }
        setIsLoading(false);
    };

    const handleDeleteSpaceListing = async (listingId: string) => {
         if (!firebaseUser || !clinicData) return;
        setIsLoading(true);
        try {
            const listingToDelete = clinicSpaceListings.find(l => l.id === listingId);
            if (listingToDelete?.photos) {
                for (const photoUrl of listingToDelete.photos) {
                    await deleteFileFromFirebase(photoUrl).catch((e: any) => console.warn("Space photo delete during listing delete failed", e));
                }
            }
            await deleteDoc(doc(db, 'clinicSpaces', listingId));
            setClinicSpaceListings(prev => prev.filter(l => l.id !== listingId));
            alert(t('clinicSpaceListingDeletedSuccess'));
        } catch (error: any) {
            console.error("Error deleting space listing:", error);
            alert(t('errorDeletingSpaceListing', { default: `Error deleting space listing: ${error.message}` }));
        }
        setIsLoading(false);
    };
    
    const handleOwnerUserSave = async (updatedUser: Partial<UserManagementInfo>) => {
        if (!firebaseUser) return;
        setIsLoading(true);
        try {
            await updateUserAuthContext({name: updatedUser.name}); // Updates 'users' collection and context
            alert(t('personalInfoSavedSuccess'));
        } catch (error: any) {
            console.error("Error saving owner info:", error);
            alert(t('errorSavingOwnerInfo', { default: `Error saving owner info: ${error.message}` }));
        }
        setIsLoading(false);
    };


    const outletContextValue: OutletContextType = {
        clinicData,
        clinicOwnerUser,
        clinicSpaceListings,
        handleClinicProfileSave,
        handleMembershipApplication,
        handleAddOrUpdateSpaceListing,
        handleDeleteSpaceListing,
        handleOwnerUserSave,
        isLoading,
        membershipHistory,
        // analyticsData: {}, // Placeholder
    };

    return (
        <DashboardLayout role={UserRole.CLINIC_OWNER}>
            <Outlet context={outletContextValue} />
        </DashboardLayout>
    );
};

export const ClinicOwnerDashboardRoutes = () => (
    <Routes>
        <Route element={<ClinicOwnerDashboardPageShell />}>
            <Route index element={<ClinicProfileTabContent />} />
            <Route path="my-clinics" element={<ClinicMySpacesTabContent />} /> {/* Renamed from my-spaces to my-clinics in nav */}
            <Route path="bookings" element={<ClinicBookingsTabContent />} />
            <Route path="analytics" element={<ClinicAnalyticsTabContent />} />
            <Route path="settings" element={<ClinicSettingsTabContent />} />
        </Route>
    </Routes>
);