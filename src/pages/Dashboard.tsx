import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { useAppContext } from '../store';
import Markdown from 'react-markdown';

export const Dashboard: React.FC = () => {
  const { projects, workers, billings, clientPayments, expensesLedger, labourPlannings, assets = [] } = useAppContext();

  const getWorkerCategory = (designation: string): string => {
    const norm = (designation || "").toLowerCase();
    if (norm.includes("helper")) return "Helper";
    if (norm.includes("carpenter")) return "Carpenter";
    if (norm.includes("bar bender") || norm.includes("bender")) return "Bar Bender";
    if (norm.includes("steel fixer") || norm.includes("fitter") || norm.includes("fixer")) return "Steel Fixer";
    if (norm.includes("mason")) return "Mason";
    if (norm.includes("concrete") || norm.includes("cement")) return "Concrete Worker";
    if (norm.includes("supervisor") || norm.includes("engineer")) return "Supervisor";
    if (norm.includes("foreman")) return "Foreman";
    return "Other";
  };

  let totalRequiredVal = 0;
  let totalAvailableVal = 0;
  let totalShortageVal = 0;
  let totalExcessVal = 0;
  let upcomingPlanningCount = 0;

  const todayStr = new Date().toISOString().substring(0, 10);

  (labourPlannings || []).forEach(plan => {
    if (plan.requiredDate >= todayStr) {
      upcomingPlanningCount++;
    }

    const siteWorkers = workers.filter(w => w.projectId === plan.projectId);
    
    const catsActive = {
      Carpenter: 0, Helper: 0, "Bar Bender": 0, "Steel Fixer": 0, Mason: 0,
      "Concrete Worker": 0, Supervisor: 0, Foreman: 0, Other: 0
    };
    siteWorkers.forEach(w => {
      const cat = getWorkerCategory(w.designation);
      if (cat in catsActive) {
        catsActive[cat as keyof typeof catsActive]++;
      } else {
        catsActive["Other"]++;
      }
    });

    const categoriesList = [
      { key: "Carpenter", req: plan.carpenterReq || 0, avail: catsActive["Carpenter"] },
      { key: "Helper", req: plan.helperReq || 0, avail: catsActive["Helper"] },
      { key: "Bar Bender", req: plan.barBenderReq || 0, avail: catsActive["Bar Bender"] },
      { key: "Steel Fixer", req: plan.steelFixerReq || 0, avail: catsActive["Steel Fixer"] },
      { key: "Mason", req: plan.masonReq || 0, avail: catsActive["Mason"] },
      { key: "Concrete Worker", req: plan.concreteWorkerReq || 0, avail: catsActive["Concrete Worker"] },
      { key: "Supervisor", req: plan.supervisorReq || 0, avail: catsActive["Supervisor"] },
      { key: "Foreman", req: plan.foremanReq || 0, avail: catsActive["Foreman"] },
      { key: "Other", req: plan.otherReq || 0, avail: catsActive["Other"] },
    ];

    categoriesList.forEach(c => {
      totalRequiredVal += c.req;
      totalAvailableVal += c.avail;
      if (c.req > c.avail) {
        totalShortageVal += (c.req - c.avail);
      } else if (c.avail > c.req) {
        totalExcessVal += (c.avail - c.req);
      }
    });
  });
  
  const [newsData, setNewsData] = useState<{text: string, groundingChunks: any[]} | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoadingNews(true);
    fetch("/api/external-data/news")
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setNewsError(data.error);
        } else {
          setNewsData(data);
        }
      })
      .catch(err => {
        setNewsError("Failed to load industry news.");
      })
      .finally(() => setIsLoadingNews(false));
  }, []);

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalBilled = billings.reduce((sum, b) => sum + b.amount, 0);
  const totalReceived = clientPayments.reduce((sum, cp) => sum + cp.amountReceived, 0);

  const totalCredit = expensesLedger.reduce((sum, el) => sum + el.crBalance, 0);
  const totalSpent = expensesLedger.reduce((sum, el) => {
    return sum + (el.kharchi || 0) + (el.mess || 0) + (el.workerAdvance || 0) + (el.tiffin || 0) + (el.travel || 0) + (el.machineryMaterial || 0) + (el.workerPayment || 0) + (el.stationery || 0) + (el.others || 0);
  }, 0);
  const availableLedgerBalance = totalCredit - totalSpent;

  const SectionHeader = ({ title }: { title: string }) => (
    <div className="sap-header px-2 py-1 font-semibold text-[#000000] text-[11px] mb-2 flex justify-between border border-[#8c9ba8]">
      <span>{title}</span>
    </div>
  );

  const KeyValue = ({ label, value, isLink = false }: { label: string, value: React.ReactNode, isLink?: boolean }) => (
    <div className="flex mb-1">
      <div className="w-48 text-[#000000]">{label}:</div>
      <div className={`flex-1 ${isLink ? 'text-blue-600 underline cursor-pointer' : 'text-[#000000]'}`}>{value}</div>
    </div>
  );

  const BarChart = ({ label, used, total, colorClass }: { label: string, used: number, total: number, colorClass: string }) => {
    const percentage = total > 0 ? Math.min((used / total) * 100, 100) : 0;
    return (
      <div className="flex items-center mb-1">
        <div className="w-48">{label}:</div>
        <div className="flex-1 flex items-center">
          <div className="w-64 h-3 border border-gray-400 bg-white mr-2 flex">
            <div className={`h-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
          </div>
          <span className="text-gray-600">{used.toLocaleString()} / {total.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <motion.div 
      initial="hidden"
      animate="show"
      variants={{
        show: { transition: { staggerChildren: 0.1 } }
      }}
      className="text-[11px] flex space-x-4"
    >
      {/* Left Column */}
      <div className="flex-1 space-y-4">
        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="General Information" />
          <div className="px-2">
            <KeyValue label="Operational Status" value={<><span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-1"></span>All services started</>} />
            <KeyValue label="Start Time of First Started Service" value="17.10.2025 17:13:30" />
            <KeyValue label="Start Time of Latest Started Service" value={new Date().toLocaleString()} />
            <KeyValue label="Distributed System" value="Yes (2 hosts)" />
            <KeyValue label="Version" value="1.00.123.45678 (ERP_CORE)" isLink />
            <KeyValue label="Platform" value="SUSE Linux Enterprise Server 15" />
            <KeyValue label="Hardware Manufacturer" value="Hewlett-Packard" />
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Financial Overview (INR)" />
          <div className="px-2">
            <BarChart label="Total Budget Allocated" used={totalBudget * 0.6} total={totalBudget} colorClass="bg-[#a4d49d]" />
            <BarChart label="Total Billed Amount" used={totalBilled} total={totalBudget} colorClass="bg-[#a4d49d]" />
            <BarChart label="Total Received Amount" used={totalReceived} total={totalBilled} colorClass="bg-[#a4d49d]" />
            
            <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
              <KeyValue label="Available Cash Reserves (Current)" value={<strong className="text-emerald-700 text-[11px] font-mono">₹{availableLedgerBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>} />
              <KeyValue label="Total Received Credit (Owner)" value={<span className="font-mono text-green-700">₹{totalCredit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>} />
              <KeyValue label="Total Internal Spent (Expenses)" value={<span className="font-mono text-red-600">₹{totalSpent.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>} />
            </div>

            <div className="mt-2">
              <a href="#" className="text-blue-600 underline">More Information</a>
            </div>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Global Profit & Loss (Estimated Overall)" />
          <div className="px-2">
            <BarChart label="Total Client Cash Inflows" used={totalReceived} total={Math.max(totalReceived, totalSpent)} colorClass="bg-green-600" />
            <BarChart label="Total Operational Cash Outflows" used={totalSpent} total={Math.max(totalReceived, totalSpent)} colorClass="bg-red-600" />
            
            <div className="mt-2 pt-2 border-t border-dashed border-gray-300">
              <KeyValue 
                label="Global App P&L Statement" 
                value={<strong className={`text-[11px] font-mono ${totalReceived - totalSpent >= 0 ? 'text-green-700' : 'text-red-700'}`}>₹{(totalReceived - totalSpent).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>} 
              />
            </div>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Resource Allocation" />
          <div className="px-2">
            <BarChart label="Workers Deployed / Total Capacity" used={workers.length} total={100} colorClass="bg-[#a4d49d]" />
            <BarChart label="Active Projects" used={projects.length} total={10} colorClass="bg-[#a4d49d]" />
            <div className="mt-2">
              <a href="#" className="text-blue-600 underline">More Information</a>
            </div>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Machinery & Capital Equipment Allocation" />
          <div className="px-2">
            <BarChart label="Machinery Deployed (In Use)" used={assets.filter(a => a.status === 'In Use').length} total={assets.length || 1} colorClass="bg-blue-600" />
            <BarChart label="Machinery Under Repair" used={assets.filter(a => a.status === 'Under Maintenance').length} total={assets.length || 1} colorClass="bg-amber-500" />
            <BarChart label="Machinery Damaged" used={assets.filter(a => a.status === 'Damaged').length} total={assets.length || 1} colorClass="bg-red-650" />
            
            <div className="mt-2 pt-1.5 border-t border-dashed border-gray-300 flex justify-between text-[10px]">
              <div>Total Inventory Capacity: <strong className="font-mono text-[#0056b3]">{assets.length} items</strong></div>
              <div>Available Idle: <strong className="font-mono text-emerald-800">{assets.filter(a => a.status === 'Available').length} units</strong></div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Industry News & Regulatory Updates" />
          <div className="px-2">
            {isLoadingNews ? (
              <div className="flex items-center space-x-2 text-gray-500 py-2">
                <span className="w-4 h-4 border-2 border-gray-400 border-t-white rounded-full animate-spin"></span>
                <span>Fetching latest construction news...</span>
              </div>
            ) : newsError ? (
              <div className="text-red-600 py-2">{newsError}</div>
            ) : newsData ? (
              <div className="bg-white border border-[#8c9ba8] p-3 shadow-sm markdown-body text-[11px] prose-sm">
                <Markdown>{newsData.text}</Markdown>
                {newsData.groundingChunks?.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-dashed border-gray-300">
                    <strong className="text-gray-700">Sources:</strong>
                    <ul className="list-disc pl-4 mt-1 space-y-1">
                      {newsData.groundingChunks.filter(c => c.web?.uri && c.web?.title).map((chunk, idx) => (
                         <li key={idx}>
                           <a href={chunk.web.uri} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline hover:text-blue-800">
                             {chunk.web.title}
                           </a>
                         </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </motion.div>
      </div>

      {/* Right Column */}
      <div className="flex-1 space-y-4">
        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Labour Planning Summary" />
          <div className="px-2 pb-2 bg-white border border-[#8c9ba8] p-3 shadow-sm rounded-sm">
            <div className="grid grid-cols-2 gap-2 mb-2 font-mono">
              <div className="bg-slate-50 border border-slate-300 p-2 rounded text-center">
                <span className="text-gray-500 block uppercase text-[8px] font-bold">Total Required</span>
                <span className="text-sm font-extrabold text-blue-900">{totalRequiredVal}</span>
              </div>
              <div className="bg-slate-50 border border-slate-300 p-2 rounded text-center">
                <span className="text-gray-500 block uppercase text-[8px] font-bold font-sans">Total Available</span>
                <span className="text-sm font-extrabold text-teal-800">{totalAvailableVal}</span>
              </div>
              <div className="bg-slate-50 border border-slate-300 p-2 rounded text-center">
                <span className="text-gray-500 block uppercase text-[8px] font-bold font-sans">Total Shortage</span>
                <span className={`text-sm font-extrabold ${totalShortageVal > 0 ? 'text-red-700' : 'text-gray-500'}`}>{totalShortageVal}</span>
              </div>
              <div className="bg-slate-50 border border-slate-300 p-2 rounded text-center">
                <span className="text-gray-500 block uppercase text-[8px] font-bold font-sans">Total Excess</span>
                <span className="text-sm font-extrabold text-emerald-700">{totalExcessVal}</span>
              </div>
            </div>
            
            <div className="border border-amber-200 bg-amber-50 p-2 rounded flex justify-between items-center text-[10px] sm:text-[9px]">
              <span className="font-semibold text-amber-850">Upcoming Requirements (Next 30 Days):</span>
              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">{upcomingPlanningCount} plans</span>
            </div>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Current Alerts and Messages" />
          <div className="px-2 space-y-1">
            <div className="flex items-center text-red-600"><span className="w-3 h-3 bg-red-600 text-white text-[8px] flex items-center justify-center font-bold mr-2 rounded-sm">!</span> 2 alerts with HIGH priority</div>
            <div className="flex items-center text-yellow-600"><span className="w-3 h-3 bg-yellow-500 text-white text-[8px] flex items-center justify-center font-bold mr-2 rounded-sm">!</span> 5 alerts with MEDIUM priority</div>
            <div className="flex items-center text-gray-600"><span className="w-3 h-3 bg-gray-400 text-white text-[8px] flex items-center justify-center font-bold mr-2 rounded-sm">i</span> 12 alerts with LOW priority</div>
            <div className="mt-2">
              <a href="#" className="text-blue-600 underline">Show Alerts</a>
            </div>
            <div className="mt-4 flex items-center text-yellow-600">
              <span className="w-3 h-3 bg-yellow-500 text-white text-[8px] flex items-center justify-center font-bold mr-2 rounded-sm">!</span> There are configured and/or active traces
            </div>
            <div>
              <a href="#" className="text-blue-600 underline">Show traces</a>
            </div>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Site Distribution" />
          <div className="px-2">
            <table className="w-full border-collapse border border-[#8c9ba8] bg-white">
              <thead className="sap-header">
                <tr>
                  <th className="border border-[#8c9ba8] px-2 py-1 text-left font-normal">Project Name</th>
                  <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Workers</th>
                  <th className="border border-[#8c9ba8] px-2 py-1 text-right font-normal">Budget</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p, idx) => (
                  <motion.tr initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }} key={p.id} className="hover:bg-[#e6f2ff] cursor-default">
                    <td className="border border-[#8c9ba8] px-2 py-1">{p.name}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right">{workers.filter(w => w.projectId === p.id).length}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right">{p.budget.toLocaleString()}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 15 }, show: { opacity: 1, y: 0 } }}>
          <SectionHeader title="Project Health (Collection Efficiency)" />
          <div className="px-2 space-y-3">
            {projects.map(p => {
              const billed = billings.filter(b => b.projectId === p.id).reduce((sum, b) => sum + b.amount, 0);
              const received = clientPayments.filter(cp => cp.projectId === p.id).reduce((sum, cp) => sum + cp.amountReceived, 0);
              const ratio = billed > 0 ? (received / billed) * 100 : 0;
              
              // Determine status text & color matching classical SAP style
              let statusText = "No Billings";
              let colorClass = "bg-gray-400"; // Neutral color if no bills
              let textClass = "text-gray-500";
              if (billed > 0) {
                if (ratio >= 85) {
                  statusText = "Excellent Recovery";
                  colorClass = "bg-emerald-600";
                  textClass = "text-emerald-750 font-bold";
                } else if (ratio >= 50) {
                  statusText = "Moderate Recovery";
                  colorClass = "bg-amber-500";
                  textClass = "text-amber-605 font-bold";
                } else {
                  statusText = "Critical Outstanding";
                  colorClass = "bg-red-650";
                  textClass = "text-red-700 font-bold";
                }
              }

              return (
                <div key={p.id} className="border border-[#8c9ba8] bg-white p-2.5 space-y-2 shadow-sm">
                  <div className="flex justify-between items-center font-bold text-gray-800">
                    <span className="text-[11px] uppercase tracking-wide">{p.name}</span>
                    <span className={`text-[9.5px] font-semibold font-mono ${textClass} border border-current px-1 rounded-sm bg-gray-50`}>
                      {statusText} {billed > 0 ? `(${ratio.toFixed(1)}%)` : ''}
                    </span>
                  </div>
                  
                  {/* Detailed statistics */}
                  <div className="flex justify-between text-[9px] text-gray-600 font-mono">
                    <span>Received: <strong className="text-gray-900 font-semibold">₹{received.toLocaleString('en-IN')}</strong></span>
                    <span>Billed Ledger: <strong className="text-gray-900 font-semibold">₹{billed.toLocaleString('en-IN')}</strong></span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-3 border border-gray-400 bg-gray-100 flex overflow-hidden">
                    <div 
                      className={`h-full ${colorClass} transition-all duration-500`} 
                      style={{ width: `${billed > 0 ? Math.min(ratio, 100) : 0}%` }}
                    />
                  </div>
                  
                  {/* Outstanding Debt display */}
                  {billed > received && (
                    <div className="text-[9px] text-red-700 flex justify-between items-center bg-red-50 px-1 py-0.5 border border-red-200">
                      <span>Outstanding Debt:</span>
                      <span className="font-mono font-bold">₹{(billed - received).toLocaleString('en-IN')}</span>
                    </div>
                  )}
                  {billed > 0 && received >= billed && (
                    <div className="text-[9px] text-emerald-800 flex justify-between items-center font-medium bg-emerald-50 px-1 py-0.5 border border-emerald-200">
                      <span>100% Billing Cleared</span>
                      <span>✓ Paid</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
};
