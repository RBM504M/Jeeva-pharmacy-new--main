import React, { useState, useContext } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, Store, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { PharmacyAccount } from '../../types/pharmacy';
import { PharmacyContext } from '../../context/PharmacyContext';

interface SignInScreenProps {
  pharmacy?: PharmacyAccount | null;
  onLogin?: (credentials: { username: string; password: string; rememberMe: boolean }) => Promise<{ success: boolean; error?: string }>;
}

export const SignInScreen: React.FC<SignInScreenProps> = ({ pharmacy: propPharmacy, onLogin: propOnLogin }) => {
  const context = useContext(PharmacyContext);
  const pharmacy = propPharmacy !== undefined ? propPharmacy : (context?.pharmacyAccount || null);
  const onLogin = propOnLogin || context?.login || (async () => ({ success: false, error: 'Context not initialized' }));

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setErrorMessage('Please enter both your username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage(null);
    try {
      const result = await onLogin({
        username: username.trim(),
        password,
        rememberMe,
      });

      if (!result.success) {
        setErrorMessage(result.error || 'Authentication failed. Please verify credentials.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 flex flex-col justify-center items-center p-4 select-none">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100/10">
        {/* Header Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl mx-auto flex items-center justify-center mb-3 shadow-inner border border-white/20">
            <Store className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-black tracking-tight">{pharmacy?.name || 'Jeeva Pharmacy'}</h1>
          <p className="text-emerald-100 text-xs mt-1 font-medium">Retail Pharmacy Point of Sale & Inventory System</p>
          {pharmacy?.dlNumber && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-emerald-100">
              <span>DL: {pharmacy.dlNumber}</span>
              {pharmacy.gstin && <span>• GST: {pharmacy.gstin}</span>}
            </div>
          )}
        </div>

        {/* Form Body */}
        <div className="p-7">
          <div className="mb-6">
            <h2 className="text-lg font-bold text-slate-800">Staff Sign-In</h2>
            <p className="text-xs text-slate-500 mt-0.5">Enter your credentials to access the pharmacy billing terminal.</p>
          </div>

          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-800 text-xs animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="login-username" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Username / Operator ID
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="login-username"
                  type="text"
                  required
                  autoFocus
                  value={username}
                  onChange={(e) => {
                    setUsername(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="e.g. admin or pharmacist"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="Enter your secure password"
                  className="w-full pl-10 pr-11 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-600">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Remember me on this PC</span>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In to Terminal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Offline Security Footer Notice */}
          <div className="mt-6 pt-5 border-t border-slate-100 flex items-center gap-2.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Encrypted with modern salted PBKDF2 • Offline Local Terminal</span>
          </div>
        </div>
      </div>

      <div className="mt-4 text-center text-xs text-slate-400 font-medium">
        Jeeva Pharmacy POS • Indian Retail Pharmacy Standard • Drugs & Cosmetics Act Compliant
      </div>
    </div>
  );
};
