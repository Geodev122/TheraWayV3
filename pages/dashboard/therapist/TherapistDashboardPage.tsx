import React, { useState, useEffect, FormEvent, useMemo, useCallback } from 'react';
import { Outlet, Route, Routes, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { Therapist, UserRole, Certification, ClinicSpaceListing, Clinic, PracticeLocation, MembershipHistoryItem } from '../../../types'; 
import { 
    CERTIFICATION_MAX_SIZE_MB, 
    THERAPIST_MEMBERSHIP_FEE,
    CLINIC_SPACE_FEATURES_LIST,
    LANGUAGES_LIST,
    SPECIALIZATIONS_LIST,
    VIDEO_MAX_DURATION_SECONDS,
    VIDEO_MAX_SIZE_MB,
    PROFILE_PICTURE_MAX_SIZE_MB,
    STANDARD_MEMBERSHIP_TIER_NAME, 
    PAYMENT_RECEIPT_MAX_SIZE_MB 
} from '../../../constants'; 
import { DashboardLayout } from '../../../components/dashboard/shared/DashboardLayout';
import { 
    DocumentDuplicateIcon, CogIcon, BriefcaseIcon, BuildingOfficeIcon,
    ArrowUpOnSquareIcon, CheckCircleIcon, ExclamationTriangleIcon, XIcon, UsersIcon,
    TableCellsIcon, MapIcon, ListBulletIcon, FilterSolidIcon, InformationCircleIcon, PhotoIcon,
    ChevronDownIcon, ChevronUpIcon, TrashIcon, UserCircleIcon, MapPinIcon, VideoCameraIcon, WhatsAppIcon, ClockIcon
} from '../../../components/icons';
import { Button } from '../../../components/common/Button';
import { FileUploadField, InputField, CheckboxField, SelectField, TextareaField, uploadFileToFirebase, deleteFileFromFirebase } from '../../../components/dashboard/shared/FormElements'; 
import { Modal } from '../../../components/common/Modal';
import { ClinicSpaceCard } from '../../../components/therapist-finder/ClinicSpaceCard';
import { ClinicSpaceDetailModal } from '../../../components/therapist-finder/ClinicSpaceDetailModal';
import { db } from '../../../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, deleteDoc, Timestamp, orderBy } from 'firebase/firestore';
import {
    listMembershipHistory,
    createMembershipHistoryItem
} from '@firebasegen/default-connector';


interface OutletContextType {
  therapistData: Therapist | null;
  userAccountData: { name: string; email: string } | null; 
  handleProfileSave: (updatedProfile: Partial<Therapist>, profilePicFile?: File | null, introVidFile?: File | null) => Promise<void>; 
  handleAccountSave: (updatedAccount: { name: string; email: string }) => Promise<void>; 
  handleMembershipApplication: (receiptFile: File | null) => Promise<void>; 
  handleAddOrUpdateCertification: (certification: Certification, certFile?: File | null) => Promise<void>; 
  handleDeleteCertification: (certId: string) => Promise<void>; 
  isLoading: boolean;
  availableClinicSpaces: ClinicSpaceListing[];
  spaceFeaturesList: string[];
  allClinics: Clinic[]; 
  membershipHistory: MembershipHistoryItem[];
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
    const { t, direction } = useTranslation();
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

const initialLocationState: PracticeLocation = { address: '', isPrimary: false };

const TherapistProfileTabContent: React.FC = () => {
    usePageTitle('dashboardMyProfileTab');
    const { therapistData, handleProfileSave, isLoading: isDashboardLoading } = useOutletContext<OutletContextType>();
    const { t, direction } = useTranslation();
    
    const [formData, setFormData] = useState<Partial<Therapist>>(therapistData || {});
    const [profilePictureFile, setProfilePictureFile] = useState<File | null>(null);
    const [introVideoFile, setIntroVideoFile] = useState<File | null>(null);
    const [activeProfileAccordionSection, setActiveProfileAccordionSection] = useState<string | null>('basicInfo');
    const [otherSpecializationsText, setOtherSpecializationsText] = useState('');
    const [otherLanguagesText, setOtherLanguagesText] = useState('');

    useEffect(() => {
        setFormData(therapistData || {});
        setProfilePictureFile(null);
        setIntroVideoFile(null);
        setOtherSpecializationsText(therapistData?.otherSpecializations?.join(', ') || '');
        setOtherLanguagesText(therapistData?.otherLanguages?.join(', ') || '');
    }, [therapistData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        if (type === 'checkbox') {
            const { checked } = e.target as HTMLInputElement;
            setFormData((prev: Partial<Therapist>) => ({ ...prev, [name]: checked }));
        } else {
            setFormData((prev: Partial<Therapist>) => ({ ...prev, [name]: value }));
        }
    };

    const handleMultiSelectChange = (name: keyof Therapist, selectedOptions: string[]) => {
        setFormData((prev: Partial<Therapist>) => ({ ...prev, [name]: selectedOptions }));
    };
    
    const handleSpecializationsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        handleMultiSelectChange('specializations', selected);
    };

    const handleLanguagesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = Array.from(e.target.selectedOptions, option => option.value);
        handleMultiSelectChange('languages', selected);
    };
    
    const handleQualificationsChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
         const qualificationsArray = e.target.value.split('\n').map(q => q.trim()).filter(q => q);
         setFormData((prev: Partial<Therapist>) => ({ ...prev, qualifications: qualificationsArray }));
    };

    const handleLocationChange = (index: number, field: keyof PracticeLocation, value: string | boolean) => {
        const newLocations = [...(formData.locations || [])];
        if (typeof newLocations[index][field] === 'boolean' && typeof value === 'string') { // Should be boolean for isPrimary
            (newLocations[index] as any)[field] = Boolean(value);
        } else {
             (newLocations[index]as any)[field] = value;
        }
       
        if (field === 'isPrimary' && value === true) {
            newLocations.forEach((loc, i) => {
                if (i !== index) loc.isPrimary = false;
            });
        }
        setFormData((prev: Partial<Therapist>) => ({ ...prev, locations: newLocations }));
    };

    const addLocation = () => {
        const newLocations = [...(formData.locations || []), { ...initialLocationState, isPrimary: !(formData.locations || []).some((l: any) => l.isPrimary) }];
        setFormData((prev: Partial<Therapist>) => ({ ...prev, locations: newLocations }));
    };

    const removeLocation = (index: number) => {
        const newLocations = (formData.locations || []).filter((_: any, i: number) => i !== index);
        if (!newLocations.some((loc: any) => loc.isPrimary) && newLocations.length > 0) {
            newLocations[0].isPrimary = true;
        }
        setFormData((prev: Partial<Therapist>) => ({ ...prev, locations: newLocations }));
    };
  
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const finalFormData = { ...formData };
        if (formData.specializations?.includes('Other')) {
            finalFormData.otherSpecializations = otherSpecializationsText.split(',').map(s => s.trim()).filter(Boolean);
        } else {
            finalFormData.otherSpecializations = [];
        }
        if (formData.languages?.includes('Other')) {
            finalFormData.otherLanguages = otherLanguagesText.split(',').map(l => l.trim()).filter(Boolean);
        } else {
            finalFormData.otherLanguages = [];
        }
        await handleProfileSave(finalFormData, profilePictureFile, introVideoFile);
    };

    const handleProfilePictureFileChange = (file: File | null) => setProfilePictureFile(file);
    const handleIntroVideoFileChange = (file: File | null) => setIntroVideoFile(file);

    const toggleProfileAccordion = (sectionName: string) => {
        setActiveProfileAccordionSection(activeProfileAccordionSection === sectionName ? null : sectionName);
    };

    if (isDashboardLoading && !therapistData) {
        return <div className="p-6 text-center text-textOnLight">{t('loading')}</div>;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-3 bg-primary p-0 sm:p-6 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-textOnLight border-b border-gray-200 pb-4 mb-3 px-4 sm:px-0">{t('editYourProfile')}</h2>

            <AccordionSection
                titleKey="profileBasicInfoAccordionTitle"
                icon={<UserCircleIcon />}
                isOpen={activeProfileAccordionSection === 'basicInfo'}
                onClick={() => toggleProfileAccordion('basicInfo')}
            >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <InputField label={t('fullName')} id="name" name="name" value={formData.name || therapistData?.name || ''} onChange={handleChange} required />
                    <InputField label={t('whatsappNumber')} id="whatsappNumber" name="whatsappNumber" type="tel" value={formData.whatsappNumber || ''} onChange={handleChange} placeholder="+12345678900" required />
                </div>
                <TextareaField label={t('bioAboutMe')} id="bio" name="bio" value={formData.bio || ''} onChange={handleChange} rows={5} required 
                description={t('bioDescription')} />
            </AccordionSection>

            <AccordionSection
                titleKey="profileMediaAccordionTitle"
                icon={<PhotoIcon />}
                isOpen={activeProfileAccordionSection === 'media'}
                onClick={() => toggleProfileAccordion('media')}
            >
                <FileUploadField
                    label={t('profilePicture')}
                    id="profilePictureUrl"
                    currentFileUrl={formData.profilePictureUrl || therapistData?.profilePictureUrl}
                    onFileChange={handleProfilePictureFileChange}
                    accept="image/jpeg, image/png, image/webp"
                    maxSizeMB={PROFILE_PICTURE_MAX_SIZE_MB}
                    description={t('profilePictureDescription', {size: PROFILE_PICTURE_MAX_SIZE_MB})}
                    required={!formData.profilePictureUrl && !therapistData?.profilePictureUrl}
                />
                <FileUploadField
                    label={t('introVideo', {duration: VIDEO_MAX_DURATION_SECONDS})}
                    id="introVideoUrl"
                    currentFileUrl={formData.introVideoUrl || therapistData?.introVideoUrl}
                    onFileChange={handleIntroVideoFileChange}
                    accept="video/mp4, video/webm"
                    maxSizeMB={VIDEO_MAX_SIZE_MB}
                    description={t('introVideoDescription', {duration: VIDEO_MAX_DURATION_SECONDS, size: VIDEO_MAX_SIZE_MB})}
                />
            </AccordionSection>

            <AccordionSection
                titleKey="profileExpertiseAccordionTitle"
                icon={<BriefcaseIcon />}
                isOpen={activeProfileAccordionSection === 'expertise'}
                onClick={() => toggleProfileAccordion('expertise')}
            >
                <div className="mb-4">
                    <label htmlFor="specializations" className="block text-sm font-medium text-gray-700 mb-1">{t('specializationsMultiSelect')}</label>
                    <select 
                        id="specializations" 
                        name="specializations"
                        multiple 
                        value={formData.specializations || []} 
                        onChange={handleSpecializationsChange}
                        className="mt-1 block w-full h-40 px-3 py-2 border border-gray-300 bg-primary text-textOnLight rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                    >
                        {SPECIALIZATIONS_LIST.map((spec: string) => <option key={spec} value={spec}>{spec}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{t('multiSelectHint')}</p>
                </div>
                {formData.specializations?.includes('Other') && (
                    <InputField label={t('otherSpecializationsLabel')} id="otherSpecializations" name="otherSpecializations" value={otherSpecializationsText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherSpecializationsText(e.target.value)} description={t('otherSpecializationsHint')} />
                )}

                <div className="mb-4">
                    <label htmlFor="languages" className="block text-sm font-medium text-gray-700 mb-1">{t('languagesMultiSelect')}</label>
                    <select 
                        id="languages" 
                        name="languages"
                        multiple
                        value={formData.languages || []} 
                        onChange={handleLanguagesChange}
                        className="mt-1 block w-full h-32 px-3 py-2 border border-gray-300 bg-primary text-textOnLight rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                    >
                        {LANGUAGES_LIST.map((lang: string) => <option key={lang} value={lang}>{lang}</option>)}
                    </select>
                    <p className="mt-1 text-xs text-gray-500">{t('multiSelectHint')}</p>
                </div>
                {formData.languages?.includes('Other') && (
                    <InputField label={t('otherLanguagesLabel')} id="otherLanguages" name="otherLanguages" value={otherLanguagesText} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOtherLanguagesText(e.target.value)} description={t('otherLanguagesHint')} />
                )}

                <TextareaField label={t('qualificationsCredentials')} id="qualifications" name="qualifications" 
                    value={(formData.qualifications || []).join('\n')} 
                    onChange={handleQualificationsChange}
                    rows={4} description={t('qualificationsDescription')} />
            </AccordionSection>

            <AccordionSection
                titleKey="profileLocationsAccordionTitle"
                icon={<MapPinIcon />}
                isOpen={activeProfileAccordionSection === 'locations'}
                onClick={() => toggleProfileAccordion('locations')}
            >
                {(formData.locations || []).map((loc: PracticeLocation, index: number) => (
                    <div key={index} className="p-4 border border-gray-200 rounded-md mb-4 relative bg-gray-50/50">
                        <InputField 
                        label={`${t('location', {default: 'Location'})} ${index + 1} ${t('address', {default: 'Address'})}`}
                        id={`location_address_${index}`} 
                        name={`location_address_${index}`}
                        value={loc.address} 
                        onChange={(e) => handleLocationChange(index, 'address', e.target.value)} 
                        containerClassName="mb-2"
                        required
                        />
                        <CheckboxField
                            label={t('setAsPrimaryLocation', {default: 'Set as Primary Location'})}
                            id={`location_isPrimary_${index}`}
                            checked={loc.isPrimary || false}
                            onChange={(e) => handleLocationChange(index, 'isPrimary', e.target.checked)}
                        />
                        <Button 
                            type="button" 
                            variant="danger" 
                            size="sm" 
                            onClick={() => removeLocation(index)}
                            className={`!absolute top-3 ${direction === 'rtl' ? 'left-3' : 'right-3'} !p-1.5`}
                            aria-label={t('removeLocation', {default: 'Remove location'})}
                        >
                            <XIcon className="w-4 h-4" />
                        </Button>
                    </div>
                ))}
                <Button type="button" variant="secondary" onClick={addLocation} leftIcon={<span className={`text-lg font-bold ${direction === 'rtl' ? 'ms-2' : 'me-2'}`}>+</span>}>
                    {t('addAnotherLocation')}
                </Button>
            </AccordionSection>
            
            <div className="pt-6 border-t border-gray-200 mt-4">
                <Button type="submit" variant="primary" size="lg" disabled={isDashboardLoading} leftIcon={<ArrowUpOnSquareIcon className={`w-5 h-5 ${direction === 'rtl' ? 'ms-2' : 'me-2'}`}/>}>
                {isDashboardLoading ? t('saving') : t('saveProfile')}
                </Button>
            </div>
        </form>
    );
};

const TherapistLicensesTabContent: React.FC = () => {
    const { t, direction } = useTranslation();
    usePageTitle('dashboardLicensesTab');
    const { therapistData, handleAddOrUpdateCertification, handleDeleteCertification, isLoading } = useOutletContext<OutletContextType>();
    const [newCertName, setNewCertName] = useState('');
    const [newCertFile, setNewCertFile] = useState<File | null>(null);
    const [newCertFilePath, setNewCertFilePath] = useState<string | null>(null); // For FileUploadField preview
    const [newCertCountry, setNewCertCountry] = useState('');

    const handleAddCertificationSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newCertName || !newCertFile || !newCertCountry) {
            alert(t('certNameFileCountryRequired', {default: "Please provide certification name, file, and country of practice."}));
            return;
        }
        const newCertification: Certification = {
            id: `cert-${Date.now()}-${Math.random().toString(36).substring(2,7)}`, // More unique ID
            name: newCertName,
            fileUrl: '', // Will be populated by handleAddOrUpdateCertification after upload
            uploadedAt: new Date().toISOString(),
            isVerified: false,
            country: newCertCountry,
        };
        await handleAddOrUpdateCertification(newCertification, newCertFile);
        setNewCertName('');
        setNewCertFile(null);
        setNewCertFilePath(null);
        setNewCertCountry('');
        const fileInput = document.getElementById('newCertFile') as HTMLInputElement;
        if (fileInput) fileInput.value = ""; 
    };
    
    const handleDeleteCert = async (certId: string) => {
        if (confirm(t('deleteCertificationConfirm'))) {
            await handleDeleteCertification(certId);
        }
    };
    
    const handleCertFileChange = (file: File | null) => {
        setNewCertFile(file);
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setNewCertFilePath(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            setNewCertFilePath(null);
        }
    };

    return (
        <div className="bg-primary p-6 rounded-lg shadow text-textOnLight">
            <h3 className="text-xl font-semibold mb-4 flex items-center text-accent"><DocumentDuplicateIcon className={`w-6 h-6 ${direction === 'rtl' ? 'ms-2' : 'me-2'}`}/>{t('manageYourLicenses')}</h3>
            
            <form onSubmit={handleAddCertificationSubmit} className="mb-6 p-4 border border-gray-200 rounded-md bg-gray-50/50 space-y-3">
                <h4 className="text-md font-medium text-textOnLight">{t('addNewLicense')}</h4>
                 <InputField 
                    label={t('licenseNamePlaceholder', {default: "License Name (e.g., State Medical License)"})}
                    id="newCertName" 
                    name="newCertName"
                    value={newCertName} 
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCertName(e.target.value)}
                    inputClassName="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm bg-primary text-textOnLight"
                    required
                />
                <InputField
                    label={t('myLicenseCountryPlaceholder', {default: "Country of Practice (e.g., USA)"})}
                    id="newCertCountry"
                    name="newCertCountry"
                    value={newCertCountry}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewCertCountry(e.target.value)}
                    inputClassName="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent sm:text-sm bg-primary text-textOnLight"
                    required
                />
                <FileUploadField 
                    label={t('uploadLicenseFileDescription', {size: CERTIFICATION_MAX_SIZE_MB})} 
                    id="newCertFile" 
                    currentFileUrl={newCertFilePath}
                    onFileChange={handleCertFileChange} 
                    accept=".pdf,.jpg,.jpeg,.png" 
                    maxSizeMB={CERTIFICATION_MAX_SIZE_MB}
                    required
                />
                <Button type="submit" size="sm" leftIcon={<ArrowUpOnSquareIcon/>} disabled={isLoading || !newCertFile}>{isLoading ? t('saving') : t('addLicenseButton')}</Button>
            </form>

            {(therapistData?.certifications?.length || 0) > 0 ? (
                <ul className="space-y-3">
                    {therapistData!.certifications!.map((cert: Certification) => (
                        <li key={cert.id} className="p-3 border border-gray-200 rounded-md flex flex-col sm:flex-row justify-between sm:items-center hover:bg-gray-50/30 transition-colors">
                            <div className="flex-grow mb-2 sm:mb-0">
                                <p className="font-medium text-textOnLight">{cert.name} <span className="text-xs text-gray-400">({cert.country || t('countryNotSpecified', {default: 'Country not specified'})})</span></p>
                                <a href={cert.fileUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-accent hover:underline">{t('viewDocument')}</a>
                                {cert.verificationNotes && <p className="text-xs text-yellow-600 mt-0.5">{t('notes', {default: 'Notes:'})} {cert.verificationNotes}</p>}
                            </div>
                            <div className="flex items-center space-x-2 flex-shrink-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full ${cert.isVerified ? 'bg-green-100 text-green-700' : cert.verificationNotes ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                    {cert.isVerified ? <CheckCircleIcon className="w-3 h-3 inline me-1"/> : <ExclamationTriangleIcon className="w-3 h-3 inline me-1"/> }
                                    {cert.isVerified ? t('verified') : cert.verificationNotes ? t('needsReview') : t('pending')}
                                </span>
                                <Button variant="danger" size="sm" onClick={() => handleDeleteCert(cert.id)} className="!p-1" disabled={isLoading}>
                                    <TrashIcon className="w-4 h-4"/>
                                </Button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : <p className="text-gray-500">{t('noLicensesUploaded')}</p>}
        </div>
    );
}

interface SpaceFilterModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentFilters: SpaceFilters;
    onApplyFilters: (filters: SpaceFilters) => void;
    featuresList: string[];
}
interface SpaceFilters {
    location: string;
    minPrice: string;
    maxPrice: string;
    features: string[];
}

const SpaceFilterModal: React.FC<SpaceFilterModalProps> = ({ isOpen, onClose, currentFilters, onApplyFilters, featuresList }) => {
    const { t } = useTranslation();
    const [tempFilters, setTempFilters] = useState<SpaceFilters>(currentFilters);

    useEffect(() => {
        if (isOpen) {
            setTempFilters(currentFilters);
        }
    }, [currentFilters, isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setTempFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleCheckboxChange = (feature: string) => {
        setTempFilters(prev => {
            const newFeatures = prev.features.includes(feature)
                ? prev.features.filter(f => f !== feature)
                : [...prev.features, feature];
            return { ...prev, features: newFeatures };
        });
    };

    const handleSubmit = () => onApplyFilters(tempFilters);
    const handleReset = () => {
        const reset: SpaceFilters = { location: '', minPrice: '', maxPrice: '', features: [] };
        setTempFilters(reset);
        onApplyFilters(reset); 
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('filterClinicSpacesTitle', {default: "Filter Clinic Spaces"})} size="lg">
            <div className="space-y-6">
                <InputField
                    label={t('filterByLocationLabel')}
                    id="location" name="location"
                    value={tempFilters.location}
                    onChange={handleChange}
                    placeholder={t('filterByLocationPlaceholder', {default: "e.g., Downtown, Wellness City"})}
                />
                <fieldset className="border border-gray-300 p-3 rounded-md">
                    <legend className="text-sm font-medium text-gray-700 px-1">{t('filterByPriceRangeLabel')}</legend>
                    <div className="grid grid-cols-2 gap-3">
                        <InputField label={t('minPriceLabel')} id="minPrice" name="minPrice" type="number" value={tempFilters.minPrice} onChange={handleChange} placeholder="0" />
                        <InputField label={t('maxPriceLabel')} id="maxPrice" name="maxPrice" type="number" value={tempFilters.maxPrice} onChange={handleChange} placeholder="100" />
                    </div>
                </fieldset>
                <fieldset className="border border-gray-300 p-3 rounded-md">
                    <legend className="text-sm font-medium text-gray-700 px-1">{t('filterByFeaturesLabel')}</legend>
                    <div className="max-h-48 overflow-y-auto space-y-2 mt-1">
                        {featuresList.map(feature => (
                            <CheckboxField
                                key={feature}
                                id={`feature-${feature.replace(/\s+/g, '-')}`}
                                label={feature}
                                checked={tempFilters.features.includes(feature)}
                                onChange={() => handleCheckboxChange(feature)}
                                containerClassName="!mb-0"
                            />
                        ))}
                    </div>
                </fieldset>
                <div className="flex flex-col sm:flex-row justify-end space-y-2 sm:space-y-0 sm:space-x-3 pt-4 border-t border-gray-200">
                    <Button variant="light" onClick={handleReset}>{t('resetSpaceFiltersButton')}</Button>
                    <Button variant="primary" onClick={handleSubmit}>{t('applySpaceFiltersButton')}</Button>
                </div>
            </div>
        </Modal>
    );
};

const TherapistSpaceRentalTabContent: React.FC = () => {
    const { t, direction } = useTranslation();
    usePageTitle('dashboardSpaceRentalTab');
    const { availableClinicSpaces, spaceFeaturesList, isLoading: isDashboardLoading, allClinics } = useOutletContext<OutletContextType>();
    
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [filters, setFilters] = useState<SpaceFilters>({ location: '', minPrice: '', maxPrice: '', features: [] });
    const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
    const [selectedSpace, setSelectedSpace] = useState<ClinicSpaceListing | null>(null);

    const liveClinicsMap = useMemo(() => {
        const map = new Map<string, Clinic>();
        allClinics.filter(c => c.accountStatus === 'live').forEach(c => map.set(c.id, c));
        return map;
    }, [allClinics]);

    const clinicWhatsAppMap = useMemo(() => {
        const map = new Map<string, string>();
        allClinics.forEach(clinic => {
            if (clinic.id && clinic.whatsappNumber) { // Assuming clinic id is the document id from clinicsData
                map.set(clinic.id, clinic.whatsappNumber);
            }
        });
        return map;
    }, [allClinics]);

    const filteredSpaces = useMemo(() => {
        return availableClinicSpaces.filter(space => {
            if (!space.clinicId || !liveClinicsMap.has(space.clinicId)) { // Ensure clinic is live
                return false; 
            }
            const nameMatch = space.name.toLowerCase().includes(filters.location.toLowerCase());
            const descMatch = space.description.toLowerCase().includes(filters.location.toLowerCase());
            const addressMatch = space.clinicAddress?.toLowerCase().includes(filters.location.toLowerCase());
            const locationMatch = filters.location ? (nameMatch || descMatch || addressMatch) : true;
            
            const minPriceMatch = filters.minPrice ? space.rentalPrice >= parseFloat(filters.minPrice) : true;
            const maxPriceMatch = filters.maxPrice ? space.rentalPrice <= parseFloat(filters.maxPrice) : true;
            const featureMatch = filters.features.length === 0 || filters.features.every(f => space.features.includes(f));
            return locationMatch && minPriceMatch && maxPriceMatch && featureMatch;
        });
    }, [availableClinicSpaces, filters, liveClinicsMap]);

    const numActiveFilters = useMemo(() => {
        let count = 0;
        if (filters.location) count++;
        if (filters.minPrice || filters.maxPrice) count++;
        if (filters.features.length > 0) count++;
        return count;
    }, [filters]);

    if (isDashboardLoading && availableClinicSpaces.length === 0) return <div className="p-6 text-center text-textOnLight">{t('loading')}</div>;

    return (
        <div className="bg-primary p-6 rounded-lg shadow text-textOnLight">
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-3">
                <h3 className="text-xl font-semibold text-accent flex items-center">
                    <BuildingOfficeIcon className={`w-6 h-6 ${direction === 'rtl' ? 'ms-2' : 'me-2'}`}/>
                    {t('browseClinicSpacesTitle')}
                </h3>
                <div className="flex items-center gap-2">
                    <Button 
                        variant={numActiveFilters > 0 ? "primary" : "ghost"} 
                        size="sm" 
                        onClick={() => setIsFilterModalOpen(true)}
                        leftIcon={<FilterSolidIcon />}
                        className="relative"
                    >
                        {t('filterSpacesButtonLabel')}
                        {numActiveFilters > 0 && (
                            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-primary">
                                {numActiveFilters}
                            </span>
                        )}
                    </Button>
                    <div className="hidden sm:flex items-center border border-gray-300 rounded-md">
                        <Button 
                            variant={viewMode === 'grid' ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => setViewMode('grid')} 
                            leftIcon={<TableCellsIcon />}
                            title={t('viewAsGridLabel')}
                             className="!rounded-r-none !border-r-0"
                        />
                         <Button 
                            variant={viewMode === 'list' ? "secondary" : "ghost"} 
                            size="sm" 
                            onClick={() => setViewMode('list')} 
                            leftIcon={<ListBulletIcon />}
                            title={t('viewAsListLabel')}
                            className="!rounded-l-none"
                        />
                    </div>
                     <div className="sm:hidden flex items-center border border-gray-300 rounded-md">
                        <Button variant={viewMode === 'grid' ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode('grid')} className="!rounded-r-none !border-r-0 !p-2"><TableCellsIcon className="w-5 h-5"/></Button>
                        <Button variant={viewMode === 'list' ? "secondary" : "ghost"} size="sm" onClick={() => setViewMode('list')} className="!rounded-l-none !p-2"><ListBulletIcon className="w-5 h-5"/></Button>
                    </div>
                </div>
            </div>

            {filteredSpaces.length === 0 ? (
                <div className="text-center py-10 border-2 border-dashed border-gray-300 rounded-lg">
                    <InformationCircleIcon className="w-12 h-12 text-gray-400 mx-auto mb-3"/>
                    <p className="text-gray-500">{t('noClinicSpacesFoundMessage')}</p>
                     {numActiveFilters > 0 && <Button variant="light" className="mt-3" onClick={() => setFilters({location: '', minPrice: '', maxPrice: '', features: []})}>{t('resetFilters')}</Button>}
                </div>
            ) : viewMode === 'grid' ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSpaces.map(space => {
                        const clinicOwnerWhatsApp = space.clinicId ? clinicWhatsAppMap.get(space.clinicId) : undefined;
                        return (
                            <ClinicSpaceCard 
                                key={space.id} 
                                space={space} 
                                onViewDetails={() => setSelectedSpace(space)}
                                clinicOwnerWhatsApp={clinicOwnerWhatsApp}
                            />
                        );
                    })}
                </div>
            ) : ( 
                 <div className="divide-y divide-gray-200 border border-gray-200 rounded-md">
                    {filteredSpaces.map(space => {
                        const clinicOwnerWhatsApp = space.clinicId ? clinicWhatsAppMap.get(space.clinicId) : undefined;
                        return (
                            <div key={space.id} className="p-3 hover:bg-gray-50/30 transition-colors">
                                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2">
                                    <div className="flex-grow">
                                        <h4 className="font-medium text-textOnLight cursor-pointer hover:text-accent" onClick={() => setSelectedSpace(space)}>{space.name}</h4>
                                        <p className="text-xs text-gray-500">
                                            <span className="font-semibold">{space.clinicName}</span> - {space.clinicAddress?.split(',').slice(0,2).join(', ')}
                                        </p>
                                        <p className="text-sm text-accent mt-0.5">${space.rentalPrice} / {space.rentalDuration}</p>
                                    </div>
                                    <div className="flex-shrink-0 flex sm:flex-col items-end sm:items-stretch gap-2 mt-2 sm:mt-0">
                                        <Button size="sm" variant="secondary" onClick={() => setSelectedSpace(space)}>{t('viewDetailsButtonLabel')}</Button>
                                        {clinicOwnerWhatsApp && (
                                            <Button 
                                                size="sm" 
                                                variant="ghost" 
                                                onClick={(e: React.MouseEvent<HTMLButtonElement>) => { 
                                                    e.stopPropagation();
                                                    window.open(`https://wa.me/${clinicOwnerWhatsApp.replace(/\D/g, '')}?text=${encodeURIComponent(t('whatsappGreetingClinicSpace', { spaceName: space.name, clinicName: space.clinicName || t('yourClinic', {default: 'your clinic'}), appName: t('appName')}))}`, '_blank');
                                                }} 
                                                leftIcon={<WhatsAppIcon className="w-4 h-4 text-green-500" />} 
                                                className="!text-green-600 hover:!bg-green-50 !border-green-500 whitespace-nowrap">
                                                {t('connectWithClinicOwnerButtonLabel', {default: 'Chat with Owner'})}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {selectedSpace && (
                <ClinicSpaceDetailModal 
                    space={selectedSpace} 
                    isOpen={!!selectedSpace} 
                    onClose={() => setSelectedSpace(null)}
                    clinicOwnerWhatsApp={selectedSpace.clinicId ? clinicWhatsAppMap.get(selectedSpace.clinicId) : undefined}
                />
            )}
            <SpaceFilterModal 
                isOpen={isFilterModalOpen}
                onClose={() => setIsFilterModalOpen(false)}
                currentFilters={filters}
                onApplyFilters={setFilters}
                featuresList={spaceFeaturesList}
            />
        </div>
    );
};

const TherapistSettingsTabContent: React.FC = () => {
    const { t } = useTranslation();
    const { therapistData, userAccountData, handleAccountSave, handleMembershipApplication, isLoading, membershipHistory } = useOutletContext<OutletContextType>();

    const [accountData, setAccountData] = useState(userAccountData || { name: '', email: '' });
    const [paymentReceiptFile, setPaymentReceiptFile] = useState<File | null>(null);
    const [paymentReceiptPreview, setPaymentReceiptPreview] = useState<string | null>(null);
    const [activeSettingsAccordionSection, setActiveSettingsAccordionSection] = useState<string | null>('accountInfo');

    useEffect(() => {
        setAccountData(userAccountData || { name: '', email: '' });
    }, [userAccountData]);
    
    useEffect(() => { // For existing receipt preview
        if (therapistData?.membershipApplication?.paymentReceiptUrl) {
            setPaymentReceiptPreview(therapistData.membershipApplication.paymentReceiptUrl);
        }
    }, [therapistData?.membershipApplication?.paymentReceiptUrl]);

    const handleAccountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setAccountData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleAccountSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await handleAccountSave(accountData);
    };
    
    const handleMembershipSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!paymentReceiptFile && !therapistData?.membershipApplication?.paymentReceiptUrl) {
             alert(t('paymentReceiptRequiredError', { default: 'Payment receipt is required.' }));
            return;
        }
        await handleMembershipApplication(paymentReceiptFile);
        setPaymentReceiptFile(null); 
        setPaymentReceiptPreview(null); // Clear preview after submit, new URL will come from therapistData
        const receiptInput = document.getElementById('therapistPaymentReceiptFile') as HTMLInputElement;
        if(receiptInput) receiptInput.value = "";
    };
    
    const handlePaymentReceiptFileChange = (file: File | null) => {
        setPaymentReceiptFile(file);
        if(file) {
            const reader = new FileReader();
            reader.onloadend = () => setPaymentReceiptPreview(reader.result as string);
            reader.readAsDataURL(file);
        } else {
            // Revert to original if file is cleared and an original existed
            setPaymentReceiptPreview(therapistData?.membershipApplication?.paymentReceiptUrl || null);
        }
    };

    const getAccountStatusPill = (status: Therapist['accountStatus'] | undefined) => {
        if (!status) return null;
        let colorClasses = 'bg-gray-100 text-gray-800';
        let textKey = `therapistAccountStatus${status.charAt(0).toUpperCase() + status.slice(1).replace('_', '')}`;
        
        switch (status) {
            case 'live': colorClasses = 'bg-green-100 text-green-700'; break;
            case 'pending_approval': colorClasses = 'bg-yellow-100 text-yellow-700'; break;
            case 'rejected': colorClasses = 'bg-red-100 text-red-700'; break;
            case 'draft': colorClasses = 'bg-blue-100 text-blue-700'; break;
        }
        return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses}`}>{t(textKey, {default: status})}</span>;
    };

    const needsMembershipAction = !therapistData?.membershipRenewalDate || new Date(therapistData.membershipRenewalDate) < new Date() || therapistData.accountStatus === 'rejected' || therapistData.accountStatus === 'draft';

    const toggleSettingsAccordion = (sectionName: string) => {
        setActiveSettingsAccordionSection(activeSettingsAccordionSection === sectionName ? null : sectionName);
    };

    return (
        <div className="bg-primary p-0 sm:p-6 rounded-lg shadow text-textOnLight space-y-3">
            {/* Account Status Info Box for Transparency */}
            <div className="p-4 border border-accent/20 bg-accent/5 rounded-lg">
                <h4 className="font-semibold text-accent text-lg mb-2">{t('accountStatusLabel')}</h4>
                <div className="flex items-center gap-3 mb-2">
                    <span className="font-bold text-lg">{getAccountStatusPill(therapistData?.accountStatus)}</span>
                </div>
                 {therapistData?.accountStatus === 'rejected' && therapistData.adminNotes && (
                    <div className="mt-2 p-3 bg-red-100/50 border border-red-200 rounded-md">
                         <p className="text-sm font-semibold text-red-800">{t('adminNotesLabel')}:</p>
                         <p className="text-sm text-red-700 mt-1">{therapistData.adminNotes}</p>
                    </div>
                )}
                 {therapistData?.accountStatus === 'pending_approval' && therapistData.membershipApplication?.statusMessage && (
                    <p className="text-sm text-yellow-700 mt-1">{t('applicationStatusMessageLabel', {default: 'Application Status:'})} {therapistData.membershipApplication.statusMessage}</p>
                )}
                 {therapistData?.accountStatus === 'live' && therapistData.membershipRenewalDate && (
                    <p className="text-sm text-green-700 mt-1">{t('renewalDateLabel')}: {new Date(therapistData.membershipRenewalDate).toLocaleDateString()}</p>
                 )}
            </div>

            <AccordionSection 
                titleKey="dashboardAccountInformationTitle" 
                icon={<UsersIcon />}
                isOpen={activeSettingsAccordionSection === 'accountInfo'}
                onClick={() => toggleSettingsAccordion('accountInfo')}
            >
                <form onSubmit={handleAccountSubmit} className="space-y-4">
                    <InputField label={t('fullName')} id="name" name="name" value={accountData.name} onChange={handleAccountChange} />
                    <InputField label={t('emailAddress')} id="email" name="email" type="email" value={accountData.email} onChange={handleAccountChange} 
                     disabled // Email change in Firebase is complex and needs re-auth.
                     description={t('emailChangeDisabledNote', { default: 'Changing email requires re-authentication and is currently disabled here.'})}
                    />
                    <Button type="submit" disabled={isLoading}>{isLoading ? t('saving') : t('saveChangesButtonLabel')}</Button>
                </form>
            </AccordionSection>

            <AccordionSection 
                titleKey="membershipManagementTitle" 
                icon={<CheckCircleIcon />}
                isOpen={activeSettingsAccordionSection === 'membership'}
                onClick={() => toggleSettingsAccordion('membership')}
            >
                {needsMembershipAction ? (
                     <form onSubmit={handleMembershipSubmit} className="mt-4 pt-4 border-t border-dashed border-gray-200 space-y-3">
                         <h5 className="font-medium text-textOnLight">
                            {therapistData?.accountStatus === 'rejected' ? t('resubmitApplicationTitle', {default: 'Resubmit Membership Application'}) :
                             (therapistData?.membershipRenewalDate && new Date(therapistData.membershipRenewalDate) < new Date() ? t('renewMembershipTitle', {default: 'Renew Your Membership'}) :
                             t('applyForMembershipTitle', {default: 'Apply for Membership'}))
                            } ({t('therapistMembershipFeeLabel', {price: THERAPIST_MEMBERSHIP_FEE})})
                        </h5>
                        <FileUploadField 
                            label={t('attachPaymentReceiptLabel')} 
                            id="therapistPaymentReceiptFile"
                            onFileChange={handlePaymentReceiptFileChange}
                            currentFileUrl={paymentReceiptPreview} // Use state for preview consistency
                            maxSizeMB={PAYMENT_RECEIPT_MAX_SIZE_MB}
                            accept=".pdf,.jpg,.png"
                            description={t('paymentReceiptDescription', {size: PAYMENT_RECEIPT_MAX_SIZE_MB})}
                            required={!therapistData?.membershipApplication?.paymentReceiptUrl && !paymentReceiptFile}
                        />
                        <Button type="submit" disabled={isLoading || (!paymentReceiptFile && !therapistData?.membershipApplication?.paymentReceiptUrl)}>
                            {isLoading ? t('submittingApplication') : 
                             ((therapistData?.membershipRenewalDate && new Date(therapistData.membershipRenewalDate) < new Date() ? t('renewMembershipButtonLabel') : t('applyForMembershipButtonLabel')))}
                        </Button>
                    </form>
                ) : (
                  <p className="text-sm text-gray-600">{t('membershipIsActive')}</p>
                )}
            </AccordionSection>

            <AccordionSection 
                titleKey="membershipHistoryTitle" 
                icon={<DocumentDuplicateIcon />}
                isOpen={activeSettingsAccordionSection === 'history'}
                onClick={() => toggleSettingsAccordion('history')}
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
                    <p className="text-sm text-gray-500 mt-2">{t('noMembershipHistoryAvailable', { default: 'No membership history available.'})}</p>
                )}
            </AccordionSection>
        </div>
    );
};

const TherapistDashboardPageShell: React.FC = () => {
    const { user: authContextUser, firebaseUser, updateUserAuthContext } = useAuth(); 
    const { t } = useTranslation();
    const [therapistData, setTherapistData] = useState<Therapist | null>(null);
    const [userAccountData, setUserAccountData] = useState<{ name: string, email: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [availableClinicSpaces, setAvailableClinicSpaces] = useState<ClinicSpaceListing[]>([]);
    const [allClinics, setAllClinics] = useState<Clinic[]>([]);
    const [membershipHistory, setMembershipHistory] = useState<MembershipHistoryItem[]>([]);

    const fetchDashboardData = useCallback(async () => {
        if (firebaseUser) {
            setIsLoading(true);
            try {
                const therapistDocRef = doc(db, 'therapistsData', firebaseUser.uid);
                const therapistDocSnap = await getDoc(therapistDocRef);

                if (therapistDocSnap.exists()) {
                    setTherapistData({ id: therapistDocSnap.id, ...therapistDocSnap.data() } as Therapist);
                } else {
                    const newTherapist: Therapist = {
                        id: firebaseUser.uid,
                        name: authContextUser?.name || t('newTherapistNamePlaceholder', {default: "New Therapist Profile"}),
                        email: authContextUser?.email || firebaseUser.email || '',
                        profilePictureUrl: authContextUser?.profilePictureUrl || `https://picsum.photos/seed/${firebaseUser.uid}/300/300`, // Placeholder image
                        specializations: [], languages: [], qualifications: [], bio: '', locations: [initialLocationState], whatsappNumber: '',
                        accountStatus: 'draft',
                        certifications: [],
                    };
                    await setDoc(therapistDocRef, { ...newTherapist, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
                    setTherapistData(newTherapist);
                }
                setUserAccountData({ name: authContextUser?.name || firebaseUser.displayName || '', email: authContextUser?.email || firebaseUser.email || '' });

                const clinicsQuery = query(collection(db, 'clinicsData'), where('accountStatus', '==', 'live'));
                const liveClinicsSnapshot = await getDocs(clinicsQuery);
                const liveClinicsData = liveClinicsSnapshot.docs.map((d: any) => ({id: d.id, ...d.data() } as Clinic));
                setAllClinics(liveClinicsData);
                const liveClinicIds = liveClinicsData.map((c: any) => c.id);

                if (liveClinicIds.length > 0) {
                    // Firestore 'in' queries are limited to 30 items. If more clinics, need multiple queries or different strategy.
                    const spacesQuery = query(collection(db, 'clinicSpaces'), where('clinicId', 'in', liveClinicIds.slice(0,30)));
                    const spacesSnapshot = await getDocs(spacesQuery);
                    setAvailableClinicSpaces(spacesSnapshot.docs.map((d: any) => ({ id: d.id, ...d.data() } as ClinicSpaceListing)));
                } else {
                    setAvailableClinicSpaces([]);
                }
                
                const historyResp = await listMembershipHistory();
                const items = (historyResp.data.membership_history || [])
                    .filter((h: MembershipHistoryItem) => h.clinicId === firebaseUser.uid)
                    .sort((a: MembershipHistoryItem, b: MembershipHistoryItem) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setMembershipHistory(items);

            } catch (error) {
                console.error("Firebase error fetching therapist dashboard data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [firebaseUser, authContextUser, t]);

    useEffect(() => {
        fetchDashboardData();
    }, [fetchDashboardData]);


    const handleProfileSave = async (updatedProfileData: Partial<Therapist>, profilePicFile?: File | null, introVidFile?: File | null) => {
        if (!firebaseUser || !therapistData) return;
        setIsLoading(true);
        
        let dataToSave: Partial<Therapist> = { ...updatedProfileData };
        delete dataToSave.id; 
        const oldProfilePicUrl = therapistData.profilePictureUrl;
        const oldIntroVideoUrl = therapistData.introVideoUrl;

        try {
            if (profilePicFile) {
                const filePath = `therapist_profiles/${firebaseUser.uid}/profile_pictures/${profilePicFile.name}-${Date.now()}`;
                dataToSave.profilePictureUrl = await uploadFileToFirebase(profilePicFile, filePath);
                if(oldProfilePicUrl && oldProfilePicUrl !== dataToSave.profilePictureUrl) await deleteFileFromFirebase(oldProfilePicUrl).catch((e: any) => console.warn("Old profile pic delete failed", e));
            }
            if (introVidFile) {
                const filePath = `therapist_profiles/${firebaseUser.uid}/intro_videos/${introVidFile.name}-${Date.now()}`;
                dataToSave.introVideoUrl = await uploadFileToFirebase(introVidFile, filePath);
                 if(oldIntroVideoUrl && oldIntroVideoUrl !== dataToSave.introVideoUrl) await deleteFileFromFirebase(oldIntroVideoUrl).catch((e: any) => console.warn("Old intro video delete failed", e));
            }
        
            const therapistDocRef = doc(db, 'therapistsData', firebaseUser.uid);
            await updateDoc(therapistDocRef, { ...dataToSave, updatedAt: serverTimestamp()});
            
            const mergedData = { ...therapistData, ...dataToSave };
            setTherapistData(mergedData as Therapist);
            if (dataToSave.name && authContextUser?.name !== dataToSave.name) {
                await updateUserAuthContext({name: dataToSave.name, profilePictureUrl: dataToSave.profilePictureUrl});
            } else if (dataToSave.profilePictureUrl !== authContextUser?.profilePictureUrl) {
                 await updateUserAuthContext({profilePictureUrl: dataToSave.profilePictureUrl});
            }
            alert(t('profileSavedSuccess'));
        } catch (error: any) {
            console.error("Error saving therapist profile:", error);
            alert(t('errorSavingProfile', { default: `Error saving profile: ${error.message}`}));
        }
        setIsLoading(false);
    };
    
    const handleAccountSave = async (updatedAccount: { name: string; email: string }) => {
        if (!firebaseUser) return;
        setIsLoading(true);
        try {
            await updateUserAuthContext({name: updatedAccount.name}); // This updates 'users' collection via context
            
            if (therapistData && therapistData.name !== updatedAccount.name) {
                const therapistDocRef = doc(db, 'therapistsData', firebaseUser.uid);
                await updateDoc(therapistDocRef, { name: updatedAccount.name, updatedAt: serverTimestamp() });
                setTherapistData((prev: Therapist | null) => prev ? {...prev, name: updatedAccount.name} : null);
            }
             setUserAccountData(updatedAccount); // Update local state for settings tab
            alert(t('accountInfoSavedSuccess'));
        } catch (error: any) {
            console.error("Error saving account info:", error);
            alert(t('errorSavingAccountInfo', { default: `Error saving account info: ${error.message}`}));
        }
        setIsLoading(false);
    };

    const handleMembershipApplication = async (receiptFile: File | null) => {
        if (!firebaseUser || !therapistData) return;
        setIsLoading(true);
        let paymentReceiptUrl = therapistData.membershipApplication?.paymentReceiptUrl;
        const oldReceiptUrl = therapistData.membershipApplication?.paymentReceiptUrl;

        try {
            if (receiptFile) {
                const filePath = `therapist_profiles/${firebaseUser.uid}/payment_receipts/${receiptFile.name}-${Date.now()}`;
                paymentReceiptUrl = await uploadFileToFirebase(receiptFile, filePath);
                 if(oldReceiptUrl && oldReceiptUrl !== paymentReceiptUrl) await deleteFileFromFirebase(oldReceiptUrl).catch((e: any) => console.warn("Old receipt delete failed", e));
            }
            if (!paymentReceiptUrl) {
                alert(t('paymentReceiptRequiredError'));
                setIsLoading(false); return;
            }

            const applicationDataForFirestore = {
                membershipApplication: {
                    date: new Date().toISOString(),
                    paymentReceiptUrl,
                    statusMessage: "Awaiting admin review",
                },
                accountStatus: 'pending_approval' as const,
                updatedAt: serverTimestamp(),
            };

            const applicationDataForState: Partial<Therapist> = {
                 membershipApplication: {
                    date: applicationDataForFirestore.membershipApplication.date,
                    paymentReceiptUrl: applicationDataForFirestore.membershipApplication.paymentReceiptUrl,
                    statusMessage: applicationDataForFirestore.membershipApplication.statusMessage,
                },
                accountStatus: 'pending_approval',
            }
            
            const therapistDocRef = doc(db, 'therapistsData', firebaseUser.uid);
            await updateDoc(therapistDocRef, applicationDataForFirestore);
            
            const historyEntry: MembershipHistoryItem = {
                id: `hist-${Date.now()}`,
                clinicId: firebaseUser.uid,
                date: new Date().toISOString(),
                action: t('membershipAppliedAction', { tier: STANDARD_MEMBERSHIP_TIER_NAME }),
                details: t('receiptUploadedDetails')
            };
            await createMembershipHistoryItem(historyEntry);

            setTherapistData((prev: Therapist | null) => prev ? ({...prev, ...applicationDataForState}) : null);
            setMembershipHistory(prev => [historyEntry, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            alert(t('membershipApplicationSubmitted'));

        } catch (error: any) {
            console.error("Membership application error:", error);
            alert(t('errorSubmittingApplication', {default: `Error submitting application: ${error.message}`}));
        }
        setIsLoading(false);
    };

    const handleAddOrUpdateCertification = async (certification: Certification, certFile?: File | null) => {
        if (!firebaseUser || !therapistData) return;
        setIsLoading(true);
        let finalCertification = {...certification};
        const oldCertFileUrl = therapistData.certifications?.find((c: Certification) => c.id === certification.id)?.fileUrl;

        try {
            if (certFile) {
                const filePath = `therapist_profiles/${firebaseUser.uid}/certifications/${finalCertification.id}-${certFile.name}`;
                finalCertification.fileUrl = await uploadFileToFirebase(certFile, filePath);
                if(oldCertFileUrl && oldCertFileUrl !== finalCertification.fileUrl) await deleteFileFromFirebase(oldCertFileUrl).catch((e: any) => console.warn("Old cert file delete failed", e));
            }
            if (!finalCertification.fileUrl) { 
                 alert(t('certNameFileRequired')); setIsLoading(false); return;
            }
            finalCertification.uploadedAt = new Date().toISOString();
            finalCertification.isVerified = false; // Reset verification status on new upload/update
            finalCertification.verificationNotes = "";


            const existingCertIndex = therapistData.certifications?.findIndex((c: Certification) => c.id === finalCertification.id) ?? -1;
            let updatedCerts;
            if (existingCertIndex > -1 && therapistData.certifications) { 
                updatedCerts = therapistData.certifications.map((c: Certification) => c.id === finalCertification.id ? finalCertification : c);
            } else { 
                updatedCerts = [...(therapistData.certifications || []), finalCertification];
            }
            
            const therapistDocRef = doc(db, 'therapistsData', firebaseUser.uid);
            await updateDoc(therapistDocRef, { certifications: updatedCerts, updatedAt: serverTimestamp() });
            setTherapistData((prev: Therapist | null) => prev ? ({ ...prev, certifications: updatedCerts }) : null);
            alert(t('profileSavedSuccess')); 
        } catch (error: any) {
            console.error("Certification save error:", error);
            alert(t('errorSavingCertification', {default: `Error saving certification: ${error.message}`}));
        }
        setIsLoading(false);
    };

    const handleDeleteCertification = async (certId: string) => {
        if (!firebaseUser || !therapistData || !therapistData.certifications) return;
        setIsLoading(true);
        try {
            const certToDelete = therapistData.certifications.find((c: Certification) => c.id === certId);
            if (certToDelete?.fileUrl) {
                await deleteFileFromFirebase(certToDelete.fileUrl).catch((e: any) => console.warn("Cert file delete failed", e));
            }

            const updatedCerts = therapistData.certifications.filter((c: Certification) => c.id !== certId);
            const therapistDocRef = doc(db, 'therapistsData', firebaseUser.uid);
            await updateDoc(therapistDocRef, { certifications: updatedCerts, updatedAt: serverTimestamp() });
            setTherapistData((prev: Therapist | null) => prev ? ({ ...prev, certifications: updatedCerts }) : null);
            alert(t('certificationDeletedSuccess', {default: "Certification deleted."}));
        } catch (error: any) {
            console.error("Certification delete error:", error);
            alert(t('errorDeletingCertification', {default: `Error deleting certification: ${error.message}`}));
        }
        setIsLoading(false);
    };

    const outletContextValue: OutletContextType = {
        therapistData,
        userAccountData,
        handleProfileSave,
        handleAccountSave,
        handleMembershipApplication,
        handleAddOrUpdateCertification,
        handleDeleteCertification,
        isLoading,
        availableClinicSpaces,
        spaceFeaturesList: CLINIC_SPACE_FEATURES_LIST,
        allClinics,
        membershipHistory
    };

    return (
        <DashboardLayout role={UserRole.THERAPIST}>
            <Outlet context={outletContextValue} />
        </DashboardLayout>
    );
};

export const TherapistDashboardRoutes = () => (
    <Routes>
        <Route element={<TherapistDashboardPageShell />}>
            <Route index element={<TherapistProfileTabContent />} />
            <Route path="licenses" element={<TherapistLicensesTabContent />} />
            <Route path="space-rental" element={<TherapistSpaceRentalTabContent />} />
            <Route path="settings" element={<TherapistSettingsTabContent />} />
        </Route>
    </Routes>
);