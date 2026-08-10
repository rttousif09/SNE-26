import React, { useState, useMemo } from 'react';
import { SAPSelect } from './SAPSelect';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import { CheckCircle, AlertOctagon, UserCheck, Calendar, MapPin, Search } from 'lucide-react';
import { checkAttendanceDuplicate } from '../lib/duplicateChecker';
import { PDFExportButton } from './PDFExportButton';

export const WorkerAttendanceLog: React.FC = () => {
  const { workers, projects, attendance, addAttendance, user } = useAppContext();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const selectedProjectObj = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId);
  }, [selectedProjectId, projects]);

  const activeWorkers = useMemo(() => {
    if (!selectedProjectId) return [];
    return workers.filter(w => w.projectId === selectedProjectId &&
      (searchQuery.trim() === '' || w.name.toLowerCase().includes(searchQuery.toLowerCase()) || (w.workerId || '').toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [selectedProjectId, workers, searchQuery]);

  // Find attendance for all workers on the selected date
  const selectedDateAttendanceMap = useMemo(() => {
    const map: { [workerId: string]: string } = {};
    attendance.forEach(att => {
      if (att.date === selectedDate) {
        map[att.workerId] = `${att.status} (${projects.find(p => p.id === att.projectId)?.name || 'Other Site'})`;
      }
    });
    return map;
  }, [attendance, selectedDate, projects]);

  const handleMarkAttendance = async (workerId: string, status: 'Present' | 'Absent' | 'HalfDay' | 'Leave') => {
    if (!selectedProjectId) {
      setAlertMessage({ type: 'error', text: 'Please select a Project/Site first.' });
      return;
    }

    setAlertMessage(null);

    const targetProjectObj = projects.find(p => p.id === selectedProjectId);
    if (targetProjectObj?.status === 'Completed') {
      alert("This project is marked as Completed. New entries are not allowed.");
      return;
    }

    // 3. Attendance Duplicate Check
    // If attendance row exists for Same Worker, Same Date, Same Site (or even different site for safety)
    const existingMatches = checkAttendanceDuplicate(attendance, {
      workerId,
      date: selectedDate,
      projectId: selectedProjectId
    });

    if (existingMatches.length > 0) {
      setAlertMessage({
        type: 'error',
        text: 'Attendance already exists for this worker on the selected date.'
      });
      return;
    }

    try {
      await addAttendance({
        workerId,
        projectId: selectedProjectId,
        date: selectedDate,
        status
      });
      setAlertMessage({
        type: 'success',
        text: `Successfully marked attendance: ${status} for ${workers.find(w => w.id === workerId)?.name || 'Worker'}`
      });
    } catch (err) {
      console.error(err);
      setAlertMessage({ type: 'error', text: 'Error occurred while saving attendance.' });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white border border-[#8c9ba8] shadow-sm select-none">
      
      {/* Title block */}
      <div className="bg-[var(--color-sap-blue-val)] text-white px-4 py-2 flex items-center justify-between border-b border-[#001f4d]">
        <div className="flex items-center space-x-2">
          <UserCheck size={16} className="text-sky-300" />
          <h2 className="text-xs font-black tracking-wider uppercase font-mono">Roll-Call Attendance Portal</h2>
        </div>
        <div className="flex items-center space-x-2">
          <p className="text-[9px] text-slate-300 italic mr-2">Prevent duplicate submissions on the same date</p>
          <PDFExportButton
            title="Attendance Log Report"
            subtitle={`Date: ${selectedDate}`}
            siteName={selectedProjectObj?.name || 'All'}
            headers={['EMP. ID', 'Worker Name', 'Designation', 'Status']}
            data={activeWorkers.map(w => [
              w.workerId,
              w.name,
              w.designation,
              selectedDateAttendanceMap[w.id] || 'Not Marked'
            ])}
            totals={[
              '', 'Total Present:', '', 
              activeWorkers.filter(w => selectedDateAttendanceMap[w.id]?.startsWith('Present')).length.toString()
            ]}
          />
        </div>
      </div>

      {/* Inputs Filters Header bar */}
      <div className="bg-[#eef2f6] border-b border-[#8c9ba8] p-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center space-x-1.5 shrink-0">
          <Calendar size={13} className="text-indigo-800" />
          <span className="text-[10px] uppercase font-black tracking-wider text-gray-700 font-mono">Date:</span>
          <input 
            type="date" 
            className="sap-input py-0.5 text-[11px] font-bold" 
            value={selectedDate} 
            onChange={(e) => {
              setSelectedDate(e.target.value);
              setAlertMessage(null);
            }} 
          />
        </div>

        <div className="flex items-center space-x-1.5 shrink-0">
          <MapPin size={13} className="text-red-700" />
          <span className="text-[10px] uppercase font-black tracking-wider text-gray-700 font-mono">Site/Project:</span>
          <SAPSelect 
            className="sap-input py-0.5 text-[11px] font-bold min-w-[200px]"
            value={selectedProjectId}
            onChange={(e) => {
              setSelectedProjectId(e.target.value);
              setAlertMessage(null);
            }}
          >
            <option value="">Select Construction Site...</option>
            {projects.filter(p => !p.status || p.status === 'Ongoing').map(p => (
              <option key={p.id} value={p.id}>{p.name} (Client: {p.clientName || 'General'})</option>
            ))}
          </SAPSelect>
        </div>

        {selectedProjectId && (
          <div className="flex items-center space-x-1 border rounded bg-white px-2 py-0.5 shrink-0 ml-auto">
            <Search size={11} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Filter worker..." 
              className="text-[10px] bg-transparent outline-none focus:ring-0 text-gray-800 border-none w-28 h-4 font-bold"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* Alerts notification toast/block */}
      {alertMessage && (
        <div className={`mx-4 mt-3 px-3 py-2 border rounded-xs text-[10px] flex items-center space-x-2 font-bold ${
          alertMessage.type === 'success' ? 'bg-green-50 border-green-300 text-green-800' : 'bg-red-50 border-red-300 text-red-800'
        }`}>
          {alertMessage.type === 'success' ? <CheckCircle size={14} className="text-green-600 shrink-0" /> : <AlertOctagon size={14} className="text-red-600 shrink-0" />}
          <span>{alertMessage.text}</span>
        </div>
      )}

      {/* Primary Workspace Grid or Empty view */}
      <div className="flex-1 overflow-y-auto p-4">
        {!selectedProjectId ? (
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-gray-300 bg-gray-50/50 p-4 rounded-sm text-center">
            <UserCheck size={28} className="text-slate-400 mb-2" />
            <h3 className="text-xs font-bold text-gray-700 uppercase">Roll Attendance log is Empty</h3>
            <p className="text-[10px] text-gray-500 mt-1">Please select an active Site/Project from the filter menu to pull workers registry and start marking daily attendance rolls.</p>
          </div>
        ) : activeWorkers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 border border-dashed border-gray-300 bg-gray-50/50 p-4 rounded-sm text-center">
            <Search size={24} className="text-slate-400 mb-2" />
            <h3 className="text-xs font-bold text-gray-700 uppercase">No active workers found</h3>
            <p className="text-[10px] text-gray-500 mt-1">There are no workers registered or filtered under "{selectedProjectObj?.name}". Navigate to Workers Directory to assign workers to this site.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-500 px-2 border-b pb-1">
              <span>Worker Identity & details</span>
              <span>Daily Attendance Actions</span>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {activeWorkers.map((worker) => {
                const checkedLabel = selectedDateAttendanceMap[worker.id];

                return (
                  <motion.div 
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={worker.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-white border p-2.5 rounded hover:border-[#0056b3] transition-colors gap-2"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-[11px] font-extrabold text-[#1a365d]">{worker.name}</span>
                        <span className="px-1 text-[8px] bg-slate-100 text-slate-700 font-mono border rounded">{worker.workerId || 'No EMP-ID'}</span>
                      </div>
                      <div className="text-[9px] text-gray-500 font-mono mt-0.5">
                        Designation: <span className="font-semibold text-slate-800">{worker.designation || 'General Labour'}</span> • Serial No: {worker.serialNo || '-'}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1.5 self-end sm:self-auto">
                      {checkedLabel ? (
                        <div className="flex items-center space-x-1.5 bg-indigo-50 border border-indigo-200 text-indigo-900 px-2 py-1 rounded font-mono font-bold text-[9px]">
                          <CheckCircle size={10} className="text-indigo-700" />
                          <span>MARKED: {checkedLabel}</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => handleMarkAttendance(worker.id, 'Present')}
                            className="text-[9px] px-2 py-1 bg-green-700 text-white font-extrabold rounded-xs border border-transparent hover:bg-green-800 cursor-pointer shadow-2xs"
                            title="Worker was present for a full shift"
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(worker.id, 'HalfDay')}
                            className="text-[9px] px-2 py-1 bg-amber-600 text-white font-extrabold rounded-xs border border-transparent hover:bg-amber-700 cursor-pointer shadow-2xs"
                            title="Worker completed a half day of work"
                          >
                            Half Day
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(worker.id, 'Absent')}
                            className="text-[9px] px-2 py-1 bg-red-700 text-white font-extrabold rounded-xs border border-transparent hover:bg-red-800 cursor-pointer shadow-2xs"
                            title="Worker was absent from duty"
                          >
                            Absent
                          </button>
                          <button
                            onClick={() => handleMarkAttendance(worker.id, 'Leave')}
                            className="text-[9px] px-2 py-1 bg-slate-600 text-white font-extrabold rounded-xs border border-transparent hover:bg-slate-700 cursor-pointer shadow-2xs"
                            title="Authorized leave of absence"
                          >
                            Leave
                          </button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
