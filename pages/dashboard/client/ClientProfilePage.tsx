
import React, { useEffect, useCallback } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { useTranslation } from '../../../hooks/useTranslation';
import { usePageTitle } from '../../../hooks/usePageTitle';
import { Button } from '../../../components/common/Button';
import { InputField, FileUploadField, uploadFileToFirebase, deleteFileFromFirebase } from '../../../components/dashboard/shared/FormElements';
import { ArrowUpOnSquareIcon, UserCircleIcon } from '../../../components/icons';
import { PROFILE_PICTURE_MAX_SIZE_MB } from '../../../constants';
import { db } from '../../../firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm, SubmitHandler, Controller } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';

type ProfileFormInputs = {
  name: string;
  email: string;
  profilePictureFile: File | null;
};

export const ClientProfilePage: React.FC = () => {
  const { user, firebaseUser, authLoading, updateUserAuthContext } = useAuth(); 
  const { t, direction } = useTranslation();
  usePageTitle('clientProfilePageTitle');

  const { control, handleSubmit, reset, formState: { isSubmitting, errors } } = useForm<ProfileFormInputs>({
    defaultValues: {
      name: '',
      email: '',
      profilePictureFile: null,
    }
  });

  useEffect(() => {
    if (user) {
      reset({
        name: user.name || '',
        email: user.email || '',
        profilePictureFile: null,
      });
    }
  }, [user, reset]);

  const saveProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormInputs) => {
        if (!user || !firebaseUser) {
            throw new Error(t('authenticationError'));
        }

        let newProfilePictureServerUrl = user.profilePictureUrl;
        const oldProfilePictureUrl = user.profilePictureUrl;

        if (data.profilePictureFile) {
            const filePath = `profile_pictures/${firebaseUser.uid}/${data.profilePictureFile.name}-${Date.now()}`;
            newProfilePictureServerUrl = await uploadFileToFirebase(data.profilePictureFile, filePath);
            if (oldProfilePictureUrl && oldProfilePictureUrl !== newProfilePictureServerUrl) {
                await deleteFileFromFirebase(oldProfilePictureUrl).catch(console.warn);
            }
        } else if (data.profilePictureFile === null && oldProfilePictureUrl && !user.profilePictureUrl?.includes('blob:')) {
            // File was cleared in the form
            newProfilePictureServerUrl = null;
            await deleteFileFromFirebase(oldProfilePictureUrl).catch(console.warn);
        }

        const userDocRef = doc(db, 'users', firebaseUser.uid);
        const updatedUserData: Partial<typeof user> = {
            name: data.name,
            profilePictureUrl: newProfilePictureServerUrl
        };
        await updateDoc(userDocRef, { ...updatedUserData, updatedAt: serverTimestamp() });
        
        await updateUserAuthContext(updatedUserData);
        return newProfilePictureServerUrl;
    },
    onSuccess: (newUrl) => {
        toast.success(t('clientAccountSavedSuccess'));
        reset({ profilePictureFile: null }); // Clear file input from form state
    },
    onError: (error: Error) => {
        toast.error(error.message);
    }
  });
  
  const onSubmit: SubmitHandler<ProfileFormInputs> = (data) => {
    saveProfileMutation.mutate(data);
  };
  
  if (authLoading && !user) {
    return <div className="p-6 text-center text-textOnLight">{t('loading')}</div>;
  }
  if (!user) {
    return <div className="p-6 text-center text-textOnLight">{t('pleaseLoginToViewProfile')}</div>;
  }

  return (
    <div className="container mx-auto max-w-2xl flex-grow flex flex-col py-6 px-4 overflow-hidden">
      <div className="bg-primary p-6 sm:p-8 rounded-xl shadow-xl w-full flex-grow flex flex-col overflow-hidden">
        <div className="flex items-center mb-6 pb-4 border-b border-gray-200">
            {user.profilePictureUrl ? (
                <img src={user.profilePictureUrl} alt={t('profilePicture')} className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mr-4 border-2 border-accent" loading="lazy" />
            ) : (
                <UserCircleIcon className={`w-20 h-20 sm:w-24 sm:h-24 text-gray-300 ${direction === 'rtl' ? 'ms-4' : 'me-4'}`} />
            )}
            <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-accent">{t('clientProfileManagementTab')}</h1>
            </div>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex flex-col flex-grow h-full overflow-hidden">
          <div className="flex-grow overflow-y-auto space-y-6 pr-2">
            <Controller
                name="profilePictureFile"
                control={control}
                render={({ field }) => (
                     <FileUploadField
                        label={t('profilePicture')}
                        id="profilePictureFile"
                        currentFileUrl={user.profilePictureUrl}
                        onFileChange={field.onChange}
                        accept="image/jpeg, image/png, image/webp"
                        maxSizeMB={PROFILE_PICTURE_MAX_SIZE_MB}
                        description={t('profilePictureDescription', { size: PROFILE_PICTURE_MAX_SIZE_MB })}
                      />
                )}
            />
            <Controller
                name="name"
                control={control}
                rules={{ required: 'Full name is required' }}
                render={({ field }) => <InputField label={t('fullName')} id="name" {...field} required error={errors.name} />}
            />
            <Controller
                name="email"
                control={control}
                rules={{ required: 'Email is required' }}
                render={({ field }) => (
                    <InputField
                        label={t('emailAddress')}
                        id="email"
                        type="email"
                        {...field}
                        required
                        disabled
                        description={t('emailChangeDisabledNote')}
                        error={errors.email}
                    />
                )}
            />
          </div>
          <div className="pt-2 mt-auto flex-shrink-0">
            <Button type="submit" variant="primary" size="lg" isLoading={isSubmitting || authLoading} disabled={isSubmitting || authLoading} leftIcon={<ArrowUpOnSquareIcon />}>
              {isSubmitting ? t('saving') : t('saveChangesButtonLabel')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
