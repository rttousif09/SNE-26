import React, { useState, useRef, useEffect } from 'react';
import { Play, Square, Pause, Save, FolderOpen, File, ArrowLeft, ArrowRight, Building2, User, LogOut, ChevronDown } from 'lucide-react';
import { SNLogo } from './SNLogo';

interface TopBarProps {
  user: { username: string; name: string } | null;
  onLogout: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ user, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="flex flex-col bg-[#eef2f6] border-b border-[#8c9ba8] select-none text-[11px]">
      {/* Brand & Profile Section */}
      <div className="bg-[#002f6c] text-white px-3 py-1 flex items-center justify-between border-b border-[#8c9ba8] shadow-sm">
        <div className="flex items-center space-x-2">
          <SNLogo size={22} className="text-white hover:scale-105 transition-transform" />
          <span className="font-mono text-xs font-black uppercase tracking-widest text-white">SN ENTERPRISE</span>
          <span className="text-[9px] text-blue-200 bg-[#001f4d] px-1.5 py-0.5 rounded border border-blue-900 font-mono">ERP_PRD</span>
        </div>
        
        {/* Profile Card / Dropdown Menu */}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center space-x-1.5 hover:bg-[#001f4d] px-2 py-1 rounded transition duration-150 cursor-pointer text-white"
            >
              <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center font-mono text-[9px] font-bold text-white uppercase border border-blue-300 shadow-sm shrink-0">
                {user.name.charAt(0)}
              </div>
              <span className="font-semibold text-[10px] hover:underline text-white select-none pr-0.5">{user.name}</span>
              <ChevronDown size={11} className={`transform transition-transform text-blue-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-[#eef2f6] border border-[#8c9ba8] shadow-2xl rounded-sm z-50 text-gray-800 animate-fade-in">
                <div className="bg-gradient-to-r from-[#0056b3] to-[#002f6c] text-white px-2 py-1 flex items-center select-none">
                  <span className="font-bold text-[9px] uppercase tracking-wide">System Access Profile</span>
                </div>
                <div className="p-3 bg-white border border-[#8c9ba8] border-t-0 text-[10px] space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className="w-8 h-8 bg-[#0056b3] text-white rounded-full flex items-center justify-center font-mono text-xs font-semibold uppercase shrink-0">
                      {user.name.split(' ').map((n: any) => n.charAt(0)).join('')}
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[8px] uppercase">User Full Name</span>
                      <span className="font-bold text-gray-900 text-[11px]">{user.name}</span>
                    </div>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px] uppercase">User Access ID</span>
                    <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-800 text-[10px] font-semibold border border-gray-200 inline-block">{user.username}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px] uppercase">Access Role</span>
                    <span className="text-gray-700 font-semibold">
                      {user.username === 'saddamsne' ? 'Owner' : 'Managing Director'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[8px] uppercase">Connection Status</span>
                    <span className="text-green-700 font-bold flex items-center mt-0.5 text-[10px]">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full inline-block mr-1 animate-pulse"></span>
                      Authenticated Mode
                    </span>
                  </div>
                  <div className="pt-2 border-t border-gray-150 flex items-center">
                    <button 
                      onClick={() => {
                        setIsOpen(false);
                        onLogout();
                      }}
                      className="sap-btn flex items-center space-x-1.5 text-xs text-red-700 font-bold w-full uppercase py-1 px-3 justify-center text-center bg-red-50 hover:bg-red-100 border-red-300 leading-none"
                    >
                      <LogOut size={11} className="text-red-700 shrink-0" />
                      <span>Log Out System</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

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
