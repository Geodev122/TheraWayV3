import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Outlet, Route, Routes, useOutletContext } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from '../../hooks/useTranslation';
import { usePageTitle } from '../../hooks/usePageTitle';
import { UserRole, Therapist, Clinic, UserInquiry, ActivityLog, User, PracticeLocation, Certification, ClinicSpaceListing, MembershipStatus } from '../../types';
import { DashboardLayout } from '../../components/dashboard/shared/DashboardLayout';
import { Button } from '../../components/common/Button';
import { InputField, TextareaField, deleteFileFromFirebase } from '../../components/dashboard/shared/FormElements';
import { Modal } from '../../components/common/Modal';
import { 
    UsersIcon, BuildingOfficeIcon, ChatBubbleLeftRightIcon, DocumentTextIcon, 
    CheckCircleIcon, XCircleIcon, ExclamationTriangleIcon, EyeIcon, PencilIcon, ArrowDownTrayIcon,
    CogIcon, TrashIcon
} from '../../components/icons';
import { db } from '../../firebase';
import { collection, doc, getDocs, updateDoc, setDoc, query, orderBy, serverTimestamp, Timestamp, writeBatch, where } from 'firebase/firestore';


interface OutletContextType {
  therapistsList: Therapist[];
  clinicsList: Clinic[];
  userInquiriesList: UserInquiry[];
  activityLogsList: ActivityLog[];
  handleTherapistStatusChange: (therapistId: string, status: Therapist['accountStatus'], notes?: string) => Promise<void>;
  handleClinicStatusChange: (clinicId: string, status: Clinic['accountStatus'], notes?: string) => Promise<void>;
  handleInquiryStatusChange: (inquiryId: string, status: UserInquiry['status'], adminReply?: string) => Promise<void>;
  addActivityLogEntry: (logEntry: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => Promise<void>;
  fetchData: () => Promise<void>;
  isLoading: boolean;
}

interface AddNoteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (note: string) => void;
    currentNote?: string;
    targetName: string;
}
const AddNoteModal: React.FC<AddNoteModalProps> = ({ isOpen, onClose, onSave, currentNote, targetName }) => {
    const { t } = useTranslation();
    const [note, setNote] = useState(currentNote || '');
    useEffect(() => { if(isOpen) setNote(currentNote || ''); }, [isOpen, currentNote]);

    const handleSubmit = () => {
        onSave(note);
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('addAdminNoteModalTitle', { targetName })} size="lg">
            <TextareaField
                label={t('adminNoteLabel')}
                id="adminNote"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={4}
                placeholder={t('adminNotePlaceholder')}
            />
            <div className="mt-4 flex justify-end space-x-2">
                <Button variant="light" onClick={onClose}>{t('cancelButtonLabel')}</Button>
                <Button variant="primary" onClick={handleSubmit}>{t('saveNoteButtonLabel')}</Button>
            </div>
        </Modal>
    );
};

interface ViewMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    inquiry: UserInquiry | null;
}
const ViewMessageModal: React.FC<ViewMessageModalProps> = ({ isOpen, onClose, inquiry }) => {
    const { t } = useTranslation();
    if (!inquiry) return null;
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('viewInquiryModalTitle', { subject: inquiry.subject })} size="lg">
            <p className="text-sm text-gray-500 mb-1"><strong>{t('fromLabel')}:</strong> {inquiry.userName || 'N/A'} ({inquiry.userEmail})</p>
            <p className="text-sm text-gray-500 mb-3"><strong>{t('dateLabel')}:</strong> {new Date(inquiry.date).toLocaleString()}</p>
            <div className="bg-gray-50 p-3 rounded whitespace-pre-wrap text-sm">{inquiry.message}</div>
            {inquiry.adminReply && (
                 <div className="mt-4 pt-3 border-t">
                    <h4 className="font-semibold text-sm mb-1">{t('adminReplyLabel')}:</h4>
                    <p className="bg-blue-50 p-3 rounded whitespace-pre-wrap text-sm">{inquiry.adminReply}</p>
                 </div>
            )}
        </Modal>
    );
};

interface RespondToInquiryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSendReply: (reply: string) => void;
    inquirySubject: string;
}
const RespondToInquiryModal: React.FC<RespondToInquiryModalProps> = ({ isOpen, onClose, onSendReply, inquirySubject }) => {
    const { t } = useTranslation();
    const [reply, setReply] = useState('');
    useEffect(() => { if(isOpen) setReply(''); }, [isOpen]);

    const handleSubmit = () => {
        onSendReply(reply);
        onClose();
    };
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={t('respondToInquiryModalTitle', { subject: inquirySubject })} size="lg">
            <TextareaField
                label={t('yourReplyLabel')}
                id="adminReply"
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                rows={5}
                placeholder={t('typeYourReplyPlaceholder')}
            />
            <div className="mt-4 flex justify-end space-x-2">
                <Button variant="light" onClick={onClose}>{t('cancelButtonLabel')}</Button>
                <Button variant="primary" onClick={handleSubmit}>{t('sendReplyButtonLabel')}</Button>
            </div>
        </Modal>
    );
};


const AdminTherapistsValidationTabContent: React.FC = () => {
    usePageTitle('dashboardTherapistsValidationTab');
    const { t, direction } = useTranslation();
    const { therapistsList, handleTherapistStatusChange, isLoading, addActivityLogEntry } = useOutletContext<OutletContextType>();
    const [searchTerm, setSearchTerm] = useState('');
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState<{id: string; name: string; currentNotes?: string} | null>(null);

    const filteredTherapists = useMemo(() => 
        therapistsList.filter(therapist => 
            therapist.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (therapist.email && therapist.email.toLowerCase().includes(searchTerm.toLowerCase()))
        ).sort((a,b) => (a.name || "").localeCompare(b.name || ""))
    , [therapistsList, searchTerm]);

    const stats = useMemo(() => ({
        total: therapistsList.length,
        live: therapistsList.filter(t => t.accountStatus === 'live').length,
        pending: therapistsList.filter(t => t.accountStatus === 'pending_approval').length,
        rejected: therapistsList.filter(t => t.accountStatus === 'rejected').length,
        draft: therapistsList.filter(t => t.accountStatus === 'draft').length,
    }), [therapistsList]);

    const openAddNoteModal = (therapist: Therapist) => {
        setSelectedTarget({ id: therapist.id, name: therapist.name, currentNotes: therapist.adminNotes });
        setNoteModalOpen(true);
    };
    const handleSaveNote = async (note: string) => {
        if(selectedTarget) {
            const therapist = therapistsList.find(t => t.id === selectedTarget.id);
            if (therapist) await handleTherapistStatusChange(selectedTarget.id, therapist.accountStatus, note);
        }
    };
    
    const handleAction = async (therapistId: string, newStatus: Therapist['accountStatus']) => {
        const therapist = therapistsList.find(t => t.id === therapistId);
        if (therapist) {
            if (newStatus === 'rejected' && !therapist.adminNotes) {
                openAddNoteModal(therapist); 
            } else {
                await handleTherapistStatusChange(therapistId, newStatus, therapist.adminNotes);
            }
        }
    };

    const handleExportData = () => {
        console.log("Exporting therapist data:", filteredTherapists);
        addActivityLogEntry({ action: "Exported Therapist Data", targetType: 'therapist', details: { count: filteredTherapists.length, filters: searchTerm }});
        alert(t('exportDataSuccessMessage'));
    };

    const getStatusPill = (status: Therapist['accountStatus']) => {
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
    
    return (
        <div className="space-y-6 bg-primary p-4 sm:p-6 rounded-lg shadow-md text-textOnLight">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 pb-4 border-b border-secondary/70">
                <h3 className="text-xl font-semibold text-accent flex items-center">
                    <UsersIcon className={`w-6 h-6 ${direction === 'rtl' ? 'ml-2' : 'mr-2'}`}/>
                    {t('validateTherapistProfiles')}
                </h3>
                <div className="flex items-center gap-2">
                    <InputField
                        id="therapistSearch"
                        placeholder={t('searchTherapistsPlaceholder')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        containerClassName="!mb-0"
                    />
                    <Button variant="light" size="sm" onClick={handleExportData} leftIcon={<ArrowDownTrayIcon />} >{t('exportButtonLabel')}</Button>
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-gray-50/50 rounded-lg"><p className="text-2xl font-bold text-accent">{stats.total}</p><p className="text-xs text-gray-500">{t('totalTherapistsLabel')}</p></div>
                <div className="p-3 bg-gray-50/50 rounded-lg"><p className="text-2xl font-bold text-yellow-500">{stats.pending}</p><p className="text-xs text-gray-500">{t('pendingApprovalLabel')}</p></div>
                <div className="p-3 bg-gray-50/50 rounded-lg"><p className="text-2xl font-bold text-green-500">{stats.live}</p><p className="text-xs text-gray-500">{t('liveProfilesLabel')}</p></div>
                <div className="p-3 bg-gray-50/50 rounded-lg"><p className="text-2xl font-bold text-red-500">{stats.rejected}</p><p className="text-xs text-gray-500">{t('rejectedProfilesLabel')}</p></div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('therapistNameLabel')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('statusLabel')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('certificationsLabel')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actionsLabel')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-primary divide-y divide-secondary">
                        {isLoading && filteredTherapists.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-4">{t('loading')}</td></tr>
                        ) : filteredTherapists.length === 0 ? (
                            <tr><td colSpan={4} className="text-center py-4">{t('noResultsFound')}</td></tr>
                        ) : filteredTherapists.map((therapist) => (
                            <tr key={therapist.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="text-sm font-medium text-textOnLight">{therapist.name}</p>
                                    <p className="text-xs text-gray-500">{therapist.email}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusPill(therapist.accountStatus)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                    {(therapist.certifications || []).filter(c => !c.isVerified).length > 0
                                        ? <span className="text-yellow-600">{t('pendingCertCount', { count: (therapist.certifications || []).filter(c => !c.isVerified).length})}</span>
                                        : <span className="text-green-600">{t('allCertsVerified')}</span>}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {therapist.accountStatus === 'pending_approval' && (
                                        <>
                                            <Button size="sm" variant="primary" onClick={() => handleAction(therapist.id, 'live')} leftIcon={<CheckCircleIcon className="w-4 h-4" />}>{t('approveButtonLabel')}</Button>
                                            <Button size="sm" variant="danger" onClick={() => handleAction(therapist.id, 'rejected')} leftIcon={<XCircleIcon className="w-4 h-4" />}>{t('rejectButtonLabel')}</Button>
                                        </>
                                    )}
                                    {therapist.accountStatus === 'rejected' && (
                                        <Button size="sm" variant="secondary" onClick={() => handleAction(therapist.id, 'pending_approval')} leftIcon={<PencilIcon className="w-4 h-4" />}>{t('revalidateButtonLabel')}</Button>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => openAddNoteModal(therapist)} leftIcon={<PencilIcon className="w-4 h-4" />} title={t('addEditNoteButtonLabel')}></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            
            {noteModalOpen && selectedTarget && (
                <AddNoteModal
                    isOpen={noteModalOpen}
                    onClose={() => setNoteModalOpen(false)}
                    onSave={handleSaveNote}
                    currentNote={selectedTarget.currentNotes}
                    targetName={selectedTarget.name}
                />
            )}
        </div>
    );
};


const AdminClinicApprovalTabContent: React.FC = () => {
    usePageTitle('dashboardClinicApprovalTab');
    const { t, direction } = useTranslation();
    const { clinicsList, handleClinicStatusChange, isLoading, addActivityLogEntry } = useOutletContext<OutletContextType>();
    const [searchTerm, setSearchTerm] = useState('');
    const [noteModalOpen, setNoteModalOpen] = useState(false);
    const [selectedTarget, setSelectedTarget] = useState<{id: string; name: string; currentNotes?: string} | null>(null);

    const filteredClinics = useMemo(() =>
        clinicsList.filter(clinic =>
            clinic.name.toLowerCase().includes(searchTerm.toLowerCase())
        ).sort((a, b) => a.name.localeCompare(b.name)),
    [clinicsList, searchTerm]);

    const stats = useMemo(() => ({
        total: clinicsList.length,
        live: clinicsList.filter(c => c.accountStatus === 'live').length,
        pending: clinicsList.filter(c => c.accountStatus === 'pending_approval').length,
        rejected: clinicsList.filter(c => c.accountStatus === 'rejected').length,
        draft: clinicsList.filter(c => c.accountStatus === 'draft').length,
    }), [clinicsList]);

    const openAddNoteModal = (clinic: Clinic) => {
        setSelectedTarget({ id: clinic.id, name: clinic.name, currentNotes: clinic.adminNotes });
        setNoteModalOpen(true);
    };

    const handleSaveNote = async (note: string) => {
        if (selectedTarget) {
            const clinic = clinicsList.find(c => c.id === selectedTarget.id);
            if (clinic) await handleClinicStatusChange(selectedTarget.id, clinic.accountStatus, note);
        }
    };
    
    const handleAction = async (clinicId: string, newStatus: Clinic['accountStatus']) => {
        const clinic = clinicsList.find(c => c.id === clinicId);
        if (clinic) {
            if (newStatus === 'rejected' && !clinic.adminNotes) {
                openAddNoteModal(clinic);
            } else {
                await handleClinicStatusChange(clinicId, newStatus, clinic.adminNotes);
            }
        }
    };

    const getStatusPill = (status: Clinic['accountStatus']) => {
        let colorClasses = 'bg-gray-100 text-gray-800';
        let textKey = `clinicAccountStatus${status.charAt(0).toUpperCase() + status.slice(1).replace('_', '')}`;
        switch (status) {
            case 'live': colorClasses = 'bg-green-100 text-green-700'; break;
            case 'pending_approval': colorClasses = 'bg-yellow-100 text-yellow-700'; break;
            case 'rejected': colorClasses = 'bg-red-100 text-red-700'; break;
            case 'draft': colorClasses = 'bg-blue-100 text-blue-700'; break;
        }
        return <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${colorClasses}`}>{t(textKey, {default: status})}</span>;
    };

    return (
        <div className="space-y-6 bg-primary p-4 sm:p-6 rounded-lg shadow-md text-textOnLight">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4 pb-4 border-b border-secondary/70">
                <h3 className="text-xl font-semibold text-accent flex items-center">
                    <BuildingOfficeIcon className={`w-6 h-6 ${direction === 'rtl' ? 'ml-2' : 'mr-2'}`}/>
                    {t('validateClinicProfiles')}
                </h3>
                <InputField
                    id="clinicSearch"
                    placeholder={t('searchClinicsPlaceholder')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    containerClassName="!mb-0"
                />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-gray-50/50 rounded-lg"><p className="text-2xl font-bold text-accent">{stats.total}</p><p className="text-xs text-gray-500">{t('totalClinicsLabel')}</p></div>
                <div className="p-3 bg-gray-50/50 rounded-lg"><p className="text-2xl font-bold text-yellow-500">{stats.pending}</p><p className="text-xs text-gray-500">{t('pendingApprovalLabel')}</p></div>
                <div className="p-3 bg-gray-50/50 rounded-lg"><p className="text-2xl font-bold text-green-500">{stats.live}</p><p className="text-xs text-gray-500">{t('activeClinicsLabel')}</p></div>
                <div className="p-3 bg-gray-50/50 rounded-lg"><p className="text-2xl font-bold text-red-500">{stats.rejected}</p><p className="text-xs text-gray-500">{t('rejectedProfilesLabel')}</p></div>
            </div>

            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-secondary">
                    <thead className="bg-gray-50/50">
                        <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('clinicNameLabel')}</th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('statusLabel')}</th>
                            <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actionsLabel')}</th>
                        </tr>
                    </thead>
                    <tbody className="bg-primary divide-y divide-secondary">
                        {isLoading && filteredClinics.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-4">{t('loading')}</td></tr>
                        ) : filteredClinics.length === 0 ? (
                            <tr><td colSpan={3} className="text-center py-4">{t('noClinicsFound')}</td></tr>
                        ) : filteredClinics.map((clinic) => (
                            <tr key={clinic.id}>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <p className="text-sm font-medium text-textOnLight">{clinic.name}</p>
                                    <p className="text-xs text-gray-500">{t('ownerIdLabel')}: {clinic.ownerId}</p>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">{getStatusPill(clinic.accountStatus)}</td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    {clinic.accountStatus === 'pending_approval' && (
                                        <>
                                            <Button size="sm" variant="primary" onClick={() => handleAction(clinic.id, 'live')} leftIcon={<CheckCircleIcon className="w-4 h-4" />}>{t('approveButtonLabel')}</Button>
                                            <Button size="sm" variant="danger" onClick={() => handleAction(clinic.id, 'rejected')} leftIcon={<XCircleIcon className="w-4 h-4" />}>{t('rejectButtonLabel')}</Button>
                                        </>
                                    )}
                                    <Button size="sm" variant="ghost" onClick={() => openAddNoteModal(clinic)} leftIcon={<PencilIcon className="w-4 h-4" />} title={t('addEditNoteButtonLabel')}></Button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
             {noteModalOpen && selectedTarget && (
                <AddNoteModal
                    isOpen={noteModalOpen}
                    onClose={() => setNoteModalOpen(false)}
                    onSave={handleSaveNote}
                    currentNote={selectedTarget.currentNotes}
                    targetName={selectedTarget.name}
                />
            )}
        </div>
    );
};

const AdminCommunicationTabContent: React.FC = () => {
    usePageTitle('dashboardCommunicationTab');
    const { t } = useTranslation();
    const { userInquiriesList, handleInquiryStatusChange, isLoading } = useOutletContext<OutletContextType>();
    const [viewMessageModalOpen, setViewMessageModalOpen] = useState(false);
    const [respondModalOpen, setRespondModalOpen] = useState(false);
    const [selectedInquiry, setSelectedInquiry] = useState<UserInquiry | null>(null);

    const openViewModal = (inquiry: UserInquiry) => {
        setSelectedInquiry(inquiry);
        setViewMessageModalOpen(true);
    };
    const openRespondModal = (inquiry: UserInquiry) => {
        setSelectedInquiry(inquiry);
        setRespondModalOpen(true);
    };
    const handleSendReply = (reply: string) => {
        if(selectedInquiry) {
            handleInquiryStatusChange(selectedInquiry.id, 'closed', reply);
        }
    };
    
    return (
        <div className="space-y-6 bg-primary p-4 sm:p-6 rounded-lg shadow-md text-textOnLight">
            <h3 className="text-xl font-semibold text-accent flex items-center">
                <ChatBubbleLeftRightIcon className="w-6 h-6 mr-2"/>
                {t('manageUserInquiries')}
            </h3>
            {isLoading && userInquiriesList.length === 0 ? <p>{t('loading')}</p> :
                userInquiriesList.length > 0 ? (
                    <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('fromLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('subjectLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('statusLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actionsLabel')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-primary divide-y divide-gray-200">
                        {userInquiriesList.map((inquiry) => (
                            <tr key={inquiry.id}>
                                <td className="px-6 py-4 ">{inquiry.userName}</td>
                                <td className="px-6 py-4 ">{inquiry.subject}</td>
                                <td className="px-6 py-4 ">{inquiry.status}</td>
                                <td className="px-6 py-4 text-right space-x-2">
                                    <Button size="sm" variant="light" onClick={() => openViewModal(inquiry)}>{t('viewMessageButtonLabel')}</Button>
                                    {inquiry.status === 'open' && (
                                        <Button size="sm" variant="primary" onClick={() => openRespondModal(inquiry)}>{t('respondButtonLabel')}</Button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                ) : <p>{t('noUserInquiriesFound')}</p>
            }
            {selectedInquiry && (
                <>
                    <ViewMessageModal isOpen={viewMessageModalOpen} onClose={() => setViewMessageModalOpen(false)} inquiry={selectedInquiry}/>
                    <RespondToInquiryModal isOpen={respondModalOpen} onClose={() => setRespondModalOpen(false)} onSendReply={handleSendReply} inquirySubject={selectedInquiry.subject}/>
                </>
            )}
        </div>
    );
};

const AdminActivityLogTabContent: React.FC = () => {
    usePageTitle('dashboardActivityLogTab');
    const { t } = useTranslation();
    const { activityLogsList, isLoading } = useOutletContext<OutletContextType>();
    
    return (
        <div className="space-y-6 bg-primary p-4 sm:p-6 rounded-lg shadow-md text-textOnLight">
            <h3 className="text-xl font-semibold text-accent flex items-center">
                <DocumentTextIcon className="w-6 h-6 mr-2"/>
                {t('systemActivityLog')}
            </h3>
            {isLoading && activityLogsList.length === 0 ? <p>{t('loading')}</p> :
                activityLogsList.length > 0 ? (
                    <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50/50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('timestampLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('userOrSystemLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('actionLabel')}</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('detailsLabel')}</th>
                            </tr>
                        </thead>
                        <tbody className="bg-primary divide-y divide-gray-200">
                        {activityLogsList.map((log) => (
                            <tr key={log.id}>
                                <td className="px-6 py-4 whitespace-nowrap">{new Date(log.timestamp).toLocaleString()}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{log.userName || log.userId}</td>
                                <td className="px-6 py-4 whitespace-nowrap">{log.action}</td>
                                <td className="px-6 py-4 ">{typeof log.details === 'string' ? log.details : JSON.stringify(log.details)}</td>
                            </tr>
                        ))}
                        </tbody>
                    </table>
                    </div>
                ) : <p>{t('noActivityLogsFound')}</p>
            }
        </div>
    );
};

const AdminDashboardPageShell: React.FC = () => {
    const { user } = useAuth();
    const [therapistsList, setTherapistsList] = useState<Therapist[]>([]);
    const [clinicsList, setClinicsList] = useState<Clinic[]>([]);
    const [userInquiriesList, setUserInquiriesList] = useState<UserInquiry[]>([]);
    const [activityLogsList, setActivityLogsList] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            const therapistsSnapshot = await getDocs(collection(db, 'therapistsData'));
            setTherapistsList(therapistsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Therapist)));

            const clinicsSnapshot = await getDocs(collection(db, 'clinicsData'));
            setClinicsList(clinicsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Clinic)));

            const inquiriesSnapshot = await getDocs(query(collection(db, 'userInquiries'), orderBy('date', 'desc')));
            setUserInquiriesList(inquiriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserInquiry)));

            const activityLogsSnapshot = await getDocs(query(collection(db, 'activityLog'), orderBy('timestamp', 'desc')));
            setActivityLogsList(activityLogsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ActivityLog)));
        } catch (error) {
            console.error("Error fetching admin data:", error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const addActivityLogEntry = useCallback(async (logEntry: Omit<ActivityLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => {
        if (!user) return;
        const newLog: ActivityLog = {
            id: `log-${Date.now()}`,
            timestamp: Timestamp.now().toDate().toISOString(),
            userId: user.id,
            userName: user.name,
            userRole: user.roles.includes(UserRole.ADMIN) ? UserRole.ADMIN : user.roles[0],
            ...logEntry,
        };
        try {
            await setDoc(doc(db, 'activityLog', newLog.id), newLog);
            setActivityLogsList(prev => [newLog, ...prev]);
        } catch (error) {
            console.error("Error adding activity log:", error);
        }
    }, [user]);

    const handleTherapistStatusChange = async (therapistId: string, status: Therapist['accountStatus'], notes?: string) => {
        setIsLoading(true);
        try {
            const therapistDocRef = doc(db, 'therapistsData', therapistId);
            const updates: Partial<Therapist> = { accountStatus: status };
            if (notes !== undefined) updates.adminNotes = notes;
            
            if (status === 'live') {
                const renewalDate = new Date();
                renewalDate.setFullYear(renewalDate.getFullYear() + 1);
                updates.membershipRenewalDate = renewalDate.toISOString();
            }

            await updateDoc(therapistDocRef, { ...updates, updatedAt: serverTimestamp() });
            setTherapistsList(prev => prev.map(t => t.id === therapistId ? { ...t, ...updates } : t));
            await addActivityLogEntry({
                action: 'Therapist Status Change',
                targetId: therapistId,
                targetType: 'therapist',
                details: { newStatus: status, notes: notes || 'N/A' },
            });
        } catch (error) {
            console.error("Error changing therapist status:", error);
        }
        setIsLoading(false);
    };

    const handleClinicStatusChange = async (clinicId: string, status: Clinic['accountStatus'], notes?: string) => {
        setIsLoading(true);
        try {
            const clinicDocRef = doc(db, 'clinicsData', clinicId);
            const updates: Partial<Clinic> = { accountStatus: status };
            if (notes !== undefined) updates.adminNotes = notes;
            
            await updateDoc(clinicDocRef, { ...updates, updatedAt: serverTimestamp() });
            setClinicsList(prev => prev.map(c => c.id === clinicId ? { ...c, ...updates } : c));
             await addActivityLogEntry({ action: 'Clinic Status Change', targetId: clinicId, targetType: 'clinic', details: { newStatus: status, notes: notes || 'N/A' }});
        } catch (error) {
            console.error("Error changing clinic status:", error);
        }
        setIsLoading(false);
    };

    const handleInquiryStatusChange = async (inquiryId: string, status: UserInquiry['status'], adminReply?: string) => {
        setIsLoading(true);
        try {
            const inquiryDocRef = doc(db, 'userInquiries', inquiryId);
            const updates: Partial<UserInquiry> = { status };
            if (adminReply) updates.adminReply = adminReply;

            await updateDoc(inquiryDocRef, { ...updates });
            setUserInquiriesList(prev => prev.map(i => i.id === inquiryId ? { ...i, ...updates } : i));
            await addActivityLogEntry({ action: 'Inquiry Status Change', targetId: inquiryId, targetType: 'user_inquiry', details: { newStatus: status }});
        } catch (error) {
            console.error("Error changing inquiry status:", error);
        }
        setIsLoading(false);
    };

    const outletContextValue: OutletContextType = {
        therapistsList,
        clinicsList,
        userInquiriesList,
        activityLogsList,
        handleTherapistStatusChange,
        handleClinicStatusChange,
        handleInquiryStatusChange,
        addActivityLogEntry,
        fetchData,
        isLoading,
    };

    return (
        <DashboardLayout role={UserRole.ADMIN}>
            <Outlet context={outletContextValue} />
        </DashboardLayout>
    );
};

export const AdminDashboardRoutes = () => (
    <Routes>
        <Route element={<AdminDashboardPageShell />}>
            <Route index element={<AdminTherapistsValidationTabContent />} />
            <Route path="clinic-approval" element={<AdminClinicApprovalTabContent />} />
            <Route path="communication" element={<AdminCommunicationTabContent />} />
            <Route path="activity-log" element={<AdminActivityLogTabContent />} />
        </Route>
    </Routes>
);