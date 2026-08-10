import React, { useState, useEffect, useRef } from 'react';
import { SAPSelect } from '../components/SAPSelect';
import { 
  Folder, FolderOpen, FileText, Search, Grid, List, Plus, 
  Trash2, Download, Eye, Link2, Clock, CheckCircle, AlertTriangle, 
  XCircle, Archive, Shield, FileSpreadsheet, Image, FileUp, 
  Calendar, Check, Copy, Share2, Info, ChevronRight, ChevronDown, BarChart2
} from 'lucide-react';
import { useAppContext } from '../store';
import { DMSDocument, DocumentRevision, DocumentLink, DMSAuditLog } from '../types';

interface FolderNode {
  name: string;
  category: string;
  docType: string;
  icon?: React.ReactNode;
  children?: FolderNode[];
}

export const DMSPage: React.FC = () => {
  const { projects, workers, staff, billings, clientPayments, boqs, user } = useAppContext();
  
  // Database state
  const [documents, setDocuments] = useState<DMSDocument[]>([]);
  const [auditLogs, setAuditLogs] = useState<DMSAuditLog[]>([]);
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Navigation state
  const [currentFolder, setCurrentFolder] = useState<{ category: string; docType: string | null } | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    'Projects': true,
    'Workers': false,
    'Subcontractors': false,
    'Company Documents': false
  });
  
  // Search & Filter criteria
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterExpiry, setFilterExpiry] = useState<'all' | 'expiring-30' | 'expiring-15' | 'expired'>('all');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // View mode & modals
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<DMSDocument | null>(null);
  const [previewZoom, setPreviewZoom] = useState(100);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'documents' | 'audits'>('dashboard');

  // New Document form state
  const [formProject, setFormProject] = useState('');
  const [formCategory, setFormCategory] = useState<DMSDocument['category']>('Project Documents');
  const [formDocType, setFormDocType] = useState('Drawings');
  const [formFileName, setFormFileName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formTags, setFormTags] = useState('');
  const [formExpiryDate, setFormExpiryDate] = useState('');
  const [formStatus, setFormStatus] = useState<DMSDocument['status']>('Approved');
  
  // File uploads
  const [uploadFiles, setUploadFiles] = useState<{ name: string; type: string; size: number; base64: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  // Document Linking form state
  const [linkEntityType, setLinkEntityType] = useState<'project' | 'worker' | 'subcontractor' | 'bill' | 'payment' | 'boq'>('project');
  const [linkEntityId, setLinkEntityId] = useState('');
  const [customLinkDetails, setCustomLinkDetails] = useState('');

  // Revisions / New Version state
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [versionDescription, setVersionDescription] = useState('');
  const [versionFile, setVersionFile] = useState<{ name: string; type: string; size: number; base64: string } | null>(null);

  // User role details
  const currentRole = user?.role || 'Super Admin';
  
  // Role Permission definitions
  const permissions = {
    view: true, // Everyone can view
    upload: currentRole !== 'Viewer',
    edit: ['Super Admin', 'Admin', 'Accounts', 'Billing Engineer'].includes(currentRole),
    delete: ['Super Admin', 'Admin'].includes(currentRole),
    download: currentRole !== 'Viewer',
    approve: ['Super Admin', 'Admin'].includes(currentRole)
  };

  // Predefined folder structures
  const folderTree: FolderNode[] = [
    {
      name: 'Projects',
      category: 'Project Documents',
      docType: '',
      children: [
        { name: 'Drawings', category: 'Project Documents', docType: 'Drawings' },
        { name: 'BOQ', category: 'Project Documents', docType: 'BOQ' },
        { name: 'Work Orders', category: 'Project Documents', docType: 'Work Orders' },
        { name: 'Agreements', category: 'Project Documents', docType: 'Agreements' },
        { name: 'Billing', category: 'Project Documents', docType: 'Client Bills' },
        { name: 'Payments', category: 'Project Documents', docType: 'Client Payments' },
        { name: 'Site Photos', category: 'Project Documents', docType: 'Site Photos' },
        { name: 'Completion Documents', category: 'Project Documents', docType: 'Completion Documents' }
      ]
    },
    {
      name: 'Workers',
      category: 'Worker Documents',
      docType: '',
      children: [
        { name: 'Aadhaar', category: 'Worker Documents', docType: 'Aadhaar' },
        { name: 'PAN', category: 'Worker Documents', docType: 'PAN' },
        { name: 'Bank Documents', category: 'Worker Documents', docType: 'Bank Details' },
        { name: 'Labour Card', category: 'Worker Documents', docType: 'Labour Card' },
        { name: 'Other Documents', category: 'Worker Documents', docType: 'Other Documents' }
      ]
    },
    {
      name: 'Subcontractors',
      category: 'Subcontractor Documents',
      docType: '',
      children: [
        { name: 'Work Orders', category: 'Subcontractor Documents', docType: 'Work Orders' },
        { name: 'Agreements', category: 'Subcontractor Documents', docType: 'Agreements' },
        { name: 'PAN', category: 'Subcontractor Documents', docType: 'PAN' },
        { name: 'GST Certificate', category: 'Subcontractor Documents', docType: 'GST Certificate' },
        { name: 'Bills', category: 'Subcontractor Documents', docType: 'Bills' },
        { name: 'Payments', category: 'Subcontractor Documents', docType: 'Payment Documents' },
        { name: 'Other Documents', category: 'Subcontractor Documents', docType: 'Other Documents' }
      ]
    },
    {
      name: 'Company Documents',
      category: 'Company Documents',
      docType: '',
      children: [
        { name: 'GST Certificates', category: 'Company Documents', docType: 'GST Certificate' },
        { name: 'PAN Cards', category: 'Company Documents', docType: 'PAN Card' },
        { name: 'Registrations', category: 'Company Documents', docType: 'Registrations' },
        { name: 'Insurance Policies', category: 'Company Documents', docType: 'Insurance' },
        { name: 'Licenses', category: 'Company Documents', docType: 'Licenses' },
        { name: 'Other Documents', category: 'Company Documents', docType: 'Other Documents' }
      ]
    }
  ];

  // Fetch documents, audits, and subcontractor directory at startup
  const fetchAllDMSData = async () => {
    setIsLoading(true);
    try {
      const [docsRes, logsRes, subsRes] = await Promise.all([
        fetch('/api/dms/documents').then(r => r.json()),
        fetch('/api/dms/audit-logs').then(r => r.json()).catch(() => []),
        fetch('/api/subcontractors').then(r => r.json()).catch(() => [])
      ]);
      
      setDocuments(docsRes || []);
      setAuditLogs(logsRes || []);
      setSubcontractors(subsRes || []);
    } catch (e) {
      console.error('Error fetching DMS records:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllDMSData();
  }, []);

  // Set default document types when category changes in Upload Form
  useEffect(() => {
    if (formCategory === 'Project Documents') setFormDocType('Drawings');
    else if (formCategory === 'Worker Documents') setFormDocType('Aadhaar');
    else if (formCategory === 'Subcontractor Documents') setFormDocType('Work Orders');
    else if (formCategory === 'Company Documents') setFormDocType('GST Certificate');
  }, [formCategory]);

  // Handle Toast dispatch
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    window.dispatchEvent(new CustomEvent('show-success-toast', { detail: { message: `[DMS] ${message}` } }));
  };

  // Helper: File Base64 encoder
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (filesList: FileList) => {
    const loadedFiles: typeof uploadFiles = [];
    
    Array.from(filesList).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        loadedFiles.push({
          name: file.name,
          type: file.type || file.name.split('.').pop() || 'unknown',
          size: file.size,
          base64: reader.result as string
        });
        
        if (loadedFiles.length === filesList.length) {
          setUploadFiles(prev => [...prev, ...loadedFiles]);
          if (uploadFiles.length === 0 && loadedFiles.length === 1) {
            // Pre-fill file name if uploading single file
            setFormFileName(loadedFiles[0].name.replace(/\.[^/.]+$/, ""));
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFiles(e.dataTransfer.files);
    }
  };

  // Create document entry
  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!permissions.upload) {
      showToast("Access Denied: Inadequate permissions to upload files.", "error");
      return;
    }
    if (uploadFiles.length === 0) {
      showToast("Please choose or drag at least one file to upload.", "error");
      return;
    }

    try {
      // Loop for multi-file uploads (create individual records or link them)
      for (let i = 0; i < uploadFiles.length; i++) {
        const fileObj = uploadFiles[i];
        const docId = 'doc_' + Math.random().toString(36).substring(2, 11);
        
        const fileTitle = uploadFiles.length > 1 ? fileObj.name.replace(/\.[^/.]+$/, "") : (formFileName || fileObj.name.replace(/\.[^/.]+$/, ""));
        
        const payload: Partial<DMSDocument> = {
          id: docId,
          projectId: formProject || undefined,
          category: formCategory,
          docType: formDocType,
          fileName: fileTitle,
          description: formDescription,
          tags: JSON.stringify(formTags.split(',').map(t => t.trim()).filter(Boolean)),
          uploadDate: new Date().toISOString().split('T')[0],
          expiryDate: formExpiryDate || undefined,
          attachmentData: fileObj.base64,
          attachmentName: fileObj.name,
          attachmentType: fileObj.type,
          fileSize: fileObj.size,
          version: 0,
          revisions: JSON.stringify([]),
          status: formStatus,
          linkedEntity: JSON.stringify([]),
          createdBy: user?.username || 'Admin',
          createdDate: new Date().toISOString()
        };

        const res = await fetch('/api/dms/documents', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-User-Username': user?.username || 'Admin'
          },
          body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("API upload returned error code");
      }

      showToast(`Successfully uploaded ${uploadFiles.length} file(s).`);
      setIsUploadOpen(false);
      resetUploadForm();
      fetchAllDMSData();
    } catch (err: any) {
      showToast(`Upload failed: ${err.message}`, "error");
    }
  };

  const resetUploadForm = () => {
    setFormProject('');
    setFormCategory('Project Documents');
    setFormDocType('Drawings');
    setFormFileName('');
    setFormDescription('');
    setFormTags('');
    setFormExpiryDate('');
    setFormStatus('Approved');
    setUploadFiles([]);
  };

  // Add a new revision (version control)
  const handleAddVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocument || !versionFile) return;

    try {
      const oldRevisions: DocumentRevision[] = JSON.parse(selectedDocument.revisions || '[]');
      
      // Save current selected file as a historical revision
      const newRev: DocumentRevision = {
        version: selectedDocument.version,
        fileName: selectedDocument.fileName,
        uploadDate: selectedDocument.uploadDate,
        uploadedBy: selectedDocument.createdBy || 'Admin',
        attachmentName: selectedDocument.attachmentName,
        attachmentType: selectedDocument.attachmentType,
        attachmentData: selectedDocument.attachmentData,
        description: selectedDocument.description
      };

      const updatedRevisions = [newRev, ...oldRevisions];
      const nextVersion = selectedDocument.version + 1;

      const payload = {
        ...selectedDocument,
        version: nextVersion,
        fileName: versionFile.name.replace(/\.[^/.]+$/, ""),
        uploadDate: new Date().toISOString().split('T')[0],
        attachmentName: versionFile.name,
        attachmentType: versionFile.type,
        attachmentData: versionFile.base64,
        fileSize: versionFile.size,
        description: versionDescription || selectedDocument.description,
        revisions: JSON.stringify(updatedRevisions)
      };

      const res = await fetch(`/api/dms/documents/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to post new version to server");

      showToast(`New revision Rev-${nextVersion} registered successfully.`);
      setIsVersionModalOpen(false);
      setVersionFile(null);
      setVersionDescription('');
      
      // Refresh current preview
      setSelectedDocument(payload as any);
      fetchAllDMSData();
    } catch (err: any) {
      showToast(`Version update failed: ${err.message}`, "error");
    }
  };

  // Revert to a past version
  const handleRevertVersion = async (rev: DocumentRevision) => {
    if (!selectedDocument || !permissions.edit) return;

    if (!confirm(`Are you sure you want to restore past version (Rev-${rev.version})? This will create a new current revision.`)) return;

    try {
      const oldRevisions: DocumentRevision[] = JSON.parse(selectedDocument.revisions || '[]');
      
      // Archive current version
      const currentRev: DocumentRevision = {
        version: selectedDocument.version,
        fileName: selectedDocument.fileName,
        uploadDate: selectedDocument.uploadDate,
        uploadedBy: selectedDocument.createdBy || 'Admin',
        attachmentName: selectedDocument.attachmentName,
        attachmentType: selectedDocument.attachmentType,
        attachmentData: selectedDocument.attachmentData,
        description: selectedDocument.description
      };

      const updatedRevisions = [currentRev, ...oldRevisions];
      const nextVersion = selectedDocument.version + 1;

      const payload = {
        ...selectedDocument,
        version: nextVersion,
        fileName: rev.fileName,
        attachmentName: rev.attachmentName,
        attachmentType: rev.attachmentType,
        attachmentData: rev.attachmentData,
        description: `Restored back to Rev-${rev.version}: ${rev.description || ''}`,
        revisions: JSON.stringify(updatedRevisions)
      };

      const res = await fetch(`/api/dms/documents/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Error restoring version");

      showToast(`Document successfully reverted to past version.`);
      setSelectedDocument(payload as any);
      fetchAllDMSData();
    } catch (err: any) {
      showToast(`Error reverting: ${err.message}`, "error");
    }
  };

  // Document Linking Logic
  const handleAddLink = async () => {
    if (!selectedDocument || !linkEntityId) return;

    try {
      const currentLinks: DocumentLink[] = JSON.parse(selectedDocument.linkedEntity || '[]');
      
      // Determine label based on type
      let label = '';
      if (linkEntityType === 'project') {
        const proj = projects.find(p => p.id === linkEntityId);
        label = proj ? proj.name : linkEntityId;
      } else if (linkEntityType === 'worker') {
        const wrk = workers.find(w => w.id === linkEntityId);
        label = wrk ? wrk.name : linkEntityId;
      } else if (linkEntityType === 'subcontractor') {
        const sub = subcontractors.find(s => s.id === linkEntityId);
        label = sub ? `${sub.name} (${sub.firmName || ''})` : linkEntityId;
      } else if (linkEntityType === 'bill') {
        const b = billings.find(bl => bl.id === linkEntityId);
        label = b ? `Client Bill ${b.billNo}` : linkEntityId;
      } else if (linkEntityType === 'payment') {
        const p = clientPayments.find(pay => pay.id === linkEntityId);
        label = p ? `Receipt ₹${p.amountReceived} (${p.date})` : linkEntityId;
      } else if (linkEntityType === 'boq') {
        const q = boqs.find(bq => bq.id === linkEntityId);
        label = q ? `BOQ ${q.boqNo}` : linkEntityId;
      }

      if (customLinkDetails) {
        label += ` - ${customLinkDetails}`;
      }

      // Avoid duplicates
      if (currentLinks.some(l => l.entityType === linkEntityType && l.entityId === linkEntityId)) {
        showToast("Entity already linked.", "error");
        return;
      }

      const newLink: DocumentLink = {
        entityType: linkEntityType,
        entityId: linkEntityId,
        entityLabel: label
      };

      const updatedLinks = [...currentLinks, newLink];
      const payload = {
        ...selectedDocument,
        linkedEntity: JSON.stringify(updatedLinks)
      };

      const res = await fetch(`/api/dms/documents/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Server rejected link request");

      showToast("Document linked successfully.");
      setSelectedDocument(payload as any);
      setLinkEntityId('');
      setCustomLinkDetails('');
      fetchAllDMSData();
    } catch (err: any) {
      showToast(`Failed to add link: ${err.message}`, "error");
    }
  };

  const handleRemoveLink = async (indexToRemove: number) => {
    if (!selectedDocument) return;

    try {
      const currentLinks: DocumentLink[] = JSON.parse(selectedDocument.linkedEntity || '[]');
      const updatedLinks = currentLinks.filter((_, idx) => idx !== indexToRemove);

      const payload = {
        ...selectedDocument,
        linkedEntity: JSON.stringify(updatedLinks)
      };

      const res = await fetch(`/api/dms/documents/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Server error removing link");

      showToast("Link removed successfully.");
      setSelectedDocument(payload as any);
      fetchAllDMSData();
    } catch (e) {
      showToast("Failed to remove link.", "error");
    }
  };

  // Change Document Status (Approval Workflow)
  const handleStatusChange = async (newStatus: DMSDocument['status'], remarks: string) => {
    if (!selectedDocument || !permissions.approve) return;

    try {
      const payload = {
        ...selectedDocument,
        status: newStatus,
        approver: user?.username || 'Admin',
        approvalDate: new Date().toISOString().split('T')[0],
        approvalRemarks: remarks || selectedDocument.approvalRemarks
      };

      const res = await fetch(`/api/dms/documents/${selectedDocument.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to change document state");

      // Audit Log
      const auditId = "dms_aud_" + Math.random().toString(36).substring(2, 11);
      await fetch('/api/dms/audit-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: auditId,
          timestamp: new Date().toISOString(),
          username: user?.username || 'Admin',
          actionType: newStatus === 'Approved' ? 'APPROVE' : newStatus === 'Rejected' ? 'REJECT' : 'ARCHIVE',
          recordId: selectedDocument.id,
          details: `Status of document "${selectedDocument.fileName}" updated to ${newStatus}. Remarks: ${remarks}`
        })
      });

      showToast(`Document status updated to ${newStatus}.`);
      setSelectedDocument(payload as any);
      fetchAllDMSData();
    } catch (err: any) {
      showToast(`Status update failed: ${err.message}`, "error");
    }
  };

  // Delete document
  const handleDeleteDocument = async (id: string, fileName: string) => {
    if (!permissions.delete) {
      showToast("Forbidden: Only Administrators can delete files.", "error");
      return;
    }

    if (!confirm(`Are you absolutely sure you want to permanently delete document "${fileName}"? This operation is irreversible.`)) return;

    try {
      const res = await fetch(`/api/dms/documents/${id}`, {
        method: 'DELETE',
        headers: { 'X-User-Username': user?.username || 'Admin' }
      });

      if (!res.ok) throw new Error("Server rejected deletion request");

      showToast("Document deleted permanently.");
      if (selectedDocument?.id === id) {
        setSelectedDocument(null);
      }
      fetchAllDMSData();
    } catch (e: any) {
      showToast(`Delete failed: ${e.message}`, "error");
    }
  };

  // Archive old/obsolete document
  const handleArchiveDocument = async (doc: DMSDocument) => {
    try {
      const payload = {
        ...doc,
        status: 'Archived' as const
      };
      const res = await fetch(`/api/dms/documents/${doc.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Username': user?.username || 'Admin'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error();

      showToast("Document archived successfully.");
      if (selectedDocument?.id === doc.id) {
        setSelectedDocument(payload as any);
      }
      fetchAllDMSData();
    } catch (e) {
      showToast("Failed to archive document.", "error");
    }
  };

  // Internal link copying for ERP Sharing
  const handleShareLink = (doc: DMSDocument) => {
    const internalUrl = `${window.location.origin}/#dms?id=${doc.id}`;
    navigator.clipboard.writeText(internalUrl);
    
    // Log Download/Share Audit
    const auditId = "dms_aud_" + Math.random().toString(36).substring(2, 11);
    fetch('/api/dms/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: auditId,
        timestamp: new Date().toISOString(),
        username: user?.username || 'Admin',
        actionType: 'SHARE',
        recordId: doc.id,
        details: `Generated internal shareable ERP link for "${doc.fileName}"`
      })
    });

    showToast("Shareable internal ERP link copied to clipboard.");
  };

  // Download file logger
  const triggerDownloadLog = (doc: DMSDocument) => {
    const auditId = "dms_aud_" + Math.random().toString(36).substring(2, 11);
    fetch('/api/dms/audit-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: auditId,
        timestamp: new Date().toISOString(),
        username: user?.username || 'Admin',
        actionType: 'DOWNLOAD',
        recordId: doc.id,
        details: `Downloaded file content: "${doc.attachmentName}" (Rev-${doc.version})`
      })
    });
  };

  // Metric Computations
  const getDMSMetrics = () => {
    const totalDocs = documents.length;
    const now = new Date();
    const currentMonthStr = now.toISOString().substring(0, 7); // "YYYY-MM"
    
    const docsThisMonth = documents.filter(d => d.uploadDate.startsWith(currentMonthStr)).length;
    
    // Expiry tracked
    let expiring30Count = 0;
    let expiring15Count = 0;
    let expiredCount = 0;
    
    documents.forEach(doc => {
      if (doc.expiryDate) {
        const expiry = new Date(doc.expiryDate);
        const diffTime = expiry.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) {
          expiredCount++;
        } else if (diffDays <= 15) {
          expiring15Count++;
        } else if (diffDays <= 30) {
          expiring30Count++;
        }
      }
    });

    // Storage metrics
    const totalBytes = documents.reduce((acc, d) => acc + (d.fileSize || 0), 0);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(2);
    
    // Categories breakdown size
    const categoryBreakdown: Record<string, number> = {
      'Project Documents': 0,
      'Worker Documents': 0,
      'Subcontractor Documents': 0,
      'Company Documents': 0
    };
    
    documents.forEach(d => {
      if (categoryBreakdown[d.category] !== undefined) {
        categoryBreakdown[d.category] += d.fileSize || 0;
      }
    });

    // Largest files
    const largestFiles = [...documents]
      .sort((a, b) => b.fileSize - a.fileSize)
      .slice(0, 5);

    return {
      totalDocs,
      docsThisMonth,
      expiring30Count,
      expiring15Count,
      expiredCount,
      totalMB,
      categoryBreakdown,
      largestFiles
    };
  };

  const metrics = getDMSMetrics();

  // Filter Logic
  const getFilteredDocuments = () => {
    return documents.filter(doc => {
      // 1. Folder structure check
      if (currentFolder) {
        if (doc.category !== currentFolder.category) return false;
        if (currentFolder.docType && doc.docType !== currentFolder.docType) return false;
      }

      // 2. Search query check
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const tagsArr = doc.tags ? JSON.parse(doc.tags) : [];
        const matchesName = doc.fileName.toLowerCase().includes(query);
        const matchesDesc = doc.description?.toLowerCase().includes(query);
        const matchesDocType = doc.docType.toLowerCase().includes(query);
        const matchesTags = tagsArr.some((t: string) => t.toLowerCase().includes(query));
        const matchesCreator = doc.createdBy?.toLowerCase().includes(query);
        
        if (!matchesName && !matchesDesc && !matchesDocType && !matchesTags && !matchesCreator) {
          return false;
        }
      }

      // 3. Project Filter
      if (filterProject && doc.projectId !== filterProject) {
        return false;
      }

      // 4. Status Filter
      if (filterStatus !== 'all' && doc.status !== filterStatus) {
        return false;
      }

      // 5. Expiry state Filter
      if (doc.expiryDate && filterExpiry !== 'all') {
        const expiry = new Date(doc.expiryDate);
        const diffDays = Math.ceil((expiry.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
        if (filterExpiry === 'expired' && diffDays >= 0) return false;
        if (filterExpiry === 'expiring-15' && (diffDays < 0 || diffDays > 15)) return false;
        if (filterExpiry === 'expiring-30' && (diffDays < 0 || diffDays > 30)) return false;
      } else if (!doc.expiryDate && filterExpiry !== 'all') {
        return false;
      }

      // 6. Date Range filter
      if (filterDateFrom && doc.uploadDate < filterDateFrom) return false;
      if (filterDateTo && doc.uploadDate > filterDateTo) return false;

      return true;
    });
  };

  const filteredDocs = getFilteredDocuments();

  // Tree nodes toggler
  const toggleNode = (nodeName: string) => {
    setExpandedNodes(prev => ({ ...prev, [nodeName]: !prev[nodeName] }));
  };

  // Render file size helper
  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Preview content based on attachment mime-type
  const renderDocumentPreview = (doc: DMSDocument) => {
    if (!doc.attachmentData) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-[#8c9ba8] border border-dashed border-[#8c9ba8]/40 rounded-lg">
          <Info size={32} className="mb-2" />
          <p className="text-center font-medium">No Attachment Available</p>
          <p className="text-xs text-center">This record has no binary file data attached.</p>
        </div>
      );
    }

    const fileType = doc.attachmentType?.toLowerCase() || '';
    const isPdf = fileType.includes('pdf') || doc.attachmentName?.endsWith('.pdf');
    const isImage = fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif', 'webp'].some(ext => doc.attachmentName?.toLowerCase().endsWith(ext));
    const isExcel = fileType.includes('excel') || fileType.includes('sheet') || ['xls', 'xlsx', 'csv'].some(ext => doc.attachmentName?.toLowerCase().endsWith(ext));
    const isWord = fileType.includes('word') || fileType.includes('document') || ['doc', 'docx'].some(ext => doc.attachmentName?.toLowerCase().endsWith(ext));

    if (isImage) {
      return (
        <div className="flex items-center justify-center p-2 bg-gray-50 rounded-lg border border-gray-200 overflow-auto" style={{ maxHeight: '420px' }}>
          <img 
            src={doc.attachmentData} 
            alt={doc.fileName} 
            referrerPolicy="no-referrer"
            style={{ width: `${previewZoom}%`, height: 'auto', transition: 'width 0.1s ease' }} 
            className="max-h-full object-contain" 
          />
        </div>
      );
    }

    if (isPdf) {
      return (
        <div className="w-full bg-[#333] p-1 rounded-lg shadow-inner overflow-hidden border border-[#555]" style={{ height: '420px' }}>
          <iframe 
            src={doc.attachmentData} 
            title={doc.fileName} 
            className="w-full h-full border-0 bg-white" 
          />
        </div>
      );
    }

    // Beautiful formatted Excel Mock Sheet preview
    if (isExcel) {
      return (
        <div className="w-full rounded-lg border border-teal-200 bg-[#fefefe] text-xs shadow-sm overflow-hidden" style={{ maxHeight: '420px' }}>
          <div className="bg-emerald-800 text-white p-2 flex items-center justify-between font-mono font-medium">
            <span className="flex items-center gap-1"><FileSpreadsheet size={13} /> Excel spreadsheet simulation: {doc.attachmentName}</span>
            <span className="text-[10px] text-emerald-200">Interactive Worksheet View</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse font-mono">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="p-1 border-r border-gray-300 w-8 bg-gray-200 text-center font-bold text-gray-500 text-[10px]"></th>
                  <th className="p-1.5 border-r border-gray-300 text-left text-gray-600 font-bold bg-gray-200 min-w-[120px]">Column A</th>
                  <th className="p-1.5 border-r border-gray-300 text-left text-gray-600 font-bold bg-gray-200 min-w-[120px]">Column B</th>
                  <th className="p-1.5 border-r border-gray-300 text-left text-gray-600 font-bold bg-gray-200 min-w-[120px]">Column C</th>
                  <th className="p-1.5 border-r border-gray-300 text-left text-gray-600 font-bold bg-gray-200 min-w-[120px]">Column D</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200 hover:bg-emerald-50/20">
                  <td className="p-1 border-r border-gray-300 bg-gray-50 text-center text-[10px] font-bold text-gray-400">1</td>
                  <td className="p-1.5 border-r border-gray-200 font-bold text-teal-800 bg-teal-50/10">SN Enterprises Construction ERP</td>
                  <td className="p-1.5 border-r border-gray-200">Document Log Code</td>
                  <td className="p-1.5 border-r border-gray-200 font-medium text-blue-800">{doc.id}</td>
                  <td className="p-1.5 border-r border-gray-200 text-gray-500">Auto-Generated UUID</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-emerald-50/20">
                  <td className="p-1 border-r border-gray-300 bg-gray-50 text-center text-[10px] font-bold text-gray-400">2</td>
                  <td className="p-1.5 border-r border-gray-200 font-semibold">Document Title:</td>
                  <td className="p-1.5 border-r border-gray-200">{doc.fileName}</td>
                  <td className="p-1.5 border-r border-gray-200 font-semibold">File Mimetype:</td>
                  <td className="p-1.5 border-r border-gray-200">{doc.attachmentType || 'application/vnd.ms-excel'}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-emerald-50/20">
                  <td className="p-1 border-r border-gray-300 bg-gray-50 text-center text-[10px] font-bold text-gray-400">3</td>
                  <td className="p-1.5 border-r border-gray-200 font-semibold">Classification:</td>
                  <td className="p-1.5 border-r border-gray-200 font-medium text-amber-700">{doc.category}</td>
                  <td className="p-1.5 border-r border-gray-200 font-semibold">Sub-Type:</td>
                  <td className="p-1.5 border-r border-gray-200 text-blue-700 font-medium">{doc.docType}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-emerald-50/20">
                  <td className="p-1 border-r border-gray-300 bg-gray-50 text-center text-[10px] font-bold text-gray-400">4</td>
                  <td className="p-1.5 border-r border-gray-200 font-semibold">Record Logged By:</td>
                  <td className="p-1.5 border-r border-gray-200">{doc.createdBy || 'Admin'}</td>
                  <td className="p-1.5 border-r border-gray-200 font-semibold">Log DateTime:</td>
                  <td className="p-1.5 border-r border-gray-200 text-gray-600">{doc.uploadDate}</td>
                </tr>
                <tr className="border-b border-gray-200 hover:bg-emerald-50/20">
                  <td className="p-1 border-r border-gray-300 bg-gray-50 text-center text-[10px] font-bold text-gray-400">5</td>
                  <td className="p-1.5 border-r border-gray-200 font-semibold">Current Revision:</td>
                  <td className="p-1.5 border-r border-gray-200 font-bold text-emerald-700">Rev-{doc.version}</td>
                  <td className="p-1.5 border-r border-gray-200 font-semibold">Storage Bytes:</td>
                  <td className="p-1.5 border-r border-gray-200 text-purple-700">{doc.fileSize} Bytes</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="bg-gray-100 p-1.5 text-[10px] text-gray-500 border-t border-gray-300 font-mono flex justify-between">
            <span>Ready - Sheet1</span>
            <span>Count: 20 | Zoom: 100%</span>
          </div>
        </div>
      );
    }

    if (isWord) {
      return (
        <div className="w-full rounded-lg border border-blue-200 bg-[#fcfdfd] p-6 text-xs shadow-sm overflow-y-auto" style={{ maxHeight: '420px' }}>
          <div className="max-w-2xl mx-auto bg-white p-8 border border-gray-300 shadow-md rounded font-serif text-gray-800 leading-relaxed">
            <h1 className="text-center font-bold text-lg text-blue-900 border-b border-blue-900 pb-2 mb-4 font-sans tracking-wide uppercase">
              {doc.fileName}
            </h1>
            <p className="text-right text-[10px] font-mono text-gray-500 mb-6 font-sans">
              DOC REF ID: {doc.id}<br/>
              VERSION: REV-{doc.version}<br/>
              DATE: {doc.uploadDate}
            </p>
            <p className="mb-4">
              <strong>To Whomsoever It May Concern,</strong>
            </p>
            <p className="mb-4 text-justify">
              This simulated document serves as the visual mock representation of the Microsoft Word or rich text file uploaded as <strong>{doc.attachmentName}</strong>. This record is linked to <strong>{doc.category} ({doc.docType})</strong> in the SN ENTERPRISES Enterprise Resource Planning (ERP) database system.
            </p>
            <p className="mb-4 text-justify">
              <strong>Classification Details:</strong><br/>
              Category Node: {doc.category}<br/>
              Document Type: {doc.docType}<br/>
              Project reference: {projects.find(p => p.id === doc.projectId)?.name || 'General / Unassociated'}
            </p>
            <p className="mb-6 text-justify">
              <strong>Metadata and Tags:</strong><br/>
              {doc.tags ? JSON.parse(doc.tags).join(', ') : 'None'}
            </p>
            <div className="mt-8 pt-4 border-t border-gray-200 flex justify-between font-sans text-[10px] text-gray-500">
              <div>PREPARED BY: {doc.createdBy || 'Admin'}</div>
              <div>VERIFIED CLOUD REPOSITORY ID: SN-DMS-3000</div>
            </div>
          </div>
        </div>
      );
    }

    // Generic fallback for zip / word etc.
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center bg-gray-50 rounded-lg border border-gray-200 h-64">
        <FileText size={48} className="text-blue-500 mb-2" />
        <p className="font-semibold text-gray-800 text-sm">{doc.attachmentName}</p>
        <p className="text-xs text-gray-500 mb-4">{formatBytes(doc.fileSize)} • Rev-{doc.version}</p>
        <div className="bg-blue-50 text-blue-800 border border-blue-200 rounded p-3 text-xs max-w-sm mb-4">
          This document type ({fileType || 'binary archive'}) does not support native inside-browser previewing. Click Download to save and open locally.
        </div>
        <a 
          href={doc.attachmentData} 
          download={doc.attachmentName}
          onClick={() => triggerDownloadLog(doc)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white font-medium text-xs rounded hover:bg-blue-700 transition"
        >
          <Download size={14} /> Download File
        </a>
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full bg-[#f4f7f6]">
      {/* Tab Navigation header */}
      <div className="flex bg-[#e2eaf0] border-b border-[#a3b1c2] px-4 pt-1 gap-1">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 border-x border-t ${
            activeTab === 'dashboard' 
              ? 'bg-[#f4f7f6] text-[#0056b3] border-[#a3b1c2]' 
              : 'text-gray-600 border-transparent hover:bg-gray-100'
          }`}
        >
          <BarChart2 size={13} /> Dashboard Analytics
        </button>
        <button 
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 border-x border-t ${
            activeTab === 'documents' 
              ? 'bg-[#f4f7f6] text-[#0056b3] border-[#a3b1c2]' 
              : 'text-gray-600 border-transparent hover:bg-gray-100'
          }`}
        >
          <Folder size={13} /> Document Explorer
        </button>
        <button 
          onClick={() => setActiveTab('audits')}
          className={`px-4 py-2 text-xs font-semibold rounded-t-md transition flex items-center gap-1.5 border-x border-t ${
            activeTab === 'audits' 
              ? 'bg-[#f4f7f6] text-[#0056b3] border-[#a3b1c2]' 
              : 'text-gray-600 border-transparent hover:bg-gray-100'
          }`}
        >
          <Clock size={13} /> System Audit Trail
        </button>
      </div>

      {isLoading ? (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-[#8c9ba8]">
          <Clock className="animate-spin mb-2" size={32} />
          <p className="text-xs font-semibold font-mono tracking-wider">LOADING SECURE REPOSITORY DATABASE...</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          
          {/* TAB 1: DASHBOARD ANALYTICS */}
          {activeTab === 'dashboard' && (
            <div className="p-6 space-y-6 max-w-7xl mx-auto">
              
              {/* ALERTS SECTION (EXPIRY WARNINGS) */}
              {(metrics.expiredCount > 0 || metrics.expiring15Count > 0 || metrics.expiring30Count > 0) && (
                <div className="bg-amber-50 border-l-4 border-amber-500 rounded p-4 flex flex-col md:flex-row justify-between gap-4 shadow-sm">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                    <div>
                      <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">Critical Expiry Warning Alerts</h4>
                      <p className="text-xs text-amber-700 mt-1">
                        System tracked document expiry warnings: <strong>{metrics.expiredCount}</strong> expired documents, <strong>{metrics.expiring15Count}</strong> expiring in 15 days, and <strong>{metrics.expiring30Count}</strong> expiring in 30 days. Action required immediately.
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setActiveTab('documents');
                      setFilterExpiry('expiring-15');
                    }}
                    className="self-center px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-[10px] font-bold uppercase tracking-wider transition"
                  >
                    Investigate Expiries
                  </button>
                </div>
              )}

              {/* KPI CARD SECTION */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Documents</p>
                    <h3 className="text-2xl font-black text-gray-800 font-mono mt-1">{metrics.totalDocs}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Durable records</p>
                  </div>
                  <div className="p-2.5 bg-blue-50 text-blue-600 rounded">
                    <FileText size={20} />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Uploaded This Month</p>
                    <h3 className="text-2xl font-black text-emerald-700 font-mono mt-1">{metrics.docsThisMonth}</h3>
                    <p className="text-[10px] text-emerald-600 mt-1">+{metrics.docsThisMonth} Active gains</p>
                  </div>
                  <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded">
                    <FileUp size={20} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Expiring Documents</p>
                    <h3 className="text-2xl font-black text-amber-600 font-mono mt-1">
                      {metrics.expiring15Count + metrics.expiring30Count}
                    </h3>
                    <p className="text-[10px] text-amber-500 mt-1">Require replacement</p>
                  </div>
                  <div className="p-2.5 bg-amber-50 text-amber-600 rounded">
                    <AlertTriangle size={20} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Expired Documents</p>
                    <h3 className="text-2xl font-black text-rose-600 font-mono mt-1">{metrics.expiredCount}</h3>
                    <p className="text-[10px] text-rose-500 mt-1">Compliance failure</p>
                  </div>
                  <div className="p-2.5 bg-rose-50 text-rose-600 rounded">
                    <XCircle size={20} />
                  </div>
                </div>

                <div className="bg-white p-4 rounded border border-gray-200 shadow-sm flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Total Storage used</p>
                    <h3 className="text-2xl font-black text-purple-700 font-mono mt-1">{metrics.totalMB} MB</h3>
                    <p className="text-[10px] text-gray-400 mt-1">Of sandbox container</p>
                  </div>
                  <div className="p-2.5 bg-purple-50 text-purple-600 rounded">
                    <Archive size={20} />
                  </div>
                </div>
              </div>

              {/* STORAGE METRICS GRID */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                {/* Category Breakdown Graph */}
                <div className="bg-white p-5 rounded border border-gray-200 shadow-sm col-span-2">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-1">
                    <BarChart2 size={14} className="text-blue-600" /> Storage Usage by Document Category
                  </h4>
                  <div className="space-y-4">
                    {Object.entries(metrics.categoryBreakdown).map(([cat, size]) => {
                      const percentage = metrics.totalMB === '0.00' ? 0 : Math.min(100, Math.round((size / (documents.reduce((a, d) => a + d.fileSize, 0) || 1)) * 100));
                      const catColorMap: Record<string, string> = {
                        'Project Documents': 'bg-blue-600',
                        'Worker Documents': 'bg-teal-600',
                        'Subcontractor Documents': 'bg-amber-600',
                        'Company Documents': 'bg-purple-600'
                      };
                      return (
                        <div key={cat} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-gray-700">{cat}</span>
                            <span className="text-gray-500 font-mono">{formatBytes(size)} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2.5">
                            <div 
                              className={`h-2.5 rounded-full ${catColorMap[cat] || 'bg-gray-500'}`} 
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Largest Files Panel */}
                <div className="bg-white p-5 rounded border border-gray-200 shadow-sm">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider mb-4 flex items-center gap-1">
                    <Archive size={14} className="text-purple-600" /> Largest Files (Storage Heavy)
                  </h4>
                  <div className="divide-y divide-gray-100">
                    {metrics.largestFiles.length === 0 ? (
                      <p className="text-xs text-gray-400 py-4 text-center">No files uploaded yet.</p>
                    ) : (
                      metrics.largestFiles.map(file => (
                        <div 
                          key={file.id} 
                          className="py-2.5 flex items-center justify-between text-xs hover:bg-gray-50 cursor-pointer px-1 rounded transition"
                          onClick={() => {
                            setSelectedDocument(file);
                            setActiveTab('documents');
                          }}
                        >
                          <div className="truncate pr-2">
                            <p className="font-semibold text-gray-800 truncate">{file.fileName}</p>
                            <p className="text-[10px] text-gray-400 font-mono truncate">{file.attachmentName}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="px-2 py-0.5 bg-purple-50 text-purple-700 font-bold rounded font-mono text-[10px]">
                              {formatBytes(file.fileSize)}
                            </span>
                            <p className="text-[9px] text-gray-400 mt-0.5">Rev-{file.version}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

              {/* RECENT ACTIVITY LOG PREVIEW */}
              <div className="bg-white p-5 rounded border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider flex items-center gap-1">
                    <Clock size={14} className="text-amber-600" /> Recent Repository Operations Activity
                  </h4>
                  <button 
                    onClick={() => setActiveTab('audits')}
                    className="text-blue-600 hover:underline text-xs font-semibold"
                  >
                    View Complete Audits
                  </button>
                </div>
                <div className="divide-y divide-gray-100 max-h-60 overflow-y-auto">
                  {auditLogs.slice(0, 10).map((log) => (
                    <div key={log.id} className="py-3 text-xs flex items-start gap-3">
                      <div className="shrink-0 mt-0.5">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider font-mono uppercase ${
                          log.actionType === 'UPLOAD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          log.actionType === 'DOWNLOAD' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          log.actionType === 'DELETE' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {log.actionType}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-gray-700">{log.details}</p>
                        <p className="text-[10px] text-gray-400 font-mono mt-1">
                          By <span className="font-semibold text-gray-600">{log.username}</span> • {new Date(log.timestamp).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="py-8 text-center text-gray-400 text-xs">
                      No document transactions logged yet. Upload files to generate activity trails.
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: DOCUMENT EXPLORER */}
          {activeTab === 'documents' && (
            <div className="flex flex-col lg:flex-row h-full min-h-[500px]">
              
              {/* LEFT FOLDER STRUCTURE SIDEBAR */}
              <div className="w-full lg:w-64 shrink-0 bg-[#eef3f7] border-r border-[#a3b1c2] flex flex-col p-4 select-none">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Repository Directories</h4>
                  {currentFolder && (
                    <button 
                      onClick={() => setCurrentFolder(null)}
                      className="text-blue-600 hover:underline text-[10px] font-bold"
                    >
                      Clear Filter
                    </button>
                  )}
                </div>

                <div className="flex-1 space-y-1.5 overflow-y-auto font-mono text-[11px]">
                  {/* Root Tree Nodes */}
                  {folderTree.map((node) => {
                    const isExpanded = expandedNodes[node.name];
                    const isSelected = currentFolder?.category === node.category && !currentFolder.docType;
                    
                    return (
                      <div key={node.name} className="space-y-1">
                        <div 
                          onClick={() => {
                            setCurrentFolder({ category: node.category, docType: null });
                            toggleNode(node.name);
                          }}
                          className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition ${
                            isSelected ? 'bg-blue-100 text-blue-900 font-bold border-l-2 border-blue-600' : 'hover:bg-gray-200 text-gray-700'
                          }`}
                        >
                          <span className="text-gray-400">
                            {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                          </span>
                          <span>
                            {isExpanded ? <FolderOpen size={13} className="text-amber-500" /> : <Folder size={13} className="text-amber-500" />}
                          </span>
                          <span className="truncate">{node.name}</span>
                        </div>

                        {/* Children List */}
                        {isExpanded && node.children && (
                          <div className="pl-4 space-y-1 border-l border-gray-300 ml-3.5">
                            {node.children.map((child) => {
                              const isChildSelected = currentFolder?.category === child.category && currentFolder.docType === child.docType;
                              return (
                                <div 
                                  key={child.name}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setCurrentFolder({ category: child.category, docType: child.docType });
                                  }}
                                  className={`flex items-center gap-1.5 px-2 py-1.5 rounded cursor-pointer transition ${
                                    isChildSelected ? 'bg-blue-100 text-blue-900 font-bold border-l-2 border-blue-600' : 'hover:bg-gray-200 text-gray-600'
                                  }`}
                                >
                                  <span><FileText size={12} className="text-gray-400" /></span>
                                  <span className="truncate">{child.name}</span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Role-based permissions display indicator */}
                <div className="mt-4 p-3 bg-white rounded border border-gray-200 text-[10px]">
                  <p className="font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1">
                    <Shield size={11} className="text-blue-600" /> Your DMS Role permissions
                  </p>
                  <p className="text-xs font-semibold text-gray-800 mt-1 font-mono uppercase">{currentRole}</p>
                  <div className="mt-2 grid grid-cols-2 gap-1.5 text-[9px] text-gray-500">
                    <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> View</span>
                    <span className={`flex items-center gap-1 ${permissions.upload ? '' : 'line-through opacity-40'}`}><span className={`w-1.5 h-1.5 rounded-full ${permissions.upload ? 'bg-emerald-500' : 'bg-gray-300'}`}></span> Upload</span>
                    <span className={`flex items-center gap-1 ${permissions.edit ? '' : 'line-through opacity-40'}`}><span className={`w-1.5 h-1.5 rounded-full ${permissions.edit ? 'bg-emerald-500' : 'bg-gray-300'}`}></span> Edit</span>
                    <span className={`flex items-center gap-1 ${permissions.delete ? '' : 'line-through opacity-40'}`}><span className={`w-1.5 h-1.5 rounded-full ${permissions.delete ? 'bg-emerald-500' : 'bg-gray-300'}`}></span> Delete</span>
                  </div>
                </div>
              </div>

              {/* MAIN CONTENT WORKSPACE AREA */}
              <div className="flex-1 flex flex-col p-6 min-w-0">
                
                {/* SEARCH AND FILTERS BAR */}
                <div className="bg-white p-4 rounded border border-gray-200 shadow-sm space-y-3 mb-6">
                  
                  {/* Row 1: Search string & Action buttons */}
                  <div className="flex flex-col md:flex-row gap-3">
                    <div className="flex-1 relative">
                      <Search size={14} className="absolute left-3 top-3 text-gray-400" />
                      <input 
                        type="text" 
                        placeholder="Search repository files by name, tags, type, uploaded by..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <button 
                        onClick={() => setViewMode('grid')}
                        className={`p-2 rounded border transition ${viewMode === 'grid' ? 'bg-gray-100 text-blue-600 border-gray-300' : 'text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                        title="Grid View"
                      >
                        <Grid size={14} />
                      </button>
                      <button 
                        onClick={() => setViewMode('list')}
                        className={`p-2 rounded border transition ${viewMode === 'list' ? 'bg-gray-100 text-blue-600 border-gray-300' : 'text-gray-400 border-gray-200 hover:bg-gray-50'}`}
                        title="List View"
                      >
                        <List size={14} />
                      </button>

                      {permissions.upload && (
                        <button 
                          onClick={() => {
                            resetUploadForm();
                            setIsUploadOpen(true);
                          }}
                          className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded text-xs font-bold hover:bg-blue-700 transition shadow-sm uppercase tracking-wider"
                        >
                          <Plus size={14} /> Upload Documents
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Row 2: Advanced Filters dropdowns */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Associated Project</label>
                      <SAPSelect 
                        value={filterProject}
                        onChange={(e) => setFilterProject(e.target.value)}
                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="">-- All Projects --</option>
                        {projects.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </SAPSelect>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Expiry Status Tracker</label>
                      <SAPSelect 
                        value={filterExpiry}
                        onChange={(e) => setFilterExpiry(e.target.value as any)}
                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">All Expiry States</option>
                        <option value="expiring-30">Expiring in 30 Days</option>
                        <option value="expiring-15">Expiring in 15 Days</option>
                        <option value="expired">Expired Documents Only</option>
                      </SAPSelect>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Approval Workflow Status</label>
                      <SAPSelect 
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="w-full border border-gray-300 rounded p-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      >
                        <option value="all">All Document Statuses</option>
                        <option value="Draft">Draft</option>
                        <option value="Pending Review">Pending Review</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Archived">Archived</option>
                      </SAPSelect>
                    </div>

                    <div className="flex gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date From</label>
                        <input 
                          type="date" 
                          value={filterDateFrom}
                          onChange={(e) => setFilterDateFrom(e.target.value)}
                          className="w-full border border-gray-300 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date To</label>
                        <input 
                          type="date" 
                          value={filterDateTo}
                          onChange={(e) => setFilterDateTo(e.target.value)}
                          className="w-full border border-gray-300 rounded p-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Active filters label info bar */}
                  {currentFolder && (
                    <div className="bg-blue-50 border border-blue-200 rounded px-2.5 py-1.5 text-[11px] text-blue-800 flex items-center justify-between">
                      <span className="font-medium">
                        Active Folder filter: <strong className="font-bold">{currentFolder.category}</strong>
                        {currentFolder.docType && ` / ${currentFolder.docType}`}
                      </span>
                      <button 
                        onClick={() => setCurrentFolder(null)}
                        className="text-xs font-black text-blue-900 hover:text-black shrink-0 px-1"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* DOCUMENTS AREA */}
                {filteredDocs.length === 0 ? (
                  <div className="flex-1 bg-white border border-gray-200 rounded p-12 text-center text-[#8c9ba8]">
                    <Folder size={48} className="mx-auto mb-3 opacity-40 text-blue-500" />
                    <p className="font-semibold text-sm">No documents match the filter criteria</p>
                    <p className="text-xs mt-1">Try relaxing filters, expanding your category scope, or upload new files.</p>
                  </div>
                ) : (
                  <div>
                    {viewMode === 'grid' ? (
                      /* GRID LAYOUT */
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                        {filteredDocs.map((doc) => {
                          const docTags: string[] = doc.tags ? JSON.parse(doc.tags) : [];
                          return (
                            <div 
                              key={doc.id}
                              onClick={() => setSelectedDocument(doc)}
                              className={`bg-white rounded border cursor-pointer hover:shadow-md transition flex flex-col justify-between overflow-hidden relative ${
                                selectedDocument?.id === doc.id ? 'border-2 border-blue-500 ring-1 ring-blue-500/20' : 'border-gray-200'
                              }`}
                            >
                              {/* Card Header Type styling */}
                              <div className="p-4 flex-1">
                                <div className="flex items-start justify-between mb-2">
                                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase font-mono ${
                                    doc.category === 'Project Documents' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                    doc.category === 'Worker Documents' ? 'bg-teal-50 text-teal-700 border border-teal-100' :
                                    doc.category === 'Subcontractor Documents' ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                                    'bg-purple-50 text-purple-700 border border-purple-100'
                                  }`}>
                                    {doc.docType}
                                  </span>
                                  
                                  {/* Small status indicator bubble */}
                                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-bold uppercase font-mono ${
                                    doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                                    doc.status === 'Pending Review' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                    doc.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {doc.status}
                                  </span>
                                </div>

                                <h4 className="font-bold text-gray-800 text-xs line-clamp-1" title={doc.fileName}>
                                  {doc.fileName}
                                </h4>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5 font-semibold truncate">
                                  {doc.attachmentName}
                                </p>
                                
                                {doc.description && (
                                  <p className="text-[11px] text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                                    {doc.description}
                                  </p>
                                )}

                                {/* Tags Pill List */}
                                {docTags.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-3">
                                    {docTags.map(tag => (
                                      <span key={tag} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] rounded font-mono font-medium">
                                        #{tag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Card footer details */}
                              <div className="bg-gray-50 p-3 border-t border-gray-100 text-[10px] text-gray-500 flex justify-between items-center font-mono shrink-0">
                                <span className="font-semibold text-gray-600">Rev-{doc.version}</span>
                                <span>{doc.uploadDate}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      /* LIST LAYOUT */
                      <div className="bg-white rounded border border-gray-200 overflow-x-auto shadow-sm">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-gray-100 text-gray-500 font-bold uppercase tracking-wider text-[10px] border-b border-gray-200 font-mono">
                              <th className="p-3">File Name</th>
                              <th className="p-3">Category</th>
                              <th className="p-3">Doc Type</th>
                              <th className="p-3">Associated Record</th>
                              <th className="p-3">Expiry Date</th>
                              <th className="p-3 font-mono">Revision</th>
                              <th className="p-3">Uploaded By</th>
                              <th className="p-3 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {filteredDocs.map((doc) => {
                              const projName = projects.find(p => p.id === doc.projectId)?.name || 'General';
                              return (
                                <tr 
                                  key={doc.id}
                                  onClick={() => setSelectedDocument(doc)}
                                  className={`hover:bg-blue-50/20 cursor-pointer transition ${selectedDocument?.id === doc.id ? 'bg-blue-50/50' : ''}`}
                                >
                                  <td className="p-3">
                                    <p className="font-bold text-gray-800">{doc.fileName}</p>
                                    <p className="text-[10px] text-gray-400 font-mono truncate max-w-xs">{doc.attachmentName}</p>
                                  </td>
                                  <td className="p-3 text-gray-600 font-mono text-[10px]">{doc.category}</td>
                                  <td className="p-3">
                                    <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-700 font-semibold text-[10px]">
                                      {doc.docType}
                                    </span>
                                  </td>
                                  <td className="p-3 text-gray-700 font-medium">{projName}</td>
                                  <td className="p-3 font-mono text-gray-500">
                                    {doc.expiryDate ? (
                                      <span className={new Date(doc.expiryDate) < new Date() ? 'text-rose-600 font-bold' : ''}>
                                        {doc.expiryDate}
                                      </span>
                                    ) : 'No Expiry'}
                                  </td>
                                  <td className="p-3 font-bold text-gray-600 font-mono text-center">Rev-{doc.version}</td>
                                  <td className="p-3 text-gray-500">{doc.createdBy || 'Admin'}</td>
                                  <td className="p-3 text-center">
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      doc.status === 'Approved' ? 'bg-emerald-50 text-emerald-700' :
                                      doc.status === 'Pending Review' ? 'bg-amber-50 text-amber-600' :
                                      doc.status === 'Rejected' ? 'bg-rose-50 text-rose-700' : 'bg-gray-100 text-gray-600'
                                    }`}>
                                      {doc.status}
                                    </span>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT EXPANDABLE PREVIEW AND DETAIL DRAWER PANEL */}
              {selectedDocument && (
                <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-2xl rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10">
                  
                  {/* Panel Header */}
                  <div className="bg-[#e2eaf0] p-4 border-b border-[#a3b1c2] flex items-center justify-between shrink-0">
                    <div className="min-w-0 pr-2">
                      <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider font-mono truncate" title={selectedDocument.fileName}>
                        DMS Details: {selectedDocument.fileName}
                      </h4>
                      <p className="text-[10px] text-gray-500 truncate mt-0.5">Rev-{selectedDocument.version} • {formatBytes(selectedDocument.fileSize)}</p>
                    </div>
                    <button 
                      onClick={() => setSelectedDocument(null)}
                      className="p-1 rounded text-gray-500 hover:text-black hover:bg-gray-200 transition"
                    >
                      ✕
                    </button>
                  </div>

                  {/* Panel scrollable content */}
                  <div className="flex-1 p-5 overflow-y-auto space-y-6">
                    
                    {/* Visual file preview stage */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                        <span>Document Preview Panel</span>
                        <div className="flex items-center gap-1 font-mono">
                          <button onClick={() => setPreviewZoom(Math.max(50, previewZoom - 25))} className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200">-</button>
                          <span>{previewZoom}%</span>
                          <button onClick={() => setPreviewZoom(Math.min(200, previewZoom + 25))} className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded hover:bg-gray-200">+</button>
                        </div>
                      </div>
                      {renderDocumentPreview(selectedDocument)}
                    </div>

                    {/* Action buttons list */}
                    <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100 shrink-0">
                      {selectedDocument.attachmentData && (
                        <a 
                          href={selectedDocument.attachmentData} 
                          download={selectedDocument.attachmentName || 'document'}
                          onClick={() => triggerDownloadLog(selectedDocument)}
                          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded uppercase tracking-wider transition"
                        >
                          <Download size={12} /> Download
                        </a>
                      )}
                      <button 
                        onClick={() => handleShareLink(selectedDocument)}
                        className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 font-bold text-[10px] rounded uppercase tracking-wider transition"
                      >
                        <Share2 size={12} /> Share ERP
                      </button>
                      
                      {permissions.edit && (
                        <button 
                          onClick={() => {
                            setVersionDescription('');
                            setIsVersionModalOpen(true);
                          }}
                          className="flex-1 flex items-center justify-center gap-1 px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded uppercase tracking-wider transition"
                        >
                          <FileUp size={12} /> New Rev
                        </button>
                      )}

                      {permissions.delete && (
                        <button 
                          onClick={() => handleDeleteDocument(selectedDocument.id, selectedDocument.fileName)}
                          className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[10px] rounded uppercase tracking-wider transition"
                          title="Permanently Delete Document"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>

                    {/* Meta info breakdown */}
                    <div className="bg-gray-50 rounded border border-gray-200 p-4 space-y-3 font-mono text-[11px]">
                      <h5 className="font-bold text-gray-700 text-[10px] uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center gap-1">
                        <Info size={11} className="text-gray-400" /> Document Meta Parameters
                      </h5>
                      <div className="grid grid-cols-3 gap-y-2">
                        <span className="text-gray-400">Class:</span>
                        <span className="col-span-2 text-gray-800 font-semibold">{selectedDocument.category}</span>
                        
                        <span className="text-gray-400">Doc Type:</span>
                        <span className="col-span-2 text-blue-700 font-bold">{selectedDocument.docType}</span>
                        
                        <span className="text-gray-400">Project:</span>
                        <span className="col-span-2 text-gray-700 truncate">
                          {projects.find(p => p.id === selectedDocument.projectId)?.name || 'None / Global'}
                        </span>
                        
                        <span className="text-gray-400">Expiry Tracker:</span>
                        <span className={`col-span-2 ${selectedDocument.expiryDate ? (new Date(selectedDocument.expiryDate) < new Date() ? 'text-rose-600 font-bold' : 'text-emerald-700') : 'text-gray-400'}`}>
                          {selectedDocument.expiryDate || 'No Expiry Set'}
                        </span>

                        <span className="text-gray-400">Uploaded By:</span>
                        <span className="col-span-2 text-gray-700 font-medium">{selectedDocument.createdBy || 'Admin'}</span>

                        <span className="text-gray-400">Date Logged:</span>
                        <span className="col-span-2 text-gray-600">{selectedDocument.uploadDate}</span>
                      </div>
                    </div>

                    {/* APPROVAL WORKFLOW STATUS CONTROL */}
                    <div className="bg-white rounded border border-gray-200 p-4 space-y-3">
                      <h5 className="font-bold text-gray-700 text-[10px] uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center gap-1">
                        <CheckCircle size={11} className="text-emerald-600" /> Approval Status & Control Workflow
                      </h5>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-gray-500">Current Status:</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          selectedDocument.status === 'Approved' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          selectedDocument.status === 'Pending Review' ? 'bg-amber-50 text-amber-600 border border-amber-200' :
                          selectedDocument.status === 'Rejected' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          'bg-gray-100 text-gray-600 border border-gray-300'
                        }`}>
                          {selectedDocument.status}
                        </span>
                      </div>
                      
                      {/* Approver Details */}
                      {selectedDocument.approver && (
                        <div className="bg-gray-50 p-2.5 rounded border border-gray-100 font-mono text-[10px] text-gray-500 space-y-1">
                          <p><strong>Approved By:</strong> {selectedDocument.approver}</p>
                          <p><strong>Review Date:</strong> {selectedDocument.approvalDate}</p>
                          {selectedDocument.approvalRemarks && <p><strong>Audit Notes:</strong> {selectedDocument.approvalRemarks}</p>}
                        </div>
                      )}

                      {/* State Transitions for Admins */}
                      {permissions.approve && (
                        <div className="space-y-2">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-2">Change Document status workflow</label>
                          <div className="flex gap-1">
                            <button 
                              onClick={() => {
                                const rem = prompt("Enter approval audit details:") || "";
                                handleStatusChange('Approved', rem);
                              }}
                              className="flex-1 px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold hover:bg-emerald-700 transition uppercase"
                            >
                              Approve
                            </button>
                            <button 
                              onClick={() => {
                                const rem = prompt("Enter rejection details:") || "";
                                handleStatusChange('Rejected', rem);
                              }}
                              className="flex-1 px-2 py-1 bg-rose-600 text-white rounded text-[10px] font-bold hover:bg-rose-700 transition uppercase"
                            >
                              Reject
                            </button>
                            <button 
                              onClick={() => {
                                const rem = prompt("Enter review notes:") || "";
                                handleStatusChange('Pending Review', rem);
                              }}
                              className="flex-1 px-2 py-1 bg-amber-500 text-white rounded text-[10px] font-bold hover:bg-amber-600 transition uppercase"
                            >
                              Review
                            </button>
                          </div>
                          <button 
                            onClick={() => handleArchiveDocument(selectedDocument)}
                            className="w-full mt-1.5 px-2 py-1 bg-gray-500 text-white hover:bg-gray-600 rounded text-[10px] font-bold uppercase transition"
                          >
                            Archive Document (Obsolete)
                          </button>
                        </div>
                      )}
                    </div>

                    {/* DOCUMENT REVISION HISTORY STAGE */}
                    <div className="space-y-3">
                      <h5 className="font-bold text-gray-700 text-[10px] uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center gap-1">
                        <Clock size={11} className="text-gray-400" /> Historical Revisions (Immutable Logs)
                      </h5>
                      <div className="space-y-2.5">
                        {/* Current Active Version */}
                        <div className="bg-emerald-50 border border-emerald-200 rounded p-2.5 text-xs flex justify-between items-center">
                          <div>
                            <span className="font-bold text-emerald-800">Rev-{selectedDocument.version} (Active Current)</span>
                            <p className="text-[10px] text-gray-400 mt-0.5">By {selectedDocument.createdBy || 'Admin'} • {selectedDocument.uploadDate}</p>
                          </div>
                          <span className="p-1 text-emerald-600"><Check size={14} /></span>
                        </div>

                        {/* Past Revisions List */}
                        {(() => {
                          const revs: DocumentRevision[] = JSON.parse(selectedDocument.revisions || '[]');
                          if (revs.length === 0) {
                            return <p className="text-[10px] text-gray-400 text-center py-2 italic">No past historical versions recorded.</p>;
                          }
                          return revs.map((r, idx) => (
                            <div key={idx} className="bg-gray-50 border border-gray-200 rounded p-2.5 text-xs flex justify-between items-center hover:bg-gray-100 transition">
                              <div>
                                <span className="font-semibold text-gray-700">Rev-{r.version}</span>
                                <p className="text-[10px] text-gray-400 mt-0.5">Uploaded {r.uploadDate} by {r.uploadedBy}</p>
                                {r.description && <p className="text-[10px] text-gray-500 italic mt-1 font-sans">{r.description}</p>}
                              </div>
                              {permissions.edit && (
                                <button 
                                  onClick={() => handleRevertVersion(r)}
                                  className="px-2 py-1 text-[9px] font-bold text-blue-600 hover:bg-blue-50 border border-blue-200 rounded transition uppercase"
                                  title="Restore and make current active version"
                                >
                                  Revert
                                </button>
                              )}
                            </div>
                          ));
                        })()}
                      </div>
                    </div>

                    {/* DOCUMENT LINKED ENTITIES BLOCK */}
                    <div className="bg-white rounded border border-gray-200 p-4 space-y-4">
                      <h5 className="font-bold text-gray-700 text-[10px] uppercase tracking-wider border-b border-gray-200 pb-1 flex items-center gap-1">
                        <Link2 size={11} className="text-blue-600" /> Associated Record Links ({JSON.parse(selectedDocument.linkedEntity || '[]').length})
                      </h5>
                      
                      {/* Current Links list */}
                      <div className="space-y-1.5 max-h-36 overflow-y-auto">
                        {(() => {
                          const links: DocumentLink[] = JSON.parse(selectedDocument.linkedEntity || '[]');
                          if (links.length === 0) {
                            return <p className="text-[10px] text-gray-400 text-center italic py-2">No active record links set.</p>;
                          }
                          return links.map((l, idx) => (
                            <div key={idx} className="bg-gray-50 p-2 rounded flex justify-between items-center text-xs text-gray-700 font-mono">
                              <span className="truncate pr-1">
                                <strong className="uppercase text-[9px] text-blue-600 bg-blue-50 border border-blue-100 px-1 rounded inline-block mr-1">{l.entityType}</strong> 
                                {l.entityLabel}
                              </span>
                              {permissions.edit && (
                                <button 
                                  onClick={() => handleRemoveLink(idx)}
                                  className="text-rose-500 hover:text-rose-700 shrink-0 px-1"
                                  title="Unlink Record"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ));
                        })()}
                      </div>

                      {/* Add Links Creator */}
                      {permissions.edit && (
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">Associate this file with a system record</label>
                          <div className="grid grid-cols-2 gap-2">
                            <SAPSelect 
                              value={linkEntityType}
                              onChange={(e) => {
                                setLinkEntityType(e.target.value as any);
                                setLinkEntityId('');
                              }}
                              className="border border-gray-300 rounded p-1 text-[11px]"
                            >
                              <option value="project">Project Master</option>
                              <option value="worker">Worker Profile</option>
                              <option value="subcontractor">Subcontractor</option>
                              <option value="bill">Client Billing</option>
                              <option value="payment">Client Receipt</option>
                              <option value="boq">BOQ Contract</option>
                            </SAPSelect>

                            {/* Dynamic selection dropdown based on type */}
                            <SAPSelect
                              value={linkEntityId}
                              onChange={(e) => setLinkEntityId(e.target.value)}
                              className="border border-gray-300 rounded p-1 text-[11px]"
                            >
                              <option value="">-- Choose Record --</option>
                              {linkEntityType === 'project' && projects.map(p => (
                                <option key={p.id} value={p.id}>{p.name}</option>
                              ))}
                              {linkEntityType === 'worker' && workers.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                              ))}
                              {linkEntityType === 'subcontractor' && subcontractors.map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.firmName || ''})</option>
                              ))}
                              {linkEntityType === 'bill' && billings.map(b => (
                                <option key={b.id} value={b.id}>{b.billNo} - {projects.find(p => p.id === b.projectId)?.name}</option>
                              ))}
                              {linkEntityType === 'payment' && clientPayments.map(p => (
                                <option key={p.id} value={p.id}>₹{p.amountReceived} ({p.date})</option>
                              ))}
                              {linkEntityType === 'boq' && boqs.map(q => (
                                <option key={q.id} value={q.id}>{q.boqNo} - {q.clientName}</option>
                              ))}
                            </SAPSelect>
                          </div>
                          
                          <input 
                            type="text" 
                            placeholder="Optional custom linking detail / label info"
                            value={customLinkDetails}
                            onChange={(e) => setCustomLinkDetails(e.target.value)}
                            className="w-full border border-gray-300 rounded p-1 text-[11px]"
                          />

                          <button 
                            onClick={handleAddLink}
                            disabled={!linkEntityId}
                            className="w-full py-1 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold text-[10px] uppercase transition disabled:opacity-50"
                          >
                            Link Associated Record
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 3: SYSTEM AUDIT TRAIL */}
          {activeTab === 'audits' && (
            <div className="p-6 max-w-5xl mx-auto space-y-6">
              <div className="bg-white p-6 rounded border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Secured System Activity Log Logs</h3>
                    <p className="text-xs text-gray-500 mt-1">Durable transaction tracking for security, downloads, uploads, edits and reviews</p>
                  </div>
                  <button 
                    onClick={fetchAllDMSData}
                    className="text-blue-600 hover:underline text-xs font-semibold uppercase tracking-wider"
                  >
                    Refresh Audit Logs
                  </button>
                </div>

                <div className="divide-y divide-gray-100">
                  {auditLogs.map((log) => (
                    <div key={log.id} className="py-3.5 flex flex-col sm:flex-row justify-between sm:items-center gap-2 text-xs">
                      <div className="flex items-start gap-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wider font-mono uppercase ${
                          log.actionType === 'UPLOAD' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          log.actionType === 'DOWNLOAD' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          log.actionType === 'DELETE' ? 'bg-rose-50 text-rose-700 border border-rose-200' :
                          log.actionType === 'APPROVE' ? 'bg-purple-50 text-purple-700 border border-purple-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {log.actionType}
                        </span>
                        <div>
                          <p className="text-gray-700 font-medium">{log.details}</p>
                          <p className="text-[10px] text-gray-400 font-mono mt-0.5">UUID Code: {log.id} • Record Reference: {log.recordId}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-[10px] font-mono text-gray-500 bg-gray-50 px-2 py-1 border border-gray-200 rounded">
                        <span className="font-bold text-gray-700">{log.username}</span><br/>
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                  {auditLogs.length === 0 && (
                    <div className="py-12 text-center text-gray-400">
                      No operations tracked in transaction log. Upload and download documents to generate entries.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* MODAL WINDOW: DOCUMENT UPLOAD FLOW */}
      {isUploadOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-lg rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10">
            
            <div className="bg-[#e2eaf0] px-5 py-4 border-b border-[#a3b1c2] flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider font-mono flex items-center gap-1.5">
                <FileUp size={16} className="text-blue-600" /> Upload Documents to DMS Center
              </h3>
              <button 
                onClick={() => setIsUploadOpen(false)}
                className="p-1 rounded text-gray-500 hover:text-black hover:bg-gray-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              
              {/* Drag and drop panel stage */}
              <div 
                onDragEnter={handleDrag}
                onDragOver={handleDrag}
                onDragLeave={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition flex flex-col items-center justify-center ${
                  dragActive ? 'border-blue-600 bg-blue-50/20' : 'border-gray-300 hover:border-blue-500 hover:bg-gray-50'
                }`}
              >
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  multiple 
                  className="hidden" 
                />
                <FileUp size={36} className="text-gray-400 mb-2" />
                <p className="font-semibold text-gray-700">Drag and drop file here, or click to browse</p>
                <p className="text-[10px] text-gray-400 mt-1">Supports PDF, Excel, Word, JPG, PNG, ZIP (Max 10MB per file)</p>
                
                {/* Uploaded File status */}
                {uploadFiles.length > 0 && (
                  <div className="mt-4 w-full bg-blue-50 border border-blue-200 rounded p-2 text-left space-y-1">
                    <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Queue: {uploadFiles.length} file(s)</p>
                    {uploadFiles.map((file, idx) => (
                      <div key={idx} className="flex justify-between items-center text-[10px] text-gray-600 font-mono">
                        <span className="truncate max-w-[240px]">{file.name}</span>
                        <div className="flex items-center gap-1.5">
                          <span>({formatBytes(file.size)})</span>
                          <button 
                            type="button" 
                            onClick={(e) => {
                              e.stopPropagation();
                              setUploadFiles(prev => prev.filter((_, i) => i !== idx));
                            }}
                            className="text-rose-500 font-black hover:text-rose-700 shrink-0"
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Form parameters */}
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Associated Project (Optional)</label>
                  <SAPSelect 
                    value={formProject}
                    onChange={(e) => setFormProject(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- General / No Project --</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </SAPSelect>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">DMS Category Location</label>
                  <SAPSelect 
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value as any)}
                    className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="Project Documents">Project Documents</option>
                    <option value="Worker Documents">Worker Documents</option>
                    <option value="Subcontractor Documents">Subcontractor Documents</option>
                    <option value="Company Documents">Company Documents</option>
                  </SAPSelect>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Document Sub-Type classification</label>
                  <SAPSelect 
                    value={formDocType}
                    onChange={(e) => setFormDocType(e.target.value)}
                    className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    {formCategory === 'Project Documents' && (
                      <>
                        <option value="Drawings">Drawings</option>
                        <option value="BOQ">BOQ</option>
                        <option value="Work Orders">Work Orders</option>
                        <option value="Agreements">Agreements</option>
                        <option value="Client Bills">Client Bills</option>
                        <option value="Client Payments">Client Payments</option>
                        <option value="Site Photos">Site Photos</option>
                        <option value="Quality Reports">Quality Reports</option>
                        <option value="Completion Documents">Completion Documents</option>
                        <option value="Other Documents">Other Documents</option>
                      </>
                    )}
                    {formCategory === 'Worker Documents' && (
                      <>
                        <option value="Aadhaar">Aadhaar</option>
                        <option value="PAN">PAN</option>
                        <option value="Bank Details">Bank Details</option>
                        <option value="Labour Card">Labour Card</option>
                        <option value="Other Documents">Other Documents</option>
                      </>
                    )}
                    {formCategory === 'Subcontractor Documents' && (
                      <>
                        <option value="Work Orders">Work Orders</option>
                        <option value="Agreements">Agreements</option>
                        <option value="PAN">PAN</option>
                        <option value="GST Certificate">GST Certificate</option>
                        <option value="Bills">Bills</option>
                        <option value="Payment Documents">Payment Documents</option>
                        <option value="Other Documents">Other Documents</option>
                      </>
                    )}
                    {formCategory === 'Company Documents' && (
                      <>
                        <option value="GST Certificate">GST Certificate</option>
                        <option value="PAN Card">PAN Card</option>
                        <option value="Registrations">Registrations</option>
                        <option value="Insurance">Insurance</option>
                        <option value="Licenses">Licenses</option>
                        <option value="Other Documents">Other Documents</option>
                      </>
                    )}
                  </SAPSelect>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Expiry Date tracker (Optional)</label>
                  <input 
                    type="date" 
                    value={formExpiryDate}
                    onChange={(e) => setFormExpiryDate(e.target.value)}
                    className="w-full border border-gray-300 rounded p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Document Title Name (Prefilled from upload)</label>
                <input 
                  type="text" 
                  placeholder="Enter custom title file name label"
                  value={formFileName}
                  onChange={(e) => setFormFileName(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Tags / Classification Labels (Comma separated)</label>
                <input 
                  type="text" 
                  placeholder="e.g. approved, revised, electrical, structural"
                  value={formTags}
                  onChange={(e) => setFormTags(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Brief Description / Audit Notes</label>
                <textarea 
                  rows={2}
                  placeholder="Summarize file purpose, revision reasons, and notes..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsUploadOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-gray-100 uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded text-xs font-bold uppercase tracking-wider transition"
                >
                  Confirm Upload
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL WINDOW: REVISION MANAGER (ADD NEW VERSION) */}
      {isVersionModalOpen && selectedDocument && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="sap-panel bg-[#f0f4f8] border-2 border-[#8c9ba8] w-full max-w-md rounded-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh] text-[11px] relative z-10">
            
            <div className="bg-[#e2eaf0] px-5 py-4 border-b border-[#a3b1c2] flex items-center justify-between">
              <h3 className="font-bold text-gray-800 text-sm uppercase tracking-wider font-mono flex items-center gap-1.5">
                <FileUp size={16} className="text-amber-600" /> Push Document Revision: Rev-{(selectedDocument.version || 0) + 1}
              </h3>
              <button 
                onClick={() => setIsVersionModalOpen(false)}
                className="p-1 rounded text-gray-500 hover:text-black hover:bg-gray-200 transition"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddVersion} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-amber-50 text-amber-900 rounded border border-amber-200 flex gap-2">
                <Info size={14} className="shrink-0 mt-0.5" />
                <p>
                  You are posting a new version for document <strong>{selectedDocument.fileName}</strong>. The old version will be safely archived in the immutable revisions list.
                </p>
              </div>

              {/* Version File Picker */}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Upload New Revision file</label>
                <input 
                  type="file" 
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      const file = e.target.files[0];
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setVersionFile({
                          name: file.name,
                          type: file.type || file.name.split('.').pop() || 'unknown',
                          size: file.size,
                          base64: reader.result as string
                        });
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full border border-gray-300 rounded p-1"
                />
                {versionFile && (
                  <p className="text-[10px] text-emerald-600 font-semibold font-mono mt-1">
                    Selected: {versionFile.name} ({formatBytes(versionFile.size)})
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Revision description / Change Log details</label>
                <textarea 
                  rows={2}
                  required
                  placeholder="Specify why this file is revised (e.g. Incorporated structural engineer notes on block D)"
                  value={versionDescription}
                  onChange={(e) => setVersionDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-xs focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div className="pt-2 border-t border-gray-100 flex gap-3 justify-end">
                <button 
                  type="button" 
                  onClick={() => setIsVersionModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded text-xs font-bold text-gray-600 hover:bg-gray-100 uppercase"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!versionFile}
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50 rounded text-xs font-bold uppercase tracking-wider transition"
                >
                  Push Revision
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
};
