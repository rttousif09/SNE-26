import React from 'react';
import { Play, Square, Pause, Save, FolderOpen, File, ArrowLeft, ArrowRight } from 'lucide-react';

export const TopBar: React.FC = () => {
  return (
    <div className="flex flex-col bg-[#eef2f6] border-b border-[#8c9ba8] select-none">
      {/* Menu Bar */}
      <div className="flex items-center px-2 py-0.5 text-[11px] space-x-3">
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">File</span>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Edit</span>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Navigate</span>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Project</span>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Window</span>
        <span className="hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent px-1 cursor-default">Help</span>
      </div>
      {/* Tool Bar */}
      <div className="flex items-center px-1 py-1 space-x-1 border-t border-white">
        <div className="flex items-center space-x-1 border-r border-[#8c9ba8] pr-1 mr-1">
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><File size={14} className="text-[#0056b3]" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><FolderOpen size={14} className="text-yellow-500" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Save size={14} className="text-[#0056b3]" /></button>
        </div>
        <div className="flex items-center space-x-1 border-r border-[#8c9ba8] pr-1 mr-1">
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><ArrowLeft size={14} className="text-green-700" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><ArrowRight size={14} className="text-green-700" /></button>
        </div>
        <div className="flex items-center space-x-1">
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Play size={14} className="text-green-600" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Pause size={14} className="text-yellow-600" /></button>
          <button className="p-1 hover:bg-[#d9e4f1] hover:border-[#8c9ba8] border border-transparent rounded-sm"><Square size={14} className="text-red-600" /></button>
        </div>
      </div>
    </div>
  );
};
