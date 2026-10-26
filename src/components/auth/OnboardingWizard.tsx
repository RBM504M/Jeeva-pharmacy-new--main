import React, { useState, useContext } from 'react';
import { Store, User, ShieldCheck, Lock, Check, AlertCircle, ArrowRight, Building, Key } from 'lucide-react';
import { OnboardingPayload } from '../../types/pharmacy';
import { PharmacyContext } from '../../context/PharmacyContext';

interface OnboardingWizardProps {
  onComplete?: (payload: OnboardingPayload) => Promise<{ success: boolean; error?: string }>;
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete: propOnComplete }) => {
  const context = useContext(PharmacyContext);
  const onComplete = propOnComplete || context?.setupOnboarding || (async () => ({ success: false, error: 'Context not initialized' }));

  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Step 1: Pharmacy Store Profile
  const [pharmacyName, setPharmacyName] = useState('');
  const [dlNumber, setDlNumber] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [pincode, setPincode] = useState('');

  // Step 2: Primary Administrator User
  const [adminFullName, setAdminFullName] = useState('');
  const [adminUsername, setAdminUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminPhone, setAdminPhone] = useState('');
  const [adminEmail, setAdminEmail] = useState('');

  const validateStep1 = () => {
    if (!pharmacyName.trim()) {
      setErrorMessage('Please enter the Pharmacy / Medicals Store Name.');
      return false;
    }
    if (!dlNumber.trim()) {
      setErrorMessage('Drug License Number (Form 20/21) is mandatory for retail pharmacy operations.');
      return false;
    }
    if (!gstin.trim()) {
      setErrorMessage('GST Identification Number (GSTIN) is mandatory for tax compliance.');
      return false;
    }
    setErrorMessage(null);
    return true;
  };

  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmitOnboarding = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!adminFullName.trim() || !adminUsername.trim()) {
      setErrorMessage('Administrator full name and username are required.');
      return;
    }
    if (password.length < 8) {
      setErrorMessage('Password must be at least 8 characters long for security.');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    setLoading(true);
    try {
      const payload: OnboardingPayload = {
        pharmacy: {
          name: pharmacyName.trim(),
          dlNumber: dlNumber.trim(),
          gstin: gstin.trim().toUpperCase(),
          address: address.trim(),
          phone: phone.trim(),
          email: email.trim(),
          state: state.trim(),
          pincode: pincode.trim(),
        },
        adminUser: {
          fullName: adminFullName.trim(),
          username: adminUsername.trim(),
          password,
          phone: adminPhone.trim() || phone.trim(),
          email: adminEmail.trim() || email.trim(),
        },
      };

      const result = await onComplete(payload);
      if (!result.success) {
        setErrorMessage(result.error || 'Failed to complete pharmacy initialization.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred during onboarding setup.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100/10">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 p-6 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black tracking-tight">Pharmacy Account Setup</h1>
                <p className="text-emerald-100 text-xs mt-0.5">Welcome to Jeeva Pharmacy POS • Initial Terminal Configuration</p>
              </div>
            </div>
            <div className="text-right">
              <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-bold tracking-wide">
                Step {step} of 2
              </span>
            </div>
          </div>

          {/* Stepper progress */}
          <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-semibold">
            <div
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${
                step === 1 ? 'bg-white text-emerald-900 font-bold shadow' : 'bg-white/10 text-white'
              }`}
            >
              <Building className="w-4 h-4 shrink-0" />
              <span>1. Pharmacy Details</span>
            </div>
            <div
              className={`p-2 rounded-lg flex items-center gap-2 transition-all ${
                step === 2 ? 'bg-white text-emerald-900 font-bold shadow' : 'bg-white/10 text-white'
              }`}
            >
              <Key className="w-4 h-4 shrink-0" />
              <span>2. Owner / Admin Login</span>
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="p-7">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {step === 1 ? (
            <form onSubmit={handleNextStep} className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-800">Pharmacy & Regulatory Profile</h2>
                <p className="text-xs text-slate-500">
                  Enter your pharmacy's legal and licensing details as registered under the Drugs & Cosmetics Act.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pharmacy / Medicals Store Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={pharmacyName}
                  onChange={(e) => setPharmacyName(e.target.value)}
                  placeholder="e.g. Jeeva Medicals & Pharmacy"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Drug License No. (Form 20/21) *
                  </label>
                  <input
                    type="text"
                    required
                    value={dlNumber}
                    onChange={(e) => setDlNumber(e.target.value)}
                    placeholder="e.g. DL-TN-2024-8849"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    GSTIN Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                    placeholder="e.g. 33AAAAA0000A1Z5"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98401 23456"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Store Email Address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="pharmacy@example.in"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Store Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street, Area, City"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    value={state}
                    onChange={(e) => setState(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value)}
                    placeholder="600001"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <span>Continue to Admin Account Setup</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSubmitOnboarding} className="space-y-4">
              <div className="border-b border-slate-100 pb-2">
                <h2 className="text-sm font-bold text-slate-800">Primary Administrator / Pharmacist Account</h2>
                <p className="text-xs text-slate-500">
                  Create your master login. No default or hardcoded credentials are created.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Admin Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={adminFullName}
                    onChange={(e) => setAdminFullName(e.target.value)}
                    placeholder="e.g. Dr. K. Ramesh, B.Pharm"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Admin Username / Login ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={adminUsername}
                    onChange={(e) => setAdminUsername(e.target.value)}
                    placeholder="e.g. admin"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Master Password (min. 8 chars) *
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter strong password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Confirm Master Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                  />
                </div>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-200/80 rounded-xl text-xs text-emerald-900 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span className="font-bold">Cryptographic Security Guarantee:</span> Your password is encrypted
                  locally with 100,000 rounds of PBKDF2 with SHA-512 and random per-user salt. Plaintext passwords are
                  never stored or logged.
                </div>
              </div>

              <div className="flex items-center gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setErrorMessage(null);
                  }}
                  className="py-3 px-4 border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-xl transition-all cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Complete Setup & Open POS</span>
                      <Check className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
