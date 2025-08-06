
export enum UserRole {
  CLIENT = 'CLIENT',
  THERAPIST = 'THERAPIST',
  CLINIC_OWNER = 'CLINIC_OWNER',
  ADMIN = 'ADMIN',
}

export interface User {
  id: string;
  email: string;
  roles: UserRole[]; 
  name?: string;
  profilePictureUrl?: string | null;
  isDemoAccount?: boolean; 
  customClaims?: { [key: string]: any; }; // For Firebase Custom Claims
}

export interface PracticeLocation {
  address: string;
  lat?: number; 
  lng?: number; 
  isPrimary?: boolean;
}

export interface Certification {
  id: string;
  name: string;
  fileUrl: string; 
  uploadedAt: string; 
  isVerified: boolean;
  verificationNotes?: string;
  country?: string; 
}

export interface Therapist {
  id: string; 
  email?: string; 
  name: string;
  profilePictureUrl: string; 
  introVideoUrl?: string; 
  specializations: string[];
  otherSpecializations?: string[]; // Added for "Other" category
  languages: string[];
  otherLanguages?: string[]; // Added for "Other" category
  qualifications: string[];
  bio: string;
  locations: PracticeLocation[];
  whatsappNumber: string;
  isFavorite?: boolean; 
  profileViews?: number; 
  likes?: number; 
  certifications?: Certification[];
  isVerified?: boolean; 
  availability?: string[]; 
  
  accountStatus: 'draft' | 'pending_approval' | 'live' | 'rejected';
  adminNotes?: string; 
  membershipApplication?: { 
    date: string; 
    paymentReceiptUrl?: string; 
    statusMessage?: string; 
  };
  membershipRenewalDate?: string; 
  isDemoAccount?: boolean; 
}

export interface ClinicService { 
    id: string;
    name: string;
    price: number;
    durationMinutes?: number;
}

export interface ClinicSpaceListing {
  id: string;
  name: string;
  photos: string[];
  description: string;
  rentalPrice: number;
  rentalDuration: string; 
  rentalTerms: string; 
  features: string[]; 
  clinicId?: string; 
  clinicName?: string; 
  clinicAddress?: string;
  isDemoAccount?: boolean;
}

export interface ClinicBooking {
  id: string;
  clinicId: string;
  spaceId?: string;
  spaceName?: string;
  therapistId: string;
  therapistName: string;
  therapistWhatsapp: string;
  startTime: string;
  endTime: string;
  status: 'pending' | 'accepted' | 'declined' | 'completed';
}

export interface MembershipStatus {
  status: 'active' | 'pending_payment' | 'pending_approval' | 'expired' | 'cancelled' | 'none';
  tierName?: string; 
  renewalDate?: string; 
  applicationDate?: string; 
  paymentReceiptUrl?: string; 
}

export interface MembershipHistoryItem {
  id: string;
  date: string; 
  action: string; 
  details?: string; 
}

export interface Clinic {
  id: string; 
  ownerId: string; 
  name: string;
  profilePictureUrl?: string; 
  photos?: string[]; 
  amenities: string[]; 
  operatingHours: Record<string, string>; 
  services?: ClinicService[]; 
  address: string;
  lat?: number;
  lng?: number;
  whatsappNumber: string; 
  description: string; 
  isVerified?: boolean; 
  
  theraWayMembership?: MembershipStatus; 
  
  accountStatus: 'draft' | 'pending_approval' | 'live' | 'rejected';
  adminNotes?: string; 
  isDemoAccount?: boolean; 
}


// The Review interface is no longer needed and has been removed.

// For Admin Dashboard
export interface SystemHealthMetric {
    name: string;
    value: string;
    status: 'good' | 'warning' | 'error';
}

export interface ActivityLog {
    id: string;
    timestamp: string; 
    userId?: string; 
    userName?: string; 
    userRole?: UserRole; // A user can have multiple roles, but the primary role for the action can be logged
    details?: Record<string, unknown> | string; // Replaced 'any' with 'unknown' for better type safety
    action: string; 
    targetId?: string; 
    targetType?: 'therapist' | 'clinic' | 'user_inquiry' | 'system' | 'user'; 
}

export interface UserManagementInfo extends User { 
    lastLogin?: string;
    isActive: boolean;
}

export interface UserInquiry {
  id: string;
  userId?: string; 
  userEmail: string; 
  userName?: string; 
  subject: string;
  message: string;
  date: string; 
  status: 'open' | 'closed' | 'pending_admin_response' | 'escalated';
  adminReply?: string;
  priority?: 'low' | 'medium' | 'high';
  category?: 'general' | 'technical_support' | 'billing' | 'feedback';
}