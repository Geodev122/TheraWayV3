import { initializeConnector, run, runWithArgs } from "firebase-dataconnect";
import type {
  User,
  Therapist,
  Clinic,
  ClinicSpaceListing,
} from "../../../types";

const connector = initializeConnector();

export const listUsers = () => run(connector, "listUsers");
export const listTherapists = () => run(connector, "listTherapists");
export const listClinics = () => run(connector, "listClinics");
export const listClinicSpaceListings = () =>
  run(connector, "listClinicSpaceListings");

export const createUser = (user: User) =>
  runWithArgs(connector, "createUser", { user });
export const createTherapist = (therapist: Therapist) =>
  runWithArgs(connector, "createTherapist", { therapist });
export const createClinic = (clinic: Clinic) =>
  runWithArgs(connector, "createClinic", { clinic });
export const createClinicSpaceListing = (listing: ClinicSpaceListing) =>
  runWithArgs(connector, "createClinicSpaceListing", { listing });

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

export const deleteUser = (id: string) =>
  runWithArgs(connector, "deleteUser", { id });
export const deleteTherapist = (id: string) =>
  runWithArgs(connector, "deleteTherapist", { id });
export const deleteClinic = (id: string) =>
  runWithArgs(connector, "deleteClinic", { id });
export const deleteClinicSpaceListing = (id: string) =>
  runWithArgs(connector, "deleteClinicSpaceListing", { id });
