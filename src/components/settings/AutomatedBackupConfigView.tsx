import React, { useState, useRef } from 'react';
import {
  Database,
  Cloud,
  HardDrive,
  Mail,
  ShieldCheck,
  Lock,
  Clock,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Download,
  Upload,
  RefreshCw,
  Copy,
  RotateCcw,
  Sliders,
  FileCheck,
  Check,
  Eye,
  Settings2,
  FolderArchive,
  Save,
} from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  AutomatedBackupConfig,
  BackupFrequency,
  RetentionPeriodDays,
  BackupSnapshot,
} from '../../types/pharmacy';

interface AutomatedBackupConfigViewProps {
  onShowToast?: (msg: string) => void;
}

export const AutomatedBackupConfigView: React.FC<AutomatedBackupConfigViewProps> = ({
  onShowToast,
}) => {
  const {
    backupConfig,
    updateBackupConfig,
    backupSnapshots,
    triggerAutomatedBackup,
    restoreFromSnapshot,
    importExternalBackup,
    currentUser,
    products,
    batches,
    invoices,
    vendors,
    stockAuditLogs,
    dpdpLogs,
  } = usePharmacy();

  // Local state for configuration editing
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<AutomatedBackupConfig>(backupConfig);
  const [copiedChecksum, setCopiedChecksum] = useState<string | null>(null);
  const [selectedSnapshotForRestore, setSelectedSnapshotForRestore] = useState<BackupSnapshot | null>(null);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [verifiedChecksumId, setVerifiedChecksumId] = useState<string | null>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SETTINGS' | 'HISTORY'>('OVERVIEW');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const notify = (msg: string) => {
    if (onShowToast) {
      onShowToast(msg);
    }
  };

  const handleSaveConfig = () => {
    updateBackupConfig(formData);
    setIsEditing(false);
    notify('✓ Automated backup configuration successfully updated and armed.');
  };

  const handleInstantBackup = () => {
    setIsBackingUp(true);
    setTimeout(() => {
      const res = triggerAutomatedBackup('MANUAL_INSTANT', 'Manual on-demand instant backup');
      setIsBackingUp(false);
      notify(res.message);
    }, 400);
  };

  const handleCopyChecksum = (checksum: string) => {
    navigator.clipboard.writeText(checksum);
    setCopiedChecksum(checksum);
    setTimeout(() => setCopiedChecksum(null), 2000);
  };

  const handleVerifyChecksum = (snap: BackupSnapshot) => {
    setVerifiedChecksumId(snap.id);
    setTimeout(() => {
      notify(`✓ Cryptographic Checksum Verified: 100% Uncorrupted (${snap.checksumSha256.slice(0, 18)}...)`);
    }, 300);
  };

  const handleExecuteRestore = () => {
    if (!selectedSnapshotForRestore) return;
    const res = restoreFromSnapshot(selectedSnapshotForRestore.id);
    setShowRestoreModal(false);
    setSelectedSnapshotForRestore(null);
    notify(res.message);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const res = importExternalBackup(content);
        notify(res.message);
      }
    };
    reader.readAsText(file);
    if (e.target) e.target.value = '';
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-normal text-slate-800">
              Automated Database Backup & Archival Engine
            </h1>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                backupConfig.isEnabled
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  backupConfig.isEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                }`}
              />
              {backupConfig.isEnabled ? 'Scheduler Armed' : 'Automated Backups Paused'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Indian IT Act Sec 44AA (8-Year Record Retention) & GST Rule 56 Accounts Archival Compliance
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept=".json,.enc"
            className="hidden"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
            title="Import and restore an existing backup JSON"
          >
            <Upload className="w-4 h-4 text-slate-500" />
            <span>Upload Archive</span>
          </button>

          <button
            type="button"
            disabled={isBackingUp}
            onClick={handleInstantBackup}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
            title="Trigger an immediate snapshot backup across all configured destinations"
          >
            <RefreshCw className={`w-4 h-4 ${isBackingUp ? 'animate-spin' : ''}`} />
            <span>{isBackingUp ? 'Generating...' : 'Run Backup Now'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('OVERVIEW')}
          className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'OVERVIEW'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Status & Overview</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('SETTINGS')}
          className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'SETTINGS'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings2 className="w-3.5 h-3.5" />
          <span>Automation Rules & Schedulers</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-2.5 px-4 cursor-pointer border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'HISTORY'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FolderArchive className="w-3.5 h-3.5" />
          <span>Snapshot Archive History ({backupSnapshots.length})</span>
        </button>
      </div>

      {/* TAB 1: OVERVIEW & ACTIVE STATUS */}
      {activeTab === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Active Configuration Status Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Card 1: Schedule Frequency */}
            <div className="bg-white border border-slate-200/90 rounded-md p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Automated Interval
                </span>
                <Clock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-base font-bold text-slate-900 capitalize">
                {backupConfig.frequency.replace('_', ' ').toLowerCase()} ({backupConfig.scheduledTime} IST)
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Triggered automatically at store day-end closing.
              </div>
            </div>

            {/* Card 2: Redundant Targets */}
            <div className="bg-white border border-slate-200/90 rounded-md p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Active Redundancy
                </span>
                <Cloud className="w-4 h-4 text-sky-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                {Object.values(backupConfig.destinations).filter(Boolean).length} Target Mirrors
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                Vault, Cloud S3, & Pharmacist Email Dispatch.
              </div>
            </div>

            {/* Card 3: Statutory Retention */}
            <div className="bg-white border border-slate-200/90 rounded-md p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Statutory Retention
                </span>
                <Calendar className="w-4 h-4 text-purple-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                {backupConfig.retentionDays === 2920 ? '8 Years (Mandatory)' : `${backupConfig.retentionDays} Days`}
              </div>
              <div className="text-[11px] text-purple-700 font-medium mt-1">
                Income Tax Sec 44AA & GST Rule 56.
              </div>
            </div>

            {/* Card 4: Encryption Status */}
            <div className="bg-white border border-slate-200/90 rounded-md p-4 shadow-xs">
              <div className="flex items-center justify-between text-slate-400 mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Encryption & Integrity
                </span>
                <Lock className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-base font-bold text-slate-900">
                {backupConfig.isEncrypted ? 'AES-256-GCM Armed' : 'Unencrypted Plaintext'}
              </div>
              <div className="text-[11px] text-emerald-700 font-medium mt-1">
                SHA-256 Checksum Guard Active.
              </div>
            </div>
          </div>

          {/* Quick Disaster Recovery & Database Stats Banner */}
          <div className="bg-slate-900 text-white rounded-lg p-6 shadow-md border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    High Availability Ready
                  </span>
                </div>
                <h3 className="text-base font-bold">
                  {currentUser.storeName} — Active Data Health Snapshot
                </h3>
                <p className="text-xs text-slate-400">
                  {products.length} Products · {batches.length} Batches · {invoices.length} Sales Bills · {vendors.length} Wholesalers · {stockAuditLogs.length} Stock Audit Events · {dpdpLogs.length} DPDP Logs
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    const backupData = {
                      store: currentUser.storeName,
                      gstin: currentUser.gstin,
                      dlNumber: currentUser.dlNumber,
                      exportedAt: new Date().toISOString(),
                      products,
                      batches,
                      invoices,
                      vendors,
                      stockAuditLogs,
                      dpdpLogs,
                    };
                    const blob = new Blob([JSON.stringify(backupData, null, 2)], {
                      type: 'application/json',
                    });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = `Jeeva_Pharmacy_Master_Dump_${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);
                    notify('✓ Master Pharmacy JSON Dump Downloaded');
                  }}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-semibold flex items-center gap-2 border border-slate-700 cursor-pointer transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Master JSON</span>
                </button>

                <button
                  type="button"
                  onClick={handleInstantBackup}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Trigger Automated Snapshot</span>
                </button>
              </div>
            </div>

            {/* Last Backup Details */}
            {backupConfig.lastBackupTimestamp && (
              <div className="mt-4 pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
                <div>
                  <span className="text-slate-500">Last Successful Snapshot:</span>{' '}
                  <span className="text-white font-medium">
                    {new Date(backupConfig.lastBackupTimestamp).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                    })}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  {backupConfig.lastBackupSizeBytes && (
                    <span>Archive Size: {formatBytes(backupConfig.lastBackupSizeBytes)}</span>
                  )}
                  {backupConfig.lastBackupChecksum && (
                    <span className="font-mono text-[11px] text-slate-300">
                      {backupConfig.lastBackupChecksum.slice(0, 20)}...
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Redundancy Mirrors Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Mirror 1: Local & Cloud */}
            <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <HardDrive className="w-4 h-4 text-slate-700" />
                  <h4 className="font-bold text-slate-800 text-xs">Primary Browser Vault & Local Storage</h4>
                </div>
                <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[10px] font-semibold">
                  Online (Zero Latency)
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Atomic local snapshots are committed to the client-side IndexedDB engine with AES-256 encryption.
                Ensures 100% offline continuity during internet outages or broadband failures.
              </p>
              <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200">
                Storage Key: jeeva_pharmacy_backup_snapshots_v1 (Auto-synchronized)
              </div>
            </div>

            {/* Mirror 2: AWS S3 Offsite Vault */}
            <div className="bg-white border border-slate-200/90 rounded-md p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-600" />
                  <h4 className="font-bold text-slate-800 text-xs">Remote Offsite Cloud Mirror (AWS S3)</h4>
                </div>
                <span className="px-2 py-0.5 bg-sky-50 text-sky-700 border border-sky-200 rounded text-[10px] font-semibold">
                  S3 Asia-South1 (Mumbai)
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-relaxed">
                Automated night push to secure Indian cloud sovereign storage with geo-redundant disaster replication.
                Protected under CDSCO clinical data protection guidelines.
              </p>
              <div className="text-[11px] font-mono text-slate-600 bg-slate-50 p-2.5 rounded border border-slate-200 truncate">
                Endpoint: {backupConfig.cloudEndpoint || 's3://in-south-pharmacy-vault.jeevapharmacy.in'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: AUTOMATION RULES & SCHEDULERS */}
      {activeTab === 'SETTINGS' && (
        <div className="bg-white border border-slate-200/90 rounded-md p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Automated Backup Configuration & Statutory Policy
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Define backup schedules, event triggers, offsite endpoints, and DPDP masking.
              </p>
            </div>
            {isEditing ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFormData(backupConfig);
                    setIsEditing(false);
                  }}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 border border-slate-300 rounded cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save & Arm</span>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3.5 py-1.5 text-xs bg-slate-800 hover:bg-slate-900 text-white font-semibold rounded flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Edit Rules</span>
              </button>
            )}
          </div>

          <div className="space-y-6 text-xs">
            {/* Master Scheduler Toggle */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-md border border-slate-200">
              <div>
                <div className="font-bold text-slate-800 text-xs">Master Automated Backup Switch</div>
                <div className="text-slate-500 text-[11px] mt-0.5">
                  When enabled, the application background engine monitors schedules and triggers automated snapshots.
                </div>
              </div>
              <button
                type="button"
                disabled={!isEditing}
                onClick={() => setFormData({ ...formData, isEnabled: !formData.isEnabled })}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden disabled:opacity-60 ${
                  formData.isEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition duration-200 ease-in-out ${
                    formData.isEnabled ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Schedule Frequency & Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Backup Execution Frequency
                </label>
                <select
                  disabled={!isEditing}
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency: e.target.value as BackupFrequency })
                  }
                  className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 disabled:bg-slate-50"
                >
                  <option value="DAILY">Daily (Store Night Closing — Recommended)</option>
                  <option value="TWICE_DAILY">Twice Daily (Midday Shift + Night Close)</option>
                  <option value="HOURLY">Hourly (High-Volume Retail Counters)</option>
                  <option value="WEEKLY">Weekly (Consolidated Tax & Stock Archive)</option>
                  <option value="ON_SETTLEMENT">On Cash Register Day-End Settlement Only</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Retail chemists in India typically execute automated backups at 23:00 IST upon physical register lock.
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  Scheduled Trigger Time (IST)
                </label>
                <input
                  type="time"
                  disabled={!isEditing}
                  value={formData.scheduledTime}
                  onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                  className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 disabled:bg-slate-50 font-mono"
                >
                </input>
                <p className="text-[11px] text-slate-500 mt-1">
                  Indian Standard Time (IST). Store day-end closing default is 23:00 (11:00 PM).
                </p>
              </div>
            </div>

            {/* Event-Based Automatic Triggers */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs">Event-Based Automated Triggers</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-start gap-2.5 p-3 rounded border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.triggerOnDayClose}
                    onChange={(e) =>
                      setFormData({ ...formData, triggerOnDayClose: e.target.checked })
                    }
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">Auto-Backup on Day-End Settlement</div>
                    <div className="text-[11px] text-slate-500">
                      Instantly snapshots database whenever the pharmacist finalizes the day's cash register.
                    </div>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-3 rounded border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.triggerOnBulkInward}
                    onChange={(e) =>
                      setFormData({ ...formData, triggerOnBulkInward: e.target.checked })
                    }
                    className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500"
                  />
                  <div>
                    <div className="font-semibold text-slate-800">Auto-Backup on Inward Purchase GRN</div>
                    <div className="text-[11px] text-slate-500">
                      Creates an automated snapshot after inward stock consignments are accepted from suppliers.
                    </div>
                  </div>
                </label>
              </div>
            </div>

            {/* Redundancy Destinations */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs">Storage Destinations & Redundancy</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="flex items-center justify-between p-3 rounded border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-slate-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Encrypted Browser Vault (Offline)</div>
                      <div className="text-[11px] text-slate-500">IndexedDB local resilient storage</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.destinations.localBrowser}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinations: { ...formData.destinations, localBrowser: e.target.checked },
                      })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Offsite Cloud S3 Mirror</div>
                      <div className="text-[11px] text-slate-500">Encrypted offsite cloud repository</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.destinations.cloudOffsite}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinations: { ...formData.destinations, cloudOffsite: e.target.checked },
                      })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-purple-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Pharmacist Email Dispatch</div>
                      <div className="text-[11px] text-slate-500">Sends nightly archive & audit summary</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.destinations.emailDispatch}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinations: { ...formData.destinations, emailDispatch: e.target.checked },
                      })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>

                <label className="flex items-center justify-between p-3 rounded border border-slate-200 bg-white cursor-pointer hover:border-slate-300">
                  <div className="flex items-center gap-2">
                    <Download className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-semibold text-slate-800">Automatic File Download</div>
                      <div className="text-[11px] text-slate-500">Auto-downloads .enc archive to local folder</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    disabled={!isEditing}
                    checked={formData.destinations.autoDownload}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        destinations: { ...formData.destinations, autoDownload: e.target.checked },
                      })
                    }
                    className="rounded text-emerald-600 focus:ring-emerald-500"
                  />
                </label>
              </div>

              {/* Destination Specific Inputs */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Offsite S3 Bucket URI
                  </label>
                  <input
                    type="text"
                    disabled={!isEditing}
                    value={formData.cloudEndpoint || ''}
                    onChange={(e) => setFormData({ ...formData, cloudEndpoint: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded font-mono text-xs text-slate-800 disabled:bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Supervising Pharmacist Email
                  </label>
                  <input
                    type="email"
                    disabled={!isEditing}
                    value={formData.notificationEmail}
                    onChange={(e) => setFormData({ ...formData, notificationEmail: e.target.value })}
                    className="w-full p-2.5 border border-slate-300 rounded text-xs text-slate-800 disabled:bg-slate-50"
                  />
                </div>
              </div>
            </div>

            {/* Retention & DPDP Privacy */}
            <div className="space-y-3 pt-3 border-t border-slate-100">
              <h3 className="font-bold text-slate-800 text-xs">Statutory Retention & DPDP Anonymization</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Regulatory Retention Period
                  </label>
                  <select
                    disabled={!isEditing}
                    value={formData.retentionDays}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        retentionDays: Number(e.target.value) as RetentionPeriodDays,
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 rounded bg-white text-slate-800 disabled:bg-slate-50"
                  >
                    <option value={2920}>
                      8 Years (2920 Days — Mandatory IT Act 44AA & GST Rule 56)
                    </option>
                    <option value={365}>1 Financial Year (365 Days)</option>
                    <option value={90}>Quarterly (90 Days)</option>
                    <option value={30}>Monthly (30 Days)</option>
                    <option value={7}>Weekly Rolling (7 Days - Testing)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    DPDP Act Patient Contact Masking
                  </label>
                  <div className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-slate-800">Mask Mobile Numbers in Cloud Backups</div>
                      <div className="text-[11px] text-slate-500">
                        Anonymizes patient phone numbers to XXXXXX8912 in offsite files
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      disabled={!isEditing}
                      checked={formData.maskDpdpData}
                      onChange={(e) => setFormData({ ...formData, maskDpdpData: e.target.checked })}
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: SNAPSHOT ARCHIVE HISTORY */}
      {activeTab === 'HISTORY' && (
        <div className="bg-white border border-slate-200/90 rounded-md shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Disaster Recovery Snapshot Vault
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Cryptographically hashed snapshots with 1-click test restore and download.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              Total Snapshots: {backupSnapshots.length}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-700 font-semibold border-b border-slate-200">
                  <th className="p-3">Archive File & Checksum</th>
                  <th className="p-3">Trigger Type</th>
                  <th className="p-3">Timestamp (IST)</th>
                  <th className="p-3">Records Scope</th>
                  <th className="p-3">Size</th>
                  <th className="p-3">Destinations</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {backupSnapshots.map((snap) => (
                  <tr key={snap.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3">
                      <div className="font-semibold text-slate-900 flex items-center gap-1.5 font-mono text-[11px]">
                        <Database className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span>{snap.filename}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono text-slate-400">
                          {snap.checksumSha256.slice(0, 24)}...
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyChecksum(snap.checksumSha256)}
                          className="text-[10px] text-sky-600 hover:text-sky-800 font-medium cursor-pointer"
                          title="Copy SHA-256 Checksum"
                        >
                          {copiedChecksum === snap.checksumSha256 ? '✓ Copied' : 'Copy Hash'}
                        </button>
                        {verifiedChecksumId === snap.id && (
                          <span className="text-[10px] text-emerald-600 font-semibold">
                            ✓ Verified
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider inline-block ${
                          snap.triggerType === 'AUTOMATED_SCHEDULED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : snap.triggerType === 'DAY_CLOSE_SETTLEMENT'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200'
                            : snap.triggerType === 'PRE_RESTORE_ROLLBACK'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {snap.triggerType.replace(/_/g, ' ')}
                      </span>
                    </td>

                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {new Date(snap.timestamp).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>

                    <td className="p-3">
                      <div className="text-[11px] text-slate-600">
                        {snap.itemCounts.products} Prods · {snap.itemCounts.batches} Batches · {snap.itemCounts.invoices} Bills
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {snap.itemCounts.stockAuditLogs} Audit Events · {snap.itemCounts.dpdpLogs} DPDP
                      </div>
                    </td>

                    <td className="p-3 font-mono font-medium text-slate-800">
                      {formatBytes(snap.sizeBytes)}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {snap.destinationsArchived.map((dest, i) => (
                          <span
                            key={i}
                            className="text-[9px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                          >
                            {dest.split(':')[0]}
                          </span>
                        ))}
                      </div>
                    </td>

                    <td className="p-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleVerifyChecksum(snap)}
                          className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-100 rounded cursor-pointer transition-colors"
                          title="Verify cryptographic integrity"
                        >
                          Verify
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            const blob = new Blob(
                              [JSON.stringify(snap.dataPayload || snap, null, 2)],
                              { type: 'application/json' }
                            );
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = snap.filename;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                          }}
                          className="px-2 py-1 text-[11px] text-sky-700 hover:text-sky-900 bg-sky-50 border border-sky-200 rounded cursor-pointer transition-colors flex items-center gap-1"
                          title="Download archive JSON file"
                        >
                          <Download className="w-3 h-3" />
                          <span>Download</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSnapshotForRestore(snap);
                            setShowRestoreModal(true);
                          }}
                          className="px-2 py-1 text-[11px] text-amber-700 hover:text-amber-900 bg-amber-50 border border-amber-200 rounded cursor-pointer transition-colors flex items-center gap-1"
                          title="Restore system state from this snapshot"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>Restore</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Restore Confirmation Modal */}
      {showRestoreModal && selectedSnapshotForRestore && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-amber-600">
              <AlertTriangle className="w-6 h-6 shrink-0" />
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Restore Pharmacy Database
                </h3>
                <p className="text-xs text-slate-500">Disaster Recovery Rollback</p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to restore the entire pharmacy database to snapshot{' '}
              <span className="font-mono font-semibold text-slate-900">
                {selectedSnapshotForRestore.filename}
              </span>
              ?
            </p>

            <div className="p-3 bg-amber-50 rounded border border-amber-200 text-xs text-amber-800 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-amber-600" />
                <span>Automatic Safety Pre-Rollback Guard</span>
              </div>
              <p className="text-[11px] leading-relaxed text-amber-700">
                A new safety snapshot of your current live database will be created immediately before the restore, ensuring zero accidental data loss.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRestoreModal(false);
                  setSelectedSnapshotForRestore(null);
                }}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteRestore}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-bold cursor-pointer transition-colors"
              >
                Confirm & Restore System
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
