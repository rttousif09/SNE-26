import React, { useState, useMemo } from 'react';
import { useAppContext } from '../store';
import { 
  Activity, 
  Search, 
  RefreshCw, 
  Plus, 
  Edit, 
  Trash2, 
  Filter, 
  Folder, 
  CreditCard, 
  DollarSign, 
  User, 
  Clock, 
  ArrowRight,
  Database,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function ActivityLog() {
  const { activityLogs, refreshActivityLogs } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModule, setSelectedModule] = useState<'all' | 'projects' | 'payments' | 'expenses'>('all');
  const [selectedAction, setSelectedAction] = useState<'all' | 'CREATE' | 'UPDATE' | 'DELETE'>('all');
  const [userQuery, setUserQuery] = useState('');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshActivityLogs();
    setTimeout(() => {
      setIsRefreshing(false);
    }, 600);
  };

  // Helper to determine module icon
  const getModuleIcon = (module: string) => {
    switch (module.toLowerCase()) {
      case 'projects':
        return <Folder className="w-4 h-4 text-emerald-600" />;
      case 'payments':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'expenses':
        return <DollarSign className="w-4 h-4 text-amber-600" />;
      default:
        return <Database className="w-4 h-4 text-slate-600" />;
    }
  };

  // Helper for action type style
  const getActionStyle = (action: string) => {
    switch (action.toUpperCase()) {
      case 'CREATE':
        return {
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          badgeBg: 'bg-emerald-500',
          shadow: 'shadow-emerald-100',
          icon: <Plus className="w-3.5 h-3.5" />
        };
      case 'UPDATE':
        return {
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          badgeBg: 'bg-amber-500',
          shadow: 'shadow-amber-100',
          icon: <Edit className="w-3.5 h-3.5" />
        };
      case 'DELETE':
        return {
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          badgeBg: 'bg-rose-500',
          shadow: 'shadow-rose-100',
          icon: <Trash2 className="w-3.5 h-3.5" />
        };
      default:
        return {
          bg: 'bg-slate-50 text-slate-700 border-slate-200',
          badgeBg: 'bg-slate-500',
          shadow: 'shadow-slate-100',
          icon: <Activity className="w-3.5 h-3.5" />
        };
    }
  };

  const filteredLogs = useMemo(() => {
    return activityLogs.filter(log => {
      const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            log.recordId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesModule = selectedModule === 'all' || log.module.toLowerCase() === selectedModule;
      const matchesAction = selectedAction === 'all' || log.actionType.toUpperCase() === selectedAction.toUpperCase();
      const matchesUser = !userQuery || log.username.toLowerCase().includes(userQuery.toLowerCase());
      return matchesSearch && matchesModule && matchesAction && matchesUser;
    });
  }, [activityLogs, searchTerm, selectedModule, selectedAction, userQuery]);

  // Calculations for KPI Cards
  const stats = useMemo(() => {
    const total = activityLogs.length;
    const creates = activityLogs.filter(l => l.actionType.toUpperCase() === 'CREATE').length;
    const updates = activityLogs.filter(l => l.actionType.toUpperCase() === 'UPDATE').length;
    const deletes = activityLogs.filter(l => l.actionType.toUpperCase() === 'DELETE').length;
    return { total, creates, updates, deletes };
  }, [activityLogs]);

  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      return d.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6" id="activity-log-page">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-100 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Activity className="w-6 h-6 text-emerald-600 animate-pulse" />
            System Activity Log
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time auditable ledger of operations on projects, client payments, and expenses
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer shadow-xs disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Syncing Feed...' : 'Sync Activity'}
        </button>
      </div>

      {/* KPI Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Operations</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</h3>
            <p className="text-xs text-slate-500 mt-1">Actions recorded total</p>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <Database className="w-5 h-5" />
          </div>
        </div>

        {/* Creates Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Created Records</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.creates}</h3>
            <p className="text-xs text-slate-500 mt-1">New entity entries</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <Plus className="w-5 h-5" />
          </div>
        </div>

        {/* Updates Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Updated Records</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.updates}</h3>
            <p className="text-xs text-slate-500 mt-1">Record modifications</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Edit className="w-5 h-5" />
          </div>
        </div>

        {/* Deletes Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Deleted Records</span>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">{stats.deletes}</h3>
            <p className="text-xs text-slate-500 mt-1">Removals from ledger</p>
          </div>
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600">
            <Trash2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter and Query Center */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Filter className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700">Filter Control Console</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Text Search details */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Search details or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm w-full outline-hidden border border-slate-200 rounded-lg focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {/* User filter */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Filter by operator/user..."
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm w-full outline-hidden border border-slate-200 rounded-lg focus:border-slate-300 focus:ring-1 focus:ring-slate-300"
            />
          </div>

          {/* Module Filter */}
          <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {(['all', 'projects', 'payments', 'expenses'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setSelectedModule(m)}
                className={`flex-1 text-center py-1 text-xs font-semibold capitalize rounded-md transition-all cursor-pointer ${
                  selectedModule === m 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {m}
              </button>
            ))}
          </div>

          {/* Action Filter */}
          <div className="flex gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {(['all', 'CREATE', 'UPDATE', 'DELETE'] as const).map((act) => (
              <button
                key={act}
                onClick={() => setSelectedAction(act)}
                className={`flex-grow text-center py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                  selectedAction === act 
                    ? 'bg-white text-slate-800 shadow-xs' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {act}
              </button>
            ))}
          </div>
        </div>

        {/* Clear filter button if any is selected */}
        {(searchTerm || userQuery || selectedModule !== 'all' || selectedAction !== 'all') && (
          <div className="flex justify-end pt-1">
            <button
              onClick={() => {
                setSearchTerm('');
                setUserQuery('');
                setSelectedModule('all');
                setSelectedAction('all');
              }}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              Reset active filters
            </button>
          </div>
        )}
      </div>

      {/* Main Feed Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-100 px-5 py-3.5 flex justify-between items-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Audit Log Table List</span>
          <span className="text-xs font-medium text-slate-400">Showing {filteredLogs.length} of {activityLogs.length} records</span>
        </div>

        <div className="divide-y divide-slate-100">
          <AnimatePresence mode="popLayout">
            {filteredLogs.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-12 text-center"
              >
                <div className="p-4 bg-slate-50 rounded-full w-14 h-14 flex items-center justify-center mx-auto text-slate-400">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="text-slate-700 font-medium mt-4">No matching audit logs found</h3>
                <p className="text-slate-400 text-sm mt-1 max-w-sm mx-auto">
                  Try adjusting the text filters or check your server synchronized record set.
                </p>
              </motion.div>
            ) : (
              filteredLogs.map((log) => {
                const actionStyle = getActionStyle(log.actionType);
                return (
                  <motion.div
                    key={log.id}
                    layoutId={`log-${log.id}`}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -15 }}
                    transition={{ duration: 0.25 }}
                    className="p-5 hover:bg-slate-50/50 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    {/* Left block: Action Avatar and details */}
                    <div className="flex items-start gap-4 flex-1">
                      {/* Floating Bubbled indicator */}
                      <div className={`p-2.5 rounded-xl border text-sm font-semibold flex items-center justify-center shadow-xs ${actionStyle.bg} shrink-0`}>
                        {actionStyle.icon}
                      </div>

                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {/* Module indicator */}
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 uppercase tracking-tighter">
                            {getModuleIcon(log.module)}
                            {log.module}
                          </span>

                          {/* Action Type Badge */}
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-normal uppercase ${actionStyle.bg}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${actionStyle.badgeBg}`} />
                            {log.actionType}
                          </span>

                          {/* ID container */}
                          <span className="text-[11px] font-mono text-slate-400" title="Entity ID">
                            ID: {log.recordId}
                          </span>
                        </div>

                        {/* Details content */}
                        <p className="text-sm font-medium text-slate-800 leading-relaxed md:max-w-2xl">
                          {log.details}
                        </p>
                      </div>
                    </div>

                    {/* Right block: Timestamp & User */}
                    <div className="flex md:flex-col items-center md:items-end justify-between w-full md:w-auto md:shrink-0 text-xs text-slate-500 gap-2 border-t border-slate-100 pt-3 md:pt-0 md:border-0">
                      {/* Operator User */}
                      <div className="flex items-center gap-1.5 font-medium text-slate-700 bg-slate-50 md:bg-transparent px-2.5 py-1 md:p-0 rounded-full md:rounded-none">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{log.username}</span>
                      </div>

                      {/* Timestamp */}
                      <div className="flex items-center gap-1.5 font-mono text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{formatDate(log.timestamp)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
