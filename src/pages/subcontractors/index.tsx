import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../store';
import { 
  Building, Users, FileText, CreditCard, Activity, RefreshCw, AlertCircle 
} from 'lucide-react';
import { Subcontractor, SubcontractorBill, SubcontractorPayment, SubcontractorAuditTrail } from '../../types';

// Import Child Components
import { DashboardComponent } from './DashboardComponent';
import { MasterComponent } from './MasterComponent';
import { BillingComponent } from './BillingComponent';
import { PaymentsComponent } from './PaymentsComponent';
import { LedgerComponent } from './LedgerComponent';
import { AuditTrailComponent } from './AuditTrailComponent';

export const Subcontractors: React.FC = () => {
  const { user, projects = [], numberingSettings = [], previewNextNumber } = useAppContext();
  
  // Tabs: dashboard, master, billing, payments, ledger, audit
  const [activeTab, setActiveTab] = useState<'dashboard' | 'master' | 'billing' | 'payments' | 'ledger' | 'audit'>('dashboard');
  
  // Shared Data State
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [bills, setBills] = useState<SubcontractorBill[]>([]);
  const [payments, setPayments] = useState<SubcontractorPayment[]>([]);
  const [auditTrail, setAuditTrail] = useState<SubcontractorAuditTrail[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Selected subcontractor for payments grid & ledger continuity
  const [selectedSubcontractorId, setSelectedSubcontractorId] = useState<string>('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  // API Call: Fetch Data
  const loadAllData = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const [subRes, billRes, pmtRes, auditRes] = await Promise.all([
        fetch('/api/subcontractors').then(r => r.json()),
        fetch('/api/subcontractor-bills').then(r => r.json()),
        fetch('/api/subcontractor-payments').then(r => r.json()),
        fetch('/api/subcontractors-audit-trail').then(r => r.json())
      ]);

      if (subRes.error || billRes.error || pmtRes.error || auditRes.error) {
        throw new Error(subRes.error || billRes.error || pmtRes.error || auditRes.error);
      }

      setSubcontractors(subRes);
      setBills(billRes);
      setPayments(pmtRes);
      setAuditTrail(auditRes);
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "Failed to load subcontractor workflows. Check connectivity or IndexedDB fallback.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  return (
    <div className="p-4 space-y-4 max-w-7xl mx-auto">
      {/* Title block banner */}
      <div className="bg-[#1e293b] border-2 border-[#1e293b] shadow-md p-4 rounded text-white flex justify-between items-center relative overflow-hidden">
        {/* Subtle decorative backing */}
        <div className="absolute right-0 top-0 bottom-0 opacity-10 flex items-center pointer-events-none">
          <Building size={160} className="translate-x-12" />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-widest uppercase flex items-center space-x-1.5 text-amber-500">
            <span>SN Enterprises Construction ERP</span>
          </h2>
          <h1 className="text-lg font-extrabold tracking-tight mt-1 text-white">
            SUBCONTRACTOR DISBURSEMENT & CONTRACT MANAGEMENT
          </h1>
          <p className="text-[10px] text-gray-400 font-medium tracking-wide mt-1">
            Reconcile agreements, certifiably log measured civil task works, holding deductions, bank settlements & running ledgers.
          </p>
        </div>
        <div className="z-10">
          <button 
            onClick={loadAllData} 
            disabled={loading}
            className="bg-slate-800 hover:bg-slate-700 text-amber-500 font-bold p-1.5 rounded flex items-center space-x-1 text-xs border border-slate-700 transition"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            <span>Sync ERP</span>
          </button>
        </div>
      </div>

      {/* Errors display panel */}
      {errorMessage && (
        <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-3 rounded flex items-start space-x-2 text-[10px] font-semibold">
          <AlertCircle size={14} className="flex-shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-extrabold">Workflow Halt Exception: </span>
            {errorMessage}
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-800 font-bold">&#x2715;</button>
        </div>
      )}

      {/* Tabs navigation panel */}
      <div className="flex space-x-1 border-b border-gray-300 text-[10px] uppercase font-bold tracking-wider">
        {[
          { id: 'dashboard', label: 'Dashboard Metric Analytics', icon: <Activity size={12}/> },
          { id: 'master', label: 'Contractor Mast Directory', icon: <Users size={12}/> },
          { id: 'billing', label: 'Work Cert Billing Register', icon: <FileText size={12}/> },
          { id: 'payments', label: 'Direct Payments Sync Grid', icon: <CreditCard size={12}/> },
          { id: 'ledger', label: 'Book Reconciliation Ledger', icon: <Building size={12}/> },
          { id: 'audit', label: 'ERP Security Audit Trails', icon: <Activity size={12}/> }
        ].map(t => {
          const isAct = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => {
                setActiveTab(t.id as any);
                setErrorMessage(null);
              }}
              className={`px-3 py-2 border-t-2 border-x transition flex items-center space-x-1.5 ${
                isAct 
                  ? 'border-t-amber-500 border-x-gray-300 bg-white text-amber-600 font-extrabold' 
                  : 'border-t-transparent border-x-transparent text-gray-550 hover:bg-gray-100 hover:text-gray-900 font-bold'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Primary Workspace tab routers */}
      <div>
        {activeTab === 'dashboard' && (
          <DashboardComponent 
            subcontractors={subcontractors}
            bills={bills}
            payments={payments}
          />
        )}

        {activeTab === 'master' && (
          <MasterComponent 
            user={user}
            subcontractors={subcontractors}
            numberingSettings={numberingSettings}
            previewNextNumber={previewNextNumber}
            loadAllData={loadAllData}
            setErrorMessage={setErrorMessage}
            setLoading={setLoading}
          />
        )}

        {activeTab === 'billing' && (
          <BillingComponent 
            user={user}
            projects={projects}
            subcontractors={subcontractors}
            bills={bills}
            numberingSettings={numberingSettings}
            previewNextNumber={previewNextNumber}
            loadAllData={loadAllData}
            setErrorMessage={setErrorMessage}
            setLoading={setLoading}
          />
        )}

        {activeTab === 'payments' && (
          <PaymentsComponent 
            user={user}
            projects={projects}
            subcontractors={subcontractors}
            payments={payments}
            selectedSubcontractorId={selectedSubcontractorId}
            setSelectedSubcontractorId={setSelectedSubcontractorId}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            loadAllData={loadAllData}
            setErrorMessage={setErrorMessage}
            setLoading={setLoading}
          />
        )}

        {activeTab === 'ledger' && (
          <LedgerComponent 
            user={user}
            projects={projects}
            subcontractors={subcontractors}
            selectedSubcontractorId={selectedSubcontractorId}
            setSelectedSubcontractorId={setSelectedSubcontractorId}
            setErrorMessage={setErrorMessage}
            setLoading={setLoading}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTrailComponent 
            auditTrail={auditTrail}
          />
        )}
      </div>
    </div>
  );
};
