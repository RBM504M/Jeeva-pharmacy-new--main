import React from 'react';
import { ShieldCheck, Lock, FileText, CheckCircle2 } from 'lucide-react';
import { usePharmacy } from '../../context/PharmacyContext';

export const DpdpAuditLogView: React.FC = () => {
  const { dpdpLogs } = usePharmacy();

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h1 className="text-xl font-normal text-slate-800">
          DPDP Act, 2023 — Compliance Register
        </h1>
        <p className="text-xs text-slate-500 font-medium mt-0.5">
          Access Control / Digital Personal Data Protection
        </p>
      </div>

      {/* Compliance Overview Banner */}
      <div className="bg-white border border-slate-200/90 p-5 rounded-md shadow-xs space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-slate-900">
                Statutory Digital Health Data Compliance
              </h2>
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-semibold px-2 py-0.5 rounded border border-emerald-200">
                Section 6 & 8 Compliant
              </span>
            </div>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              Jeeva Pharmacy implements cryptographic data minimization and automated structural
              logging for patient health identifiers. Phone numbers are masked at rest (e.g.{' '}
              <span className="font-mono font-semibold text-slate-800">XXXXXX2847</span>), explicit digital
              dispensing consent is recorded on every checkout, and access reasons are immutable
              under the Drugs and Cosmetics Act.
            </p>
          </div>
        </div>

        {/* 3 Compliance Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <Lock className="w-3.5 h-3.5 text-slate-600" />
              <span>Data Minimization</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Masking active for Aadhaar/PAN and mobile digits across all point-of-sale terminals.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
              <span>Purpose Limitation</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Processing strictly restricted to Schedule Drug dispensing registers and statutory audits.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
            <div className="font-semibold text-slate-800 flex items-center gap-1.5 mb-1">
              <FileText className="w-3.5 h-3.5 text-slate-600" />
              <span>Immutable Audit Trail</span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Operator credentials, timestamp, and purpose code permanently linked to every dispensing record.
            </p>
          </div>
        </div>
      </div>

      {/* Structural Data Table */}
      <div className="bg-white border border-slate-200/90 rounded-md shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">
            Structural Patient Data Access Logs
          </h3>
          <span className="text-xs font-mono text-slate-500">
            {dpdpLogs.length} audit records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-700 border-b border-slate-200 font-semibold">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">Masked Patient Contact</th>
                <th className="py-3 px-4">Event Action</th>
                <th className="py-3 px-4">Authorized Operator</th>
                <th className="py-3 px-4">Purpose & Statutory Justification</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {dpdpLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 px-4 font-mono text-slate-500">{log.timestamp}</td>
                  <td className="py-3 px-4 font-mono font-semibold text-slate-800">{log.patientPhoneMasked}</td>
                  <td className="py-3 px-4">
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 font-mono text-[10px] rounded font-medium">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-900">{log.operatorName}</td>
                  <td className="py-3 px-4 text-slate-600">{log.purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
