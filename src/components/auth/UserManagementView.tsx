import React, { useState, useEffect } from 'react';
import {
  Users,
  UserPlus,
  Shield,
  KeyRound,
  UserX,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  Lock,
  Search,
  HardDrive,
  Info,
  Clock,
  Phone,
  Mail,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import { UserRecord, UserRole } from '../../types/pharmacy';

export const UserManagementView: React.FC = () => {
  const {
    currentUser,
    pharmacyAccount,
    getUsers,
    createUser,
    deactivateUser,
    activateUser,
    resetUserPassword,
  } = usePharmacy();

  const [usersList, setUsersList] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [targetUser, setTargetUser] = useState<UserRecord | null>(null);

  // Add user form state
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('PHARMACIST');
  const [newPassword, setNewPassword] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');

  // Reset password state
  const [resetPasswordVal, setResetPasswordVal] = useState('');
  const [confirmResetPasswordVal, setConfirmResetPasswordVal] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    try {
      const list = await getUsers();
      setUsersList(list);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to load user accounts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!newFullName.trim() || !newUsername.trim() || !newPassword) {
      setErrorMessage('Full name, username, and password are required.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMessage('Password must be at least 8 characters long.');
      return;
    }

    try {
      const res = await createUser({
        fullName: newFullName.trim(),
        username: newUsername.trim(),
        role: newRole,
        password: newPassword,
        phone: newPhone.trim(),
        email: newEmail.trim(),
      });

      if (res.success) {
        showToast(`Staff account created for ${newFullName} (${newRole})`);
        setShowAddModal(false);
        setNewFullName('');
        setNewUsername('');
        setNewPassword('');
        setNewPhone('');
        setNewEmail('');
        loadUsers();
      } else {
        setErrorMessage(res.error || 'Failed to create user account.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'An error occurred while creating user.');
    }
  };

  const handleDeactivate = async (u: UserRecord) => {
    if (!window.confirm(`Are you sure you want to deactivate the user account "${u.username}" (${u.fullName})?`)) {
      return;
    }
    setErrorMessage(null);
    try {
      const res = await deactivateUser(u.id);
      if (res.success) {
        showToast(`Account "${u.username}" has been deactivated.`);
        loadUsers();
      } else {
        setErrorMessage(res.error || 'Failed to deactivate user.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error deactivating user account.');
    }
  };

  const handleActivate = async (u: UserRecord) => {
    setErrorMessage(null);
    try {
      const res = await activateUser(u.id);
      if (res.success) {
        showToast(`Account "${u.username}" has been reactivated.`);
        loadUsers();
      } else {
        setErrorMessage(res.error || 'Failed to activate user.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error activating user account.');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!targetUser) return;
    if (resetPasswordVal.length < 8) {
      setErrorMessage('New password must be at least 8 characters long.');
      return;
    }
    if (resetPasswordVal !== confirmResetPasswordVal) {
      setErrorMessage('Password and Confirm Password do not match.');
      return;
    }

    try {
      const res = await resetUserPassword(targetUser.id, resetPasswordVal);
      if (res.success) {
        showToast(`Password successfully reset for "${targetUser.username}".`);
        setShowResetModal(false);
        setResetPasswordVal('');
        setConfirmResetPasswordVal('');
        setTargetUser(null);
      } else {
        setErrorMessage(res.error || 'Failed to reset password.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error resetting password.');
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      u.fullName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      (u.phone && u.phone.toLowerCase().includes(q))
    );
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 border border-slate-700 animate-fade-in text-sm font-medium">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Staff & User Management</h1>
            <p className="text-xs text-slate-500">
              Manage authorized operators, assign role-based access levels, and maintain pharmacy security.
            </p>
          </div>
        </div>

        {currentUser?.role === 'ADMIN' && (
          <button
            type="button"
            onClick={() => {
              setErrorMessage(null);
              setShowAddModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-600/20 cursor-pointer transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Add Staff User</span>
          </button>
        )}
      </div>

      {/* Architecture Notice Banner (Multi-PC Limitation) */}
      <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl flex items-start gap-3.5 text-xs text-amber-900 leading-relaxed shadow-sm">
        <HardDrive className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold block text-amber-950 mb-0.5">
            Architecture Notice: Standalone Workstation Storage
          </span>
          This installation of Jeeva Pharmacy operates on a local embedded SQLite database located in Electron's
          application data directory. User accounts, credentials, and pharmacy records created on this machine are local
          and <span className="font-semibold underline">do not automatically synchronize in real time across multiple PCs</span>.
          For multi-counter deployment, export encrypted backups or connect via local network shared storage.
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-xs">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Users Register Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, role or username..."
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div className="text-xs text-slate-500">
            Total Authorized Users: <span className="font-bold text-slate-800">{usersList.length}</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3 px-4">Operator Name</th>
                <th className="py-3 px-3">Username</th>
                <th className="py-3 px-3">Assigned Role</th>
                <th className="py-3 px-3">Contact</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Last Active</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    Loading staff accounts...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-slate-400">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.id === u.id;
                  const roleBadgeColor =
                    u.role === 'ADMIN'
                      ? 'bg-purple-50 text-purple-700 border-purple-200'
                      : u.role === 'PHARMACIST'
                      ? 'bg-sky-50 text-sky-700 border-sky-200'
                      : u.role === 'CASHIER'
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200';

                  return (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.fullName}</div>
                        {isCurrent && (
                          <span className="inline-block mt-0.5 text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-semibold">
                            (Current Active User)
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono font-medium text-slate-800">
                        @{u.username}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleBadgeColor}`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{u.role}</span>
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">
                        {u.phone || u.email || '—'}
                      </td>
                      <td className="py-3 px-3">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-[11px]">
                            <span className="w-2 h-2 rounded-full bg-rose-500" />
                            Deactivated
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-400 text-[11px]">
                        {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-GB') : 'Never'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {currentUser?.role === 'ADMIN' ? (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setTargetUser(u);
                                setErrorMessage(null);
                                setShowResetModal(true);
                              }}
                              title="Reset Password"
                              className="p-1.5 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg cursor-pointer transition-colors"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </button>

                            {u.isActive ? (
                              <button
                                type="button"
                                disabled={isCurrent}
                                onClick={() => handleDeactivate(u)}
                                title={isCurrent ? 'Cannot deactivate self' : 'Deactivate user'}
                                className={`p-1.5 rounded-lg transition-colors ${
                                  isCurrent
                                    ? 'opacity-30 cursor-not-allowed text-slate-400'
                                    : 'hover:bg-rose-50 text-rose-600 hover:text-rose-700 cursor-pointer'
                                }`}
                              >
                                <UserX className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleActivate(u)}
                                title="Reactivate user"
                                className="p-1.5 hover:bg-emerald-50 text-emerald-600 hover:text-emerald-700 rounded-lg cursor-pointer transition-colors"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Staff User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <UserPlus className="w-5 h-5 text-emerald-100" />
                <h3 className="font-bold text-sm">Add New Staff Operator</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-white/80 hover:text-white cursor-pointer text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newFullName}
                  onChange={(e) => setNewFullName(e.target.value)}
                  placeholder="e.g. S. Ramanathan, B.Pharm"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username / Login ID *
                </label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. ramanathan or cashier01"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div>
                <label htmlFor="user-role-select" className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Assigned Access Role *
                </label>
                <select
                  id="user-role-select"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                >
                  <option value="ADMIN">ADMIN — Full Administrative & Configuration Access</option>
                  <option value="PHARMACIST">PHARMACIST — POS Dispensing, Stock Inward & Schedule H1 Registers</option>
                  <option value="CASHIER">CASHIER — POS Billing & Receipts Checkout Only</option>
                  <option value="PHARMACY_ASSISTANT">PHARMACY_ASSISTANT — Basic Billing & Stock Lookups</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Temporary Password (min. 8 chars) *
                </label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Set initial staff password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Phone / Mobile
                  </label>
                  <input
                    type="text"
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+91 98400 00000"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="staff@jeeva.in"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer shadow shadow-emerald-600/20"
                >
                  Create Staff Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && targetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-purple-200" />
                <h3 className="font-bold text-sm">Reset Password</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowResetModal(false);
                  setTargetUser(null);
                }}
                className="text-white/80 hover:text-white cursor-pointer text-lg font-bold"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleResetPassword} className="p-5 space-y-3.5 text-xs">
              <div className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                <div className="font-bold text-slate-800">{targetUser.fullName}</div>
                <div className="text-slate-500 font-mono text-[11px]">@{targetUser.username}</div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  New Password (min. 8 chars) *
                </label>
                <input
                  type="password"
                  required
                  autoFocus
                  value={resetPasswordVal}
                  onChange={(e) => setResetPasswordVal(e.target.value)}
                  placeholder="Enter new password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Confirm New Password *
                </label>
                <input
                  type="password"
                  required
                  value={confirmResetPasswordVal}
                  onChange={(e) => setConfirmResetPasswordVal(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowResetModal(false);
                    setTargetUser(null);
                  }}
                  className="px-3.5 py-1.5 border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold cursor-pointer shadow shadow-purple-700/20"
                >
                  Save New Password
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
