import {
  MasterDoctor,
  MasterCustomer,
  MasterSalesRep,
  MasterRack,
  MasterManufacturer,
  MasterScheduleType,
  WantedBookItem,
  InwardPurchaseInvoice,
  SalesReturnRecord,
} from '../types/shopaid';

// Statutory Drug Schedule Regulations (Drugs & Cosmetics Rules, 1945)
export const STATUTORY_SCHEDULE_TYPES: MasterScheduleType[] = [
  {
    code: 'OTC',
    name: 'Over The Counter (General Sales List)',
    description: 'Safe for dispensing without registered medical practitioner prescription.',
    storageRequirement: 'Room temperature below 30°C in dry place',
    statutoryWarning: 'Keep out of reach of children.',
    requiresDoctorPrescription: false,
    requiresPrescriptionRegister: false,
    retentionYears: 1,
  },
  {
    code: 'SCHEDULE_H',
    name: 'Schedule H Prescription Drug',
    description: 'Statutory prescription required under Drugs & Cosmetics Rules, 1945.',
    storageRequirement: 'Prescription bay, protected from direct sunlight',
    statutoryWarning: 'SCHEDULE H PRESCRIPTION DRUG - CAUTION: To be sold by retail on the prescription of a Registered Medical Practitioner only.',
    requiresDoctorPrescription: true,
    requiresPrescriptionRegister: true,
    retentionYears: 2,
  },
  {
    code: 'SCHEDULE_H1',
    name: 'Schedule H1 Regulated Antibiotic / Habit Forming',
    description: 'Strict monitoring required under Rule 65(9) with patient address and prescriber records.',
    storageRequirement: 'Separate locked storage box / dedicated bay',
    statutoryWarning: 'SCHEDULE H1 PRESCRIPTION DRUG - CAUTION: It is dangerous to take this preparation except in accordance with medical advice. Not to be sold by retail without the prescription of a Registered Medical Practitioner.',
    requiresDoctorPrescription: true,
    requiresPrescriptionRegister: true,
    retentionYears: 2,
  },
  {
    code: 'SCHEDULE_X',
    name: 'Schedule X Psychotropic / Narcotic',
    description: 'Dual copy prescription required, one copy retained by chemist for 2 years.',
    storageRequirement: 'Mandatory double-lock iron safe under chief pharmacist control',
    statutoryWarning: 'SCHEDULE X PRESCRIPTION DRUG - WARNING: To be sold by retail on the prescription of a Registered Medical Practitioner only in duplicate.',
    requiresDoctorPrescription: true,
    requiresPrescriptionRegister: true,
    retentionYears: 3,
  },
  {
    code: 'SCHEDULE_G',
    name: 'Schedule G Hormonal & Antihistaminic',
    description: 'Medicines requiring medical supervision.',
    storageRequirement: 'Standard dispensary shelf',
    statutoryWarning: 'SCHEDULE G PRESCRIPTION DRUG - CAUTION: It is dangerous to take this preparation except under medical supervision.',
    requiresDoctorPrescription: true,
    requiresPrescriptionRegister: false,
    retentionYears: 2,
  },
];

export const SEED_SCHEDULE_TYPES = STATUTORY_SCHEDULE_TYPES;

// All seeded and sample data purged. Clean state on installation.
export const SEED_DOCTORS: MasterDoctor[] = [];
export const SEED_CUSTOMERS: MasterCustomer[] = [];
export const SEED_SALES_REPS: MasterSalesRep[] = [];
export const SEED_RACKS: MasterRack[] = [];
export const SEED_MANUFACTURERS: MasterManufacturer[] = [];
export const SEED_WANTED_BOOK: WantedBookItem[] = [];
export const SEED_PURCHASE_INVOICES: InwardPurchaseInvoice[] = [];
export const SEED_SALES_RETURNS: SalesReturnRecord[] = [];
