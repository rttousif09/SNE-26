import React from 'react';
import { useAppContext } from '../store';

export const Dashboard: React.FC = () => {
  const { projects, workers, billings, clientPayments } = useAppContext();

  const totalBudget = projects.reduce((sum, p) => sum + p.budget, 0);
  const totalBilled = billings.reduce((sum, b) => sum + b.amount, 0);
  const totalReceived = clientPayments.reduce((sum, cp) => sum + cp.amountReceived, 0);

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
    <div className="text-[11px] flex space-x-4">
      {/* Left Column */}
      <div className="flex-1 space-y-4">
        <div>
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
        </div>

        <div>
          <SectionHeader title="Financial Overview (INR)" />
          <div className="px-2">
            <BarChart label="Total Budget Allocated" used={totalBudget * 0.6} total={totalBudget} colorClass="bg-[#a4d49d]" />
            <BarChart label="Total Billed Amount" used={totalBilled} total={totalBudget} colorClass="bg-[#a4d49d]" />
            <BarChart label="Total Received Amount" used={totalReceived} total={totalBilled} colorClass="bg-[#a4d49d]" />
            <div className="mt-2">
              <a href="#" className="text-blue-600 underline">More Information</a>
            </div>
          </div>
        </div>

        <div>
          <SectionHeader title="Resource Allocation" />
          <div className="px-2">
            <BarChart label="Workers Deployed / Total Capacity" used={workers.length} total={100} colorClass="bg-[#a4d49d]" />
            <BarChart label="Active Projects" used={projects.length} total={10} colorClass="bg-[#a4d49d]" />
            <div className="mt-2">
              <a href="#" className="text-blue-600 underline">More Information</a>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="flex-1 space-y-4">
        <div>
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
        </div>

        <div>
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
                {projects.map(p => (
                  <tr key={p.id} className="hover:bg-[#e6f2ff] cursor-default">
                    <td className="border border-[#8c9ba8] px-2 py-1">{p.name}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right">{workers.filter(w => w.projectId === p.id).length}</td>
                    <td className="border border-[#8c9ba8] px-2 py-1 text-right">{p.budget.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
