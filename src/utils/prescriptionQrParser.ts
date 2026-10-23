/**
 * Digital Pharmacy Prescription QR Code Parser
 * Compliant with Indian ABDM (Ayushman Bharat Digital Mission), e-Sanjeevani,
 * and hospital digital e-prescription QR formats.
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
      // not valid JSON
    }
  }

  // Check URL or URI schema e.g. rx:// or abdm:// or query string
  if (
    str.startsWith('rx://') ||
    str.startsWith('abdm://') ||
    str.startsWith('nhm://') ||
    str.includes('eprescription?') ||
    str.startsWith('RX|') ||
    str.startsWith('ABDM-RX|')
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
 * Parses raw scanned QR string into structured ParsedDigitalPrescription
 */
export function parsePrescriptionQr(payload: string): ParsedDigitalPrescription | null {
  if (!payload) return null;
  const str = payload.trim();

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
        name: m.name || m.medicineName || m.drugName || 'Prescribed Medicine',
        barcode: m.barcode || m.ean || m.hsn || undefined,
        dosage: m.dosage || m.frequency || m.sig || '1-0-1 as directed',
        quantity: Number(m.quantity || m.qty || 1),
        unitType: String(m.unit || m.unitType || 'STRIP').toUpperCase() === 'TABLET' ? 'TABLET' : 'STRIP',
        notes: m.notes || m.duration || undefined,
      }));

      return {
        rxId: data.prescriptionId || data.rxId || `RX-${Date.now().toString().slice(-6)}`,
        issueDate: data.date || data.issueDate || new Date().toISOString().split('T')[0],
        patientName: patient.name || data.patientName || 'Digital OPD Patient',
        patientContact: String(patient.phone || patient.contact || data.patientContact || '9840000000'),
        patientAge: patient.age ? Number(patient.age) : undefined,
        patientGender: patient.gender ? (String(patient.gender).toUpperCase() as any) : undefined,
        doctorName: doctor.name || data.doctorName || 'Dr. Registered Physician, MD',
        doctorRegNumber: doctor.regNo || doctor.registrationNumber || data.doctorRegNumber || 'TNMC-REG-2024',
        clinicName: doctor.clinicName || doctor.hospital || data.clinicName || 'Digital Telemedicine Clinic',
        diagnosis: data.diagnosis || data.chiefComplaint || 'Clinical Consultation',
        notes: data.notes || data.instructions || 'Dispense as per doctor instructions',
        dpdpConsentAccepted: true, // Digital QR carries signed digital patient consent
        medicines,
        rawPayload: str,
      };
    } catch (e) {
      console.warn('Failed parsing JSON prescription QR:', e);
    }
  }

  // 2. Try URI Query Schema e.g. rx://eprescription?patient=Sundaram&dr=Dr.+Radhakrishnan
  if (str.includes('?') && (str.startsWith('rx://') || str.startsWith('http') || str.startsWith('abdm://'))) {
    try {
      const queryString = str.split('?')[1];
      const params = new URLSearchParams(queryString);

      const medsParam = params.get('meds') || params.get('medicines') || '';
      const medicines: PrescribedMedicine[] = [];

      if (medsParam) {
        // format: "Dolo 650:2,Pantocid 40:1" or "8901117001234:2"
        medsParam.split(',').forEach((part) => {
          const [medNameOrBarcode, qtyStr] = part.split(':');
          if (medNameOrBarcode) {
            medicines.push({
              name: medNameOrBarcode.trim(),
              barcode: /^\d{8,14}$/.test(medNameOrBarcode.trim()) ? medNameOrBarcode.trim() : undefined,
              quantity: Number(qtyStr) || 1,
              unitType: 'STRIP',
              dosage: 'As prescribed',
            });
          }
        });
      }

      return {
        rxId: params.get('rxId') || `RX-${Date.now().toString().slice(-6)}`,
        issueDate: params.get('date') || new Date().toISOString().split('T')[0],
        patientName: params.get('patient') || params.get('patientName') || 'Digital OPD Patient',
        patientContact: params.get('phone') || params.get('contact') || '9840112345',
        patientAge: params.get('age') ? Number(params.get('age')) : undefined,
        doctorName: params.get('doctor') || params.get('dr') || 'Dr. Medical Officer',
        doctorRegNumber: params.get('reg') || params.get('regNo') || 'MCI-STATE-REG',
        clinicName: params.get('clinic') || 'Ayushman Bharat Digital Health Centre',
        diagnosis: params.get('diagnosis') || 'OPD Medical Consultation',
        notes: params.get('notes') || 'Digital E-Prescription verified',
        dpdpConsentAccepted: true,
        medicines,
        rawPayload: str,
      };
    } catch (e) {
      console.warn('Failed parsing URI prescription QR:', e);
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
        if (mName) {
          medicines.push({
            name: mName.trim(),
            quantity: Number(mQty) || 1,
            unitType: 'STRIP',
            dosage: 'As directed',
          });
        }
      });
    }

    return {
      rxId: map['rxid'] || `RX-${Date.now().toString().slice(-6)}`,
      issueDate: map['date'] || new Date().toISOString().split('T')[0],
      patientName: map['patient'] || 'OPD Patient',
      patientContact: map['phone'] || '9840012345',
      doctorName: map['doctor'] || map['dr'] || 'Dr. Attending Physician',
      doctorRegNumber: map['reg'] || 'MCI-00123',
      diagnosis: map['diag'] || 'Clinical Consultation',
      dpdpConsentAccepted: true,
      medicines,
      rawPayload: str,
    };
  }

  return null;
}

/**
 * Pre-fabricated Sample Digital Prescriptions for Pharmacist Testing & Quick Scan Simulation
 */
export const SAMPLE_PRESCRIPTION_QRS = [
  {
    label: 'ABDM Hospital E-Prescription (Dolo 650 + Pantoprazole 40mg)',
    doctor: 'Dr. S. Radhakrishnan, MD (TNMC-48192)',
    patient: 'R. Sundaram (Age 52)',
    payload: JSON.stringify(
      {
        rxType: 'DIGITAL_PRESCRIPTION',
        source: 'ABDM_NDHM',
        prescriptionId: 'ABDM-RX-2026-9812',
        date: new Date().toISOString().split('T')[0],
        patient: {
          name: 'R. Sundaram',
          phone: '9840199887',
          age: 52,
          gender: 'MALE',
          dpdpConsent: true,
        },
        doctor: {
          name: 'Dr. S. Radhakrishnan, MD',
          regNo: 'TN-MCI-48192',
          clinicName: 'City Health Care & Diabetes Centre, Chennai',
        },
        medicines: [
          {
            name: 'Paracetamol Tablets IP 650mg',
            barcode: '8901117001234',
            dosage: '1 tablet TID after meals (5 days)',
            quantity: 2,
            unit: 'STRIP',
          },
          {
            name: 'Pantoprazole Gastro-Resistant Tablets IP 40mg',
            barcode: '8903456789012',
            dosage: '1 tablet OD 30 mins before breakfast',
            quantity: 1,
            unit: 'STRIP',
          },
        ],
        diagnosis: 'Acute Viral Pyrexia & Stress Gastritis',
        notes: 'Advised plenty of warm fluids and rest. Review after 5 days.',
      },
      null,
      2
    ),
  },
  {
    label: 'Clinic E-Prescription (Amoxicillin 625mg + Cetirizine 10mg)',
    doctor: 'Dr. Ananya Roy, MBBS, DNB (TNMC-78214)',
    patient: 'Meenakshi Ramanathan (Age 34)',
    payload: JSON.stringify(
      {
        rxType: 'DIGITAL_PRESCRIPTION',
        source: 'e-Sanjeevani_OPD',
        prescriptionId: 'ESAN-2026-4402',
        date: new Date().toISOString().split('T')[0],
        patient: {
          name: 'Meenakshi Ramanathan',
          phone: '9444123456',
          age: 34,
          gender: 'FEMALE',
          dpdpConsent: true,
        },
        doctor: {
          name: 'Dr. Ananya Roy, MBBS, DNB',
          regNo: 'TN-78214',
          clinicName: 'Apollo Cradle & Family Clinic',
        },
        medicines: [
          {
            name: 'Amoxicillin & Potassium Clavulanate 625mg',
            barcode: '8901234567890',
            dosage: '1 tablet BD after food for 5 days',
            quantity: 1,
            unit: 'STRIP',
          },
          {
            name: 'Cetirizine 10mg',
            barcode: '8905678901234',
            dosage: '1 tablet at bedtime for 3 days',
            quantity: 1,
            unit: 'STRIP',
          },
        ],
        diagnosis: 'Bacterial Upper Respiratory Tract Infection (URTI)',
        notes: 'Schedule H antibiotic. Dispense only against verified registration.',
      },
      null,
      2
    ),
  },
  {
    label: 'Compact URI QR Code (Telmisartan 40mg + ORS Sachet)',
    doctor: 'Dr. K. Balaji, MS (TN-99231)',
    patient: 'P. Vijay Anand (Age 61)',
    payload:
      'rx://eprescription?rxId=RX-BAL-991&patient=P.+Vijay+Anand&phone=9791098765&age=61&dr=Dr.+K.+Balaji,+MS&reg=TN-99231&clinic=Balaji+Cardiac+Centre&meds=8906789012345:2,8907890123456:3&diagnosis=Essential+Hypertension+Maintenance',
  },
];
