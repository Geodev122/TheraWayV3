
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, Route, Routes, useOutletContext, NavLink } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { Therapist, UserRole, Certification, ClinicSpaceListing, Clinic, PracticeLocation, MembershipHistoryItem } from '../../../types'; 
import { 
    CERTIFICATION_MAX_SIZE_MB, THERAPIST_MEMBERSHIP_FEE, CLINIC_SPACE_FEATURES_LIST,
    LANGUAGES_LIST, SPECIALIZATIONS_LIST, VIDEO_MAX_DURATION_SECONDS,
    VIDEO_MAX_SIZE_MB, PROFILE_PICTURE_MAX_SIZE_MB, STANDARD_MEMBERSHIP_TIER_NAME, 
    PAYMENT_RECEIPT_MAX_SIZE_MB 
} from '../../../constants'; 
import { DashboardLayout } from '../../components/dashboard/shared/DashboardLayout';
import { 
    DocumentDuplicateIcon, CogIcon, BriefcaseIcon, BuildingOfficeIcon,
    ArrowUpOnSquareIcon, CheckCircleIcon, ExclamationTriangleIcon, XIcon, UsersIcon,
    TableCellsIcon, MapIcon, ListBulletIcon, FilterSolidIcon, InformationCircleIcon, PhotoIcon,
    TrashIcon, UserCircleIcon, MapPinIcon, VideoCameraIcon, PlusCircleIcon, PencilIcon
} from '../../components/icons';
import { Button } from '../../components/common/Button';
import { FileUploadField, InputField, CheckboxField, SelectField, TextareaField, uploadFileToFirebase, deleteFileFromFirebase } from '../../components/dashboard/shared/FormElements'; 
import { Modal } from '../../components/common/Modal';
import { ClinicSpaceCard } from '../../components/therapist-finder/ClinicSpaceCard';
import { ClinicSpaceDetailModal } from '../../components/therapist-finder/ClinicSpaceDetailModal';
import { db } from '../../firebase';
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useForm, useFieldArray, Controller, SubmitHandler } from 'react-hook-form';
import { AccordionSection } from '../../components/dashboard/shared/AccordionSection';


// FULL FILE CONTENT continues...
const TherapistDashboardPageShell: React.FC = () => {
    const { user: authContextUser, firebaseUser, updateUserAuthContext } = useAuth(); 
    const { t } = useTranslation();
    const queryClient = useQueryClient();

    const { data: therapistData, isLoading: isTherapistLoading } = useQuery({
        queryKey: ['therapistData', firebaseUser?.uid],
        queryFn: async () => {
            if (!firebaseUser) return null;
            const therapistDocRef = doc(db, 'therapistsData', firebaseUser.uid);
            const therapistDocSnap = await getDoc(therapistDocRef);
            if (therapistDocSnap.exists()) {
                return { id: therapistDocSnap.id, ...therapistDocSnap.data() } as Therapist;
            }
            // Create a draft if none exists
            const newTherapist: Therapist = {
                id: firebaseUser.uid,
                name: authContextUser?.name || t('newTherapistNamePlaceholder'),
                email: authContextUser?.email || firebaseUser.email || '',
                profilePictureUrl: authContextUser?.profilePictureUrl || '',
                specializations: [], languages: [], qualifications: [], bio: '', locations: [{ address: '', isPrimary: true }], whatsappNumber: '',
                accountStatus: 'draft',
                certifications: [],
            };
            await setDoc(therapistDocRef, { ...newTherapist, createdAt: serverTimestamp() });
            return newTherapist;
        },
        enabled: !!firebaseUser,
    });
    
    // ... Other queries for spaces, clinics, history ...

    const saveProfileMutation = useMutation({
        mutationFn: async ({ updatedProfile, profilePicFile, introVidFile }: { updatedProfile: Partial<Therapist>, profilePicFile?: File | null, introVidFile?: File | null }) => {
            if (!firebaseUser || !therapistData) throw new Error("User or data not available");

            let dataToSave = { ...updatedProfile };
            if (profilePicFile) {
                const filePath = `therapist_profiles/${firebaseUser.uid}/profile_pictures/${profilePicFile.name}-${Date.now()}`;
                dataToSave.profilePictureUrl = await uploadFileToFirebase(profilePicFile, filePath);
                if(therapistData.profilePictureUrl) await deleteFileFromFirebase(therapistData.profilePictureUrl).catch(console.warn);
            } else if (updatedProfile.profilePictureUrl === null && therapistData.profilePictureUrl) {
                await deleteFileFromFirebase(therapistData.profilePictureUrl).catch(console.warn);
            }
            
            if (introVidFile) {
                 const filePath = `therapist_profiles/${firebaseUser.uid}/intro_videos/${introVidFile.name}-${Date.now()}`;
                dataToSave.introVideoUrl = await uploadFileToFirebase(introVidFile, filePath);
                if(therapistData.introVideoUrl) await deleteFileFromFirebase(therapistData.introVideoUrl).catch(console.warn);
            } else if (updatedProfile.introVideoUrl === null && therapistData.introVideoUrl) {
                await deleteFileFromFirebase(therapistData.introVideoUrl).catch(console.warn);
            }

            const therapistDocRef = doc(db, 'therapistsData', firebaseUser.uid);
            await updateDoc(therapistDocRef, { ...dataToSave, updatedAt: serverTimestamp() });
            return dataToSave;
        },
        onSuccess: (data) => {
            toast.success(t('profileSavedSuccess'));
            queryClient.invalidateQueries({ queryKey: ['therapistData', firebaseUser?.uid] });
            if (data.name !== authContextUser?.name || data.profilePictureUrl !== authContextUser?.profilePictureUrl) {
                 updateUserAuthContext({ name: data.name, profilePictureUrl: data.profilePictureUrl });
            }
        },
        onError: (error: Error) => toast.error(t('errorSavingProfile', { error: error.message }))
    });
    
    // ... Other mutations for account, membership, certifications ...
    
    const isLoading = isTherapistLoading || saveProfileMutation.isPending; // Combine loading states

    const outletContextValue = {
        therapistData,
        isLoading,
        saveProfileMutation,
        // ... pass other mutations and data
    };

    return (
        <DashboardLayout role={UserRole.THERAPIST}>
            <Outlet context={outletContextValue} />
        </DashboardLayout>
    );
};
