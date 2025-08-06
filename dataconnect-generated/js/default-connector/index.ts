import { initializeConnector, run, runWithArgs } from "@firebase/data-connect";
import type {
  User,
  Therapist,
  Clinic,
  ClinicSpaceListing,
  PracticeLocation,
  Certification,
  ClinicService,
  MembershipStatus,
  MembershipHistoryItem,
  SystemHealthMetric,
  ActivityLog,
  UserInquiry,
  FavoriteTherapist,
} from "../../../types";

const connector = initializeConnector();

export const listUsers = () => run(connector, "listUsers");
export const listTherapists = () => run(connector, "listTherapists");
export const listClinics = () => run(connector, "listClinics");
export const listClinicSpaceListings = () =>
  run(connector, "listClinicSpaceListings");

export const listPracticeLocations = () =>
  run(connector, "listPracticeLocations");
export const listCertifications = () =>
  run(connector, "listCertifications");
export const listClinicServices = () =>
  run(connector, "listClinicServices");
export const listMembershipStatus = () =>
  run(connector, "listMembershipStatus");
export const listMembershipHistory = () =>
  run(connector, "listMembershipHistory");
export const listSystemHealthMetrics = () =>
  run(connector, "listSystemHealthMetrics");
export const listActivityLogs = () => run(connector, "listActivityLogs");
export const listUserInquiries = () => run(connector, "listUserInquiries");
export const listFavoriteTherapists = () =>
  run(connector, "listFavoriteTherapists");

export const createUser = (user: User) =>
  runWithArgs(connector, "createUser", { user });
export const createTherapist = (therapist: Therapist) =>
  runWithArgs(connector, "createTherapist", { therapist });
export const createClinic = (clinic: Clinic) =>
  runWithArgs(connector, "createClinic", { clinic });
export const createClinicSpaceListing = (listing: ClinicSpaceListing) =>
  runWithArgs(connector, "createClinicSpaceListing", { listing });

export const createPracticeLocation = (location: PracticeLocation) =>
  runWithArgs(connector, "createPracticeLocation", { location });
export const createCertification = (certification: Certification) =>
  runWithArgs(connector, "createCertification", { certification });
export const createClinicService = (service: ClinicService) =>
  runWithArgs(connector, "createClinicService", { service });
export const createMembershipStatus = (status: MembershipStatus) =>
  runWithArgs(connector, "createMembershipStatus", { status });
export const createMembershipHistoryItem = (item: MembershipHistoryItem) =>
  runWithArgs(connector, "createMembershipHistoryItem", { item });
export const createSystemHealthMetric = (metric: SystemHealthMetric) =>
  runWithArgs(connector, "createSystemHealthMetric", { metric });
export const createActivityLog = (log: ActivityLog) =>
  runWithArgs(connector, "createActivityLog", { log });
export const createUserInquiry = (inquiry: UserInquiry) =>
  runWithArgs(connector, "createUserInquiry", { inquiry });
export const createFavoriteTherapist = (favorite: FavoriteTherapist) =>
  runWithArgs(connector, "createFavoriteTherapist", { favorite });

export const updateUser = (id: string, updates: Partial<User>) =>
  runWithArgs(connector, "updateUser", { id, updates });
export const updateTherapist = (id: string, updates: Partial<Therapist>) =>
  runWithArgs(connector, "updateTherapist", { id, updates });
export const updateClinic = (id: string, updates: Partial<Clinic>) =>
  runWithArgs(connector, "updateClinic", { id, updates });
export const updateClinicSpaceListing = (
  id: string,
  updates: Partial<ClinicSpaceListing>
) => runWithArgs(connector, "updateClinicSpaceListing", { id, updates });

export const updatePracticeLocation = (
  id: string,
  updates: Partial<PracticeLocation>
) => runWithArgs(connector, "updatePracticeLocation", { id, updates });
export const updateCertification = (
  id: string,
  updates: Partial<Certification>
) => runWithArgs(connector, "updateCertification", { id, updates });
export const updateClinicService = (
  id: string,
  updates: Partial<ClinicService>
) => runWithArgs(connector, "updateClinicService", { id, updates });
export const updateMembershipStatus = (
  id: string,
  updates: Partial<MembershipStatus>
) => runWithArgs(connector, "updateMembershipStatus", { id, updates });
export const updateMembershipHistoryItem = (
  id: string,
  updates: Partial<MembershipHistoryItem>
) =>
  runWithArgs(connector, "updateMembershipHistoryItem", { id, updates });
export const updateSystemHealthMetric = (
  id: string,
  updates: Partial<SystemHealthMetric>
) => runWithArgs(connector, "updateSystemHealthMetric", { id, updates });
export const updateActivityLog = (
  id: string,
  updates: Partial<ActivityLog>
) => runWithArgs(connector, "updateActivityLog", { id, updates });
export const updateUserInquiry = (
  id: string,
  updates: Partial<UserInquiry>
) => runWithArgs(connector, "updateUserInquiry", { id, updates });

export const deleteUser = (id: string) =>
  runWithArgs(connector, "deleteUser", { id });
export const deleteTherapist = (id: string) =>
  runWithArgs(connector, "deleteTherapist", { id });
export const deleteClinic = (id: string) =>
  runWithArgs(connector, "deleteClinic", { id });
export const deleteClinicSpaceListing = (id: string) =>
  runWithArgs(connector, "deleteClinicSpaceListing", { id });

export const deletePracticeLocation = (id: string) =>
  runWithArgs(connector, "deletePracticeLocation", { id });
export const deleteCertification = (id: string) =>
  runWithArgs(connector, "deleteCertification", { id });
export const deleteClinicService = (id: string) =>
  runWithArgs(connector, "deleteClinicService", { id });
export const deleteMembershipStatus = (id: string) =>
  runWithArgs(connector, "deleteMembershipStatus", { id });
export const deleteMembershipHistoryItem = (id: string) =>
  runWithArgs(connector, "deleteMembershipHistoryItem", { id });
export const deleteSystemHealthMetric = (id: string) =>
  runWithArgs(connector, "deleteSystemHealthMetric", { id });
export const deleteActivityLog = (id: string) =>
  runWithArgs(connector, "deleteActivityLog", { id });
export const deleteUserInquiry = (id: string) =>
  runWithArgs(connector, "deleteUserInquiry", { id });
export const deleteFavoriteTherapist = (id: string) =>
  runWithArgs(connector, "deleteFavoriteTherapist", { id });
