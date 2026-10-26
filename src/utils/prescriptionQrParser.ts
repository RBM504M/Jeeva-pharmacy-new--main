/**
 * Digital Pharmacy Prescription QR Code Parser
 * Validates external QR payloads while treating all unverified scanned payloads as untrusted.
 * No fabricated patient, doctor, or consent defaults are introduced.
 */

export interface PrescribedMedicine {
  name: string;
  drugName?: string;
  genericName?: string;
  barcode?: string;
  dosage?: string;
  quantity: number;
  unitType: 'STRIP' | 'TABLET';
  unit?: 'STRIP' | 'TABLET';
  notes?: string;
}

export interface ParsedDigitalPrescription {
  rxId: string;
  issueDate: string;
  patientName: string;
  patientContact: string;
  patientAge?: number;
  patientGender?: 'MALE' | 'FEMALE' | 'OTHER';
  doctorName: string;
  doctorRegNumber: string;
  clinicName?: string;
  diagnosis?: string;
  notes?: string;
  dpdpConsentAccepted: boolean;
  isVerified: boolean;
  untrustedPayload: boolean;
  verificationNotice: string;
  medicines: PrescribedMedicine[];
  rawPayload: string;
}

/**
 * Checks if a scanned hardware string is a Digital Prescription QR payload
 * rather than a standard 1D product barcode (EAN-13, UPC, Code-128).
 */
export function isPrescriptionQr(payload: string): boolean {
  if (!payload || typeof payload !== 'string') return false;
  const str = payload.trim();

  // If pure numeric and 8 to 14 digits, it's a standard product barcode (EAN/UPC)
  if (/^\d{8,14}$/.test(str)) {
    return false;
  }

  // Check JSON format
  if ((str.startsWith('{') && str.endsWith('}')) || (str.startsWith('[') && str.endsWith(']'))) {
    try {
      const obj = JSON.parse(str);
      if (
        obj.rxType ||
        obj.prescriptionId ||
        obj.rxId ||
        obj.patient ||
        obj.doctor ||
        obj.medicines ||
        obj.drugs ||
        obj.drName ||
        obj.patientName
      ) {
        return true;
      }
    } catch {
      return false;
    }
  }

  // Check URL or URI schema e.g. rx:// or abdm:// or query string
  if (
    str.startsWith('rx://') ||
    str.startsWith('abdm://') ||
    str.startsWith('nhm://') ||
    str.includes('eprescription?') ||
    str.startsWith('RX|') ||
    str.startsWith('ABDM-RX|') ||
    str.startsWith('ABDM|')
  ) {
    return true;
  }

  // Check if string contains multiple typical prescription keywords
  const lower = str.toLowerCase();
  const kwMatches = [
    'patient',
    'doctor',
    'regno',
    'prescription',
    'medicine',
    'dosage',
    'rx',
  ].filter((kw) => lower.includes(kw));

  return kwMatches.length >= 2;
}

/**
 * Parses raw scanned QR string into structured ParsedDigitalPrescription.
 * Does NOT fabricate patient names, doctor identities, or consent.
 * Always marks payloads as unverified external input.
 */
export function parsePrescriptionQr(payload: string): ParsedDigitalPrescription | null {
  if (!payload) return null;
  const str = payload.trim();

  const baseNotice =
    'Unverified external QR payload. Prescriber identity, registration number, prescription authenticity, and patient consent must be verified manually by the pharmacist.';

  // 1. Try parsing JSON format (ABDM Standard)
  if (str.startsWith('{') && str.endsWith('}')) {
    try {
      const data = JSON.parse(str);

      const patient = data.patient || {};
      const doctor = data.doctor || {};
      const rawMeds = Array.isArray(data.medicines)
        ? data.medicines
        : Array.isArray(data.drugs)
        ? data.drugs
        : [];

      const medicines: PrescribedMedicine[] = rawMeds.map((m: any) => ({
        name: String(m.name || m.medicineName || m.drugName || '').trim(),
        barcode: m.barcode || m.ean || m.hsn || undefined,
        dosage: m.dosage || m.frequency || m.sig || undefined,
        quantity: Math.max(1, Number(m.quantity || m.qty || 1)),
        unitType: String(m.unit || m.unitType || 'STRIP').toUpperCase() === 'TABLET' ? 'TABLET' : 'STRIP',
        notes: m.notes || m.duration || undefined,
      })).filter((m) => m.name.length > 0);

      const patientName = String(patient.name || data.patientName || '').trim();
      const patientContact = String(patient.phone || patient.contact || data.patientContact || '').trim();
      const doctorName = String(doctor.name || data.doctorName || '').trim();
      const doctorRegNumber = String(doctor.regNo || doctor.registrationNumber || data.doctorRegNumber || '').trim();

      return {
        rxId: String(data.prescriptionId || data.rxId || `RX-${Date.now().toString().slice(-6)}`),
        issueDate: String(data.date || data.issueDate || new Date().toISOString().split('T')[0]),
        patientName,
        patientContact,
        patientAge: patient.age ? Number(patient.age) : undefined,
        patientGender: patient.gender ? (String(patient.gender).toUpperCase() as any) : undefined,
        doctorName,
        doctorRegNumber,
        clinicName: String(doctor.clinicName || doctor.hospital || data.clinicName || '').trim() || undefined,
        diagnosis: String(data.diagnosis || data.chiefComplaint || '').trim() || undefined,
        notes: String(data.notes || data.instructions || '').trim() || undefined,
        dpdpConsentAccepted: false, // Unverified QR cannot silently establish patient consent
        isVerified: false,
        untrustedPayload: true,
        verificationNotice: baseNotice,
        medicines,
        rawPayload: str,
      };
    } catch (e) {
      console.warn('Failed parsing JSON prescription QR:', e);
      return null;
    }
  }

  // 2. Try URI Query Schema e.g. rx://eprescription?patient=...&dr=...
  if (str.includes('?') && (str.startsWith('rx://') || str.startsWith('http') || str.startsWith('abdm://'))) {
    try {
      const queryString = str.split('?')[1];
      const params = new URLSearchParams(queryString);

      const medsParam = params.get('meds') || params.get('medicines') || '';
      const medicines: PrescribedMedicine[] = [];

      if (medsParam) {
        medsParam.split(',').forEach((part) => {
          const [medNameOrBarcode, qtyStr] = part.split(':');
          if (medNameOrBarcode && medNameOrBarcode.trim()) {
            medicines.push({
              name: medNameOrBarcode.trim(),
              barcode: /^\d{8,14}$/.test(medNameOrBarcode.trim()) ? medNameOrBarcode.trim() : undefined,
              quantity: Math.max(1, Number(qtyStr) || 1),
              unitType: 'STRIP',
              dosage: undefined,
            });
          }
        });
      }

      return {
        rxId: params.get('rxId') || `RX-${Date.now().toString().slice(-6)}`,
        issueDate: params.get('date') || new Date().toISOString().split('T')[0],
        patientName: (params.get('patient') || params.get('patientName') || '').trim(),
        patientContact: (params.get('phone') || params.get('contact') || '').trim(),
        patientAge: params.get('age') ? Number(params.get('age')) : undefined,
        doctorName: (params.get('doctor') || params.get('dr') || '').trim(),
        doctorRegNumber: (params.get('reg') || params.get('regNo') || '').trim(),
        clinicName: (params.get('clinic') || '').trim() || undefined,
        diagnosis: (params.get('diagnosis') || '').trim() || undefined,
        notes: (params.get('notes') || '').trim() || undefined,
        dpdpConsentAccepted: false,
        isVerified: false,
        untrustedPayload: true,
        verificationNotice: baseNotice,
        medicines,
        rawPayload: str,
      };
    } catch (e) {
      console.warn('Failed parsing URI prescription QR:', e);
      return null;
    }
  }

  // 3. Delimited text format: RX|Patient:...|Doctor:...
  if (str.startsWith('RX|') || str.startsWith('ABDM|')) {
    const parts = str.split('|');
    const map: Record<string, string> = {};
    parts.forEach((p) => {
      const idx = p.indexOf(':');
      if (idx > -1) {
        const k = p.substring(0, idx).trim().toLowerCase();
        const v = p.substring(idx + 1).trim();
        map[k] = v;
      }
    });

    const medicines: PrescribedMedicine[] = [];
    if (map['meds']) {
      map['meds'].split(';').forEach((m) => {
        const [mName, mQty] = m.split(':');
        if (mName && mName.trim()) {
          medicines.push({
            name: mName.trim(),
            quantity: Math.max(1, Number(mQty) || 1),
            unitType: 'STRIP',
            dosage: undefined,
          });
        }
      });
    }

    return {
      rxId: map['rxid'] || `RX-${Date.now().toString().slice(-6)}`,
      issueDate: map['date'] || new Date().toISOString().split('T')[0],
      patientName: (map['patient'] || '').trim(),
      patientContact: (map['phone'] || '').trim(),
      doctorName: (map['doctor'] || map['dr'] || '').trim(),
      doctorRegNumber: (map['reg'] || '').trim(),
      diagnosis: (map['diag'] || '').trim() || undefined,
      notes: (map['notes'] || '').trim() || undefined,
      dpdpConsentAccepted: false,
      isVerified: false,
      untrustedPayload: true,
      verificationNotice: baseNotice,
      medicines,
      rawPayload: str,
    };
  }

  return null;
}

/**
 * Empty sample prescription list (sample data purged for customer installations)
 */
export const SAMPLE_PRESCRIPTION_QRS: Array<{ label: string; doctor: string; patient: string; payload: string }> = [];
