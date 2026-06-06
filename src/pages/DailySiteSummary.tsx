import React, { useState, useEffect } from 'react';
import { useAppContext } from '../store';
import { Play, Calendar as CalIcon, AlertTriangle, CheckCircle, Info, Zap, RefreshCw, BarChart2 } from 'lucide-react';

export function DailySiteSummary() {
  const { projects } = useAppContext();
  const [selectedProject, setSelectedProject] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (selectedProject && selectedDate) {
      loadSummary(selectedProject, selectedDate);
    }
  }, [selectedProject, selectedDate]);

  const loadSummary = async (projectId: string, date: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/daily-summaries');
      const data = await res.json();
      const existing = data.find((row: any) => row.projectId === projectId && row.date === date);
      setSummary(existing || null);
    } catch (e: any) {
      setError("Failed to fetch summary logs");
    } finally {
      setIsLoading(false);
    }
  };

  const generateReport = async () => {
    if (!selectedProject || !selectedDate) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/generate-daily-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: selectedProject, date: selectedDate })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate report");
      }
      setSummary(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#f0f4f8]">
      {/* Header */}
      <div className="sap-header p-2 flex justify-between items-center bg-[#eef2f6] border-b border-[#8c9ba8]">
        <div className="flex items-center space-x-2 text-[#002f6c]">
          <Zap size={14} className="text-amber-500" />
          <span className="font-bold text-[13px] tracking-wide uppercase">AI Daily Site Summary Module</span>
        </div>
        <div className="flex items-center space-x-2 text-[10px]">
          <div>
            <label className="font-bold mr-1">Project:</label>
            <select 
              value={selectedProject} 
              onChange={e => setSelectedProject(e.target.value)}
              className="border border-[#8c9ba8] bg-white p-0.5 rounded shadow-sm outline-none"
            >
              <option value="">-- Select Project --</option>
              {projects.filter(p => !p.status || p.status === 'Ongoing').map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="font-bold mr-1 ml-2">Date:</label>
            <input 
              type="date" 
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border border-[#8c9ba8] bg-white p-0.5 rounded shadow-sm outline-none"
            />
          </div>
          <button 
            onClick={generateReport}
            disabled={!selectedProject || !selectedDate || isLoading}
            className="ml-2 sap-btn flex items-center bg-[#0056b3] text-white hover:bg-[#004494] disabled:bg-gray-400"
          >
            {isLoading ? <RefreshCw size={12} className="animate-spin mr-1" /> : <Play size={12} className="mr-1" />}
            {summary ? "Regenerate Analysis" : "Run AI Analysis"}
          </button>
        </div>
      </div>

      {error && (
        <div className="m-2 p-2 bg-red-50 border border-red-300 text-red-800 rounded text-[11px] font-bold">
          {error}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto p-2">
        {!selectedProject ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <p>Please select a project to view or generate its AI summary.</p>
          </div>
        ) : isLoading ? (
          <div className="h-full flex flex-col items-center justify-center text-[#0056b3] space-y-2">
            <RefreshCw size={24} className="animate-spin" />
            <p className="font-bold uppercase tracking-wider text-[10px]">AI is analyzing site logs and transactions...</p>
          </div>
        ) : summary ? (
          <div className="max-w-4xl mx-auto flex flex-col space-y-3 pb-8">
            {/* Title card */}
            <div className="bg-white border-t-4 border-[#0056b3] shadow-md rounded-b p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h1 className="text-xl font-bold text-[#002f6c]">{projects.find(p => p.id === selectedProject)?.name}</h1>
                  <p className="text-sm font-semibold text-gray-600 flex items-center mt-1"><CalIcon size={14} className="mr-1" /> Daily Executive Summary - {new Date(selectedDate).toLocaleDateString()}</p>
                </div>
                <div className="flex flex-col items-end">
                  <div className={`text-2xl font-black ${
                    summary.healthStatus === 'Green' ? 'text-green-600' : 
                    summary.healthStatus === 'Yellow' ? 'text-yellow-500' : 'text-red-600'
                  }`}>
                    {summary.healthScore} / 100
                  </div>
                  <div className={`text-[10px] uppercase font-bold px-2 py-0.5 mt-1 rounded text-white ${
                    summary.healthStatus === 'Green' ? 'bg-green-600' : 
                    summary.healthStatus === 'Yellow' ? 'bg-yellow-500' : 'bg-red-600'
                  }`}>
                    {summary.healthStatus} - {
                      summary.healthStatus === 'Green' ? 'Excellent' : 
                      summary.healthStatus === 'Yellow' ? 'Needs Attention' : 'Critical'
                    }
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="sap-panel p-3 bg-white">
                <div className="flex items-center text-[#0056b3] font-bold border-b border-[#8c9ba8] pb-1 mb-2">
                  <span className="bg-[#e6f2ff] p-1 rounded mr-2"><BarChart2 size={12} /></span>
                  Workforce & Attendance
                </div>
                <p className="text-gray-700 leading-relaxed text-[11px] whitespace-pre-wrap">{summary.workforceSummary}</p>
              </div>

              <div className="sap-panel p-3 bg-white">
                <div className="flex items-center text-[#0056b3] font-bold border-b border-[#8c9ba8] pb-1 mb-2">
                  <span className="bg-[#e6f2ff] p-1 rounded mr-2">💰</span>
                  Financial Summary
                </div>
                <p className="text-gray-700 leading-relaxed text-[11px] whitespace-pre-wrap">{summary.financialSummary}</p>
              </div>

              <div className="sap-panel p-3 bg-white">
                <div className="flex items-center text-[#0056b3] font-bold border-b border-[#8c9ba8] pb-1 mb-2">
                  <span className="bg-[#e6f2ff] p-1 rounded mr-2">🧱</span>
                  Materials & Inventory
                </div>
                <p className="text-gray-700 leading-relaxed text-[11px] whitespace-pre-wrap">{summary.materialSummary}</p>
              </div>

              <div className="sap-panel p-3 bg-white">
                <div className="flex items-center text-[#0056b3] font-bold border-b border-[#8c9ba8] pb-1 mb-2">
                  <span className="bg-[#e6f2ff] p-1 rounded mr-2">🧾</span>
                  Billing & Client Payments
                </div>
                <p className="text-gray-700 leading-relaxed text-[11px] whitespace-pre-wrap">{summary.billingSummary}</p>
              </div>
            </div>

            <div className="sap-panel p-3 bg-white">
              <div className="flex items-center text-[#0056b3] font-bold border-b border-[#8c9ba8] pb-1 mb-2">
                <span className="bg-[#e6f2ff] p-1 rounded mr-2">🏗️</span>
                Project Activities (DLR)
              </div>
              <p className="text-gray-700 leading-relaxed text-[11px] whitespace-pre-wrap">{summary.projectActivitySummary}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-blue-50 border border-blue-200 rounded p-3 shadow-sm relative">
                <div className="absolute top-0 right-0 p-2 opacity-10"><Zap size={40} /></div>
                <div className="flex items-center text-blue-900 font-bold mb-2">
                  <Zap size={14} className="mr-1 text-amber-500" />
                  AI Execution Insights
                </div>
                <div className="text-blue-900 leading-relaxed text-[11px] break-words whitespace-pre-wrap font-medium">
                  {summary.aiInsights}
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded p-3 shadow-sm relative">
                <div className="absolute top-0 right-0 p-2 opacity-10"><AlertTriangle size={40} /></div>
                <div className="flex items-center text-red-900 font-bold mb-2">
                  <AlertTriangle size={14} className="mr-1 text-red-600" />
                  Risk Alerts
                </div>
                <div className="text-red-900 leading-relaxed text-[11px] break-words whitespace-pre-wrap font-medium">
                  {summary.riskAlerts || "No significant risks detected for this period."}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
            <Zap size={48} className="opacity-20" />
            <div className="text-center">
              <h3 className="font-bold text-gray-500 text-[14px]">No AI Summary Generated</h3>
              <p className="text-[11px] mt-1 text-gray-400 max-w-sm">
                Click "Run AI Analysis" to compile all activities from {new Date(selectedDate).toLocaleDateString()} for the selected project and generate an intelligent management summary.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
