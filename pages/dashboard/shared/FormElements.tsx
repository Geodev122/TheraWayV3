
import React, { ChangeEvent, useState, useEffect } from 'react';
import { InformationCircleIcon, ArrowUpOnSquareIcon, XCircleIcon } from '../../../components/icons'; // Added XCircleIcon
import { useTranslation } from '../../../hooks/useTranslation'; 
import * as fireStorage from "firebase/storage";
import { storage } from '../../../firebase'; // Import Firebase storage instance

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  id: string;
  error?: string | { message?: string }; // Can accept string or react-hook-form error object
  containerClassName?: string;
  labelClassName?: string;
  inputClassName?: string;
  description?: string;
}

export const InputField: React.FC<InputProps> = ({
  label,
  id,
  error,
  containerClassName = 'mb-5', 
  labelClassName = 'block text-sm font-medium text-textDarker mb-1.5', 
  inputClassName = 'mt-1 block w-full px-4 py-2.5 border border-secondary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent sm:text-sm disabled:bg-gray-100 text-textOnLight bg-primary placeholder-gray-400 transition-colors',
  description,
  ...props
}) => {
  const { direction } = useTranslation();
  const errorMessage = typeof error === 'string' ? error : error?.message;
  return (
    <div className={containerClassName}>
      {label && (
        <label htmlFor={id} className={labelClassName}>
          {label}
          {props.required && <span className={`text-danger ${direction === 'rtl' ? 'mr-1' : 'ml-1'}`}>*</span>}
        </label>
      )}
      <input id={id} name={id} className={`${inputClassName} ${errorMessage ? 'border-danger focus:ring-danger/50 focus:border-danger' : ''}`} {...props} />
      {description && <p className="mt-1.5 text-xs text-textOnLight/70 flex items-center"><InformationCircleIcon className={`w-3.5 h-3.5 text-subtleBlue ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`}/>{description}</p>}
      {errorMessage && <p className="mt-1.5 text-xs text-danger">{errorMessage}</p>}
    </div>
  );
};

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  id: string;
  error?: string | { message?: string };
  containerClassName?: string;
  labelClassName?: string;
  textareaClassName?: string;
  description?: string;
}

export const TextareaField: React.FC<TextareaProps> = ({
  label,
  id,
  error,
  containerClassName = 'mb-5',
  labelClassName = 'block text-sm font-medium text-textDarker mb-1.5',
  textareaClassName = 'mt-1 block w-full px-4 py-2.5 border border-secondary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent sm:text-sm disabled:bg-gray-100 text-textOnLight bg-primary placeholder-gray-400 transition-colors',
  description,
  ...props
}) => {
  const { direction } = useTranslation();
  const errorMessage = typeof error === 'string' ? error : error?.message;
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className={labelClassName}>
        {label}
        {props.required && <span className={`text-danger ${direction === 'rtl' ? 'mr-1' : 'ml-1'}`}>*</span>}
      </label>
      <textarea id={id} name={id} className={`${textareaClassName} ${errorMessage ? 'border-danger focus:ring-danger/50 focus:border-danger' : ''}`} {...props} />
      {description && <p className="mt-1.5 text-xs text-textOnLight/70 flex items-center"><InformationCircleIcon className={`w-3.5 h-3.5 text-subtleBlue ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`}/>{description}</p>}
      {errorMessage && <p className="mt-1.5 text-xs text-danger">{errorMessage}</p>}
    </div>
  );
};


interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  id: string;
  options: Array<{ value: string; label: string }>;
  error?: string | { message?: string };
  containerClassName?: string;
  labelClassName?: string;
  selectClassName?: string;
  description?: string;
  placeholder?: string;
}

export const SelectField: React.FC<SelectProps> = ({
  label,
  id,
  options,
  error,
  containerClassName = 'mb-5',
  labelClassName = 'block text-sm font-medium text-textDarker mb-1.5',
  selectClassName = 'mt-1 block w-full px-4 py-2.5 border border-secondary bg-primary rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent sm:text-sm disabled:bg-gray-100 text-textOnLight transition-colors',
  description,
  ...props
}) => {
  const { direction } = useTranslation();
  const errorMessage = typeof error === 'string' ? error : error?.message;
  return (
    <div className={containerClassName}>
      <label htmlFor={id} className={labelClassName}>
        {label}
        {props.required && <span className={`text-danger ${direction === 'rtl' ? 'mr-1' : 'ml-1'}`}>*</span>}
      </label>
      <select id={id} name={id} className={`${selectClassName} ${errorMessage ? 'border-danger focus:ring-danger/50 focus:border-danger' : ''}`} {...props}>
        {props.placeholder && <option value="">{props.placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
      {description && <p className="mt-1.5 text-xs text-textOnLight/70 flex items-center"><InformationCircleIcon className={`w-3.5 h-3.5 text-subtleBlue ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`}/>{description}</p>}
      {errorMessage && <p className="mt-1.5 text-xs text-danger">{errorMessage}</p>}
    </div>
  );
};

export const uploadFileToFirebase = async (
  file: File, 
  path: string,
  onProgress?: (progress: number) => void
): Promise<string> => {
  const storageRef = fireStorage.ref(storage, path);
  const uploadTask = fireStorage.uploadBytesResumable(storageRef, file);

  return new Promise((resolve, reject) => {
    uploadTask.on('state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        if (onProgress) onProgress(progress);
      },
      (error) => {
        console.error("Firebase upload error:", error);
        reject(error);
      },
      async () => {
        try {
          const downloadURL = await fireStorage.getDownloadURL(uploadTask.snapshot.ref);
          resolve(downloadURL);
        } catch (error) {
          console.error("Firebase getDownloadURL error:", error);
          reject(error);
        }
      }
    );
  });
};

export const deleteFileFromFirebase = async (fileUrl: string): Promise<void> => {
  if (!fileUrl.startsWith('https://firebasestorage.googleapis.com')) {
    console.warn("Not a Firebase Storage URL, skipping delete:", fileUrl);
    return;
  }
  try {
    const fileRef = fireStorage.ref(storage, fileUrl);
    await fireStorage.deleteObject(fileRef);
    console.log("File deleted successfully from Firebase Storage:", fileUrl);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn("File not found for deletion, it might have been already deleted:", fileUrl, error);
    } else {
      console.error("Error deleting file from Firebase Storage:", fileUrl, error);
      throw error;
    }
  }
};


interface FileUploadProps {
  label: string;
  id: string;
  currentFileUrl?: string | null; 
  onFileChange: (file: File | null) => void;
  accept?: string; 
  maxSizeMB?: number;
  description?: string;
  error?: string | { message?: string };
  required?: boolean;
  containerClassName?: string;
}

export const FileUploadField: React.FC<FileUploadProps> = ({
  label,
  id,
  currentFileUrl,
  onFileChange,
  accept = "image/*",
  maxSizeMB = 5,
  description,
  error: propError,
  required,
  containerClassName = 'mb-5',
}) => {
  const { t, direction } = useTranslation();
  const [fileName, setFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentFileUrl || null);
  const [internalError, setInternalError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    setPreviewUrl(currentFileUrl || null);
    if (!currentFileUrl) {
        setFileName(null);
    } else if (currentFileUrl && (!fileName || !currentFileUrl.includes(fileName))) {
        try {
            const urlObj = new URL(currentFileUrl);
            const pathSegments = urlObj.pathname.split('/');
            const encodedName = pathSegments.pop()?.split('?')[0]; // Get name before query params
             if (encodedName) setFileName(decodeURIComponent(encodedName));
             else setFileName(t('currentFileLabel', {default: 'Current file'}));
        } catch (e) {
            setFileName(t('currentFileLabel', {default: 'Current file'}));
        }
    }
  }, [currentFileUrl, t]); // Removed fileName from deps to avoid loop


  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInternalError(null);
    const file = event.target.files?.[0];

    if (file) {
      if (file.size > maxSizeMB * 1024 * 1024) {
        setInternalError(t('fileTooLargeError', { size: maxSizeMB, default: `File is too large. Max size: ${maxSizeMB}MB.`}));
        setFileName(null);
        onFileChange(null);
        if (fileInputRef.current) fileInputRef.current.value = ""; 
        return;
      }
      
      setFileName(file.name);
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onloadend = () => setPreviewUrl(reader.result as string);
        reader.readAsDataURL(file);
      } else {
         setPreviewUrl(null);
      }
      onFileChange(file);
    } else {
      // No file selected or selection cancelled: revert to original state
      setFileName(currentFileUrl ? (t('currentFileLabel', {default: 'Current file'})) : null);
      setPreviewUrl(currentFileUrl || null);
      onFileChange(null);
    }
  };
  
  const handleRemoveFile = () => {
    setInternalError(null);
    setFileName(null);
    setPreviewUrl(null);
    onFileChange(null); // Signal to parent that file is removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const isImage = accept.includes("image");
  const displayError = (typeof propError === 'string' ? propError : propError?.message) || internalError;

  return (
    <div className={containerClassName}>
      <label htmlFor={id} className="block text-sm font-medium text-textDarker mb-1.5">
        {label}
        {required && <span className={`text-danger ${direction === 'rtl' ? 'mr-1' : 'ml-1'}`}>*</span>}
      </label>
      <div className="mt-1 flex flex-col space-y-3">
        <div className="flex items-center space-x-3">
            {isImage && previewUrl && (
              <img src={previewUrl} alt={t('filePreviewAlt', {default: 'Preview'})} className="h-20 w-20 rounded-lg object-cover shadow-sm border border-secondary" />
            )}
            {!isImage && previewUrl && ( // For non-image files, show name (already handled by fileName state)
                 <a href={previewUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-accent hover:underline truncate max-w-xs">
                    {fileName || t('viewCurrentFile', {default: 'View Current File'})}
                </a>
            )}
             <input
                id={id}
                name={id}
                type="file"
                accept={accept}
                onChange={handleFileChange}
                ref={fileInputRef}
                className="sr-only" 
             />
            <label
                htmlFor={id}
                className="cursor-pointer bg-primary py-2 px-4 border border-secondary rounded-lg shadow-sm text-sm font-medium text-textDarker hover:bg-secondary/50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent transition-colors flex items-center"
            >
                <ArrowUpOnSquareIcon className={`w-4 h-4 ${direction === 'rtl' ? 'ml-2' : 'mr-2'} text-accent`} />
                <span>{fileName && !previewUrl?.startsWith('blob:') ? t('replaceFileButton', {default: 'Replace file'}) : t('uploadFileButton', {default: 'Upload file'})}</span>
            </label>
            {(previewUrl || fileName) && (
                 <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="text-danger hover:text-red-700 p-1 rounded-md hover:bg-red-100/50 transition-colors"
                    aria-label={t('removeFileButton', {default: "Remove file"})}
                >
                    <XCircleIcon className="w-5 h-5" />
                </button>
            )}
        </div>
        {fileName && previewUrl?.startsWith('blob:') && <p className="text-xs text-textOnLight/80 truncate max-w-xs">{t('selectedFileLabel', {default: 'Selected:'})} {fileName}</p>}
      </div>
      
      {description && <p className="mt-1.5 text-xs text-textOnLight/70 flex items-center"><InformationCircleIcon className={`w-3.5 h-3.5 text-subtleBlue ${direction === 'rtl' ? 'ml-1' : 'mr-1'}`}/>{description}</p>}
      {displayError && <p className="mt-1.5 text-xs text-danger">{displayError}</p>}
    </div>
  );
};


interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  id: string;
  description?: string;
  error?: string | { message?: string }; 
  containerClassName?: string;
}

export const CheckboxField: React.FC<CheckboxProps> = ({
  label,
  id,
  description,
  error,
  containerClassName = 'mb-4', // Default margin, can be overridden
  className = 'h-4 w-4 text-accent border-secondary rounded focus:ring-accent focus:ring-offset-primary', // Adjusted for primary bg
  ...props
}) => {
  const { direction } = useTranslation();
  const errorMessage = typeof error === 'string' ? error : error?.message;
  return (
    <div className={containerClassName}>
      <div className="flex items-start">
        <div className="flex items-center h-5">
          <input
            id={id}
            name={id}
            type="checkbox"
            className={className}
            {...props}
          />
        </div>
        <div className={`${direction === 'rtl' ? 'mr-3' : 'ml-3'} text-sm`}>
          <label htmlFor={id} className="font-medium text-textDarker cursor-pointer">
            {label}
          </label>
          {description && <p className="text-textOnLight/70 text-xs">{description}</p>}
        </div>
      </div>
      {errorMessage && <p className="mt-1 text-xs text-danger">{errorMessage}</p>}
    </div>
  );
};
