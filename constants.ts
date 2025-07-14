
import { UserRole } from './types';

// Firebase configuration will be handled in firebase.ts
// API_BASE_URL is removed as all backend calls will now use the Firebase SDK.
// API_KEY related code and process.env polyfill for it are removed.

export const AVAILABILITY_OPTIONS = ['Weekdays', 'Weekends', 'Evenings', 'Mornings', 'Immediate'];
export const THERAPIST_MEMBERSHIP_FEE = 4; // USD per month
export const CLINIC_MEMBERSHIP_FEE = 8; // USD per month
export const STANDARD_MEMBERSHIP_TIER_NAME = "Standard Membership";

export const APP_NAME = "TheraWay";
export const DEFAULT_USER_ROLE = UserRole.CLIENT; 
export const VIDEO_MAX_DURATION_SECONDS = 30;
export const VIDEO_MAX_SIZE_MB = 10;
export const CERTIFICATION_MAX_SIZE_MB = 5;
export const PROFILE_PICTURE_MAX_SIZE_MB = 2;
export const CLINIC_PHOTO_MAX_SIZE_MB = 5;
export const CLINIC_SPACE_PHOTO_MAX_SIZE_MB = 3; 
export const PAYMENT_RECEIPT_MAX_SIZE_MB = 2;

export const SPECIALIZATIONS_LIST = [
  'Cognitive Behavioral Therapy (CBT)', 'Anxiety Counseling', 'Depression Management',
  'Trauma-Informed Care', 'PTSD Recovery', 'Grief Counseling', 'Family Therapy',
  'Relationship Counseling', 'Child Psychology', 'Mindfulness-Based Stress Reduction (MBSR)',
  'Existential Therapy', 'Cultural Sensitivity', 'Addiction Counseling',
  'Motivational Interviewing', 'Relapse Prevention', 'Eating Disorder Treatment',
  'Obsessive-Compulsive Disorder (OCD)', 'Borderline Personality Disorder (BPD)',
  'Art Therapy', 'Play Therapy', 'Dialectical Behavior Therapy (DBT)',
  'Other' // Added "Other" option
];

export const LANGUAGES_LIST = ['English', 'Spanish', 'French', 'German', 'Arabic', 'Mandarin', 'Japanese', 'Hindi', 'Portuguese', 'Russian', 'Other']; // Added "Other" option

export const CLINIC_SPACE_FEATURES_LIST = [
    "Wi-Fi", "Whiteboard", "Projector", "Soundproof", "Air Conditioning", "Heating",
    "Comfortable Seating", "Waiting Area Access", "Kitchenette Access", "Restroom Access",
    "Natural Light", "Dimmable Lighting", "Secure Entry", "Wheelchair Accessible",
    "Tea/Coffee Making Facilities", "Reception Services", "Cleaning Services"
];