import { 
  DocFlowNode, 
  DocFlowNodeType, 
  DocFlowCategory, 
  DocFlowStatus, 
  DocFlowChain, 
  DocFlowFilter 
} from '../types';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Helper to format consistent SAP document numbers
export function formatSapDocNumber(
  type: DocFlowNodeType, 
  rawId: string, 
  explicitNumber?: string, 
  dateStr?: string
): string {
  const currentYear = dateStr ? new Date(dateStr).getFullYear() : new Date().getFullYear();
  const yearSafe = isNaN(currentYear) ? 2026 : currentYear;

  if (explicitNumber && explicitNumber.trim().length > 0) {
    const clean = explicitNumber.trim();
    // If it's already a well-formatted prefix, return as is
    if (/^[A-Z]{3,5}-\d{4}-\d+/i.test(clean) || /^[A-Z0-9_\-\/]{3,30}$/i.test(clean)) {
      return clean.toUpperCase();
    }
  }

  // Derive short clean numerical hash or suffix from rawId
  const hash = Math.abs(
    rawId.split('').reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0)
  ) % 10000;
  const pad = String(hash).padStart(4, '0');

  switch (type) {
    case 'PROJECT':
      return explicitNumber ? `PRJ-${explicitNumber.toUpperCase()}` : `PRJ-${yearSafe}-${pad}`;
    case 'BOQ':
      return explicitNumber ? `BOQ-${explicitNumber.toUpperCase()}` : `BOQ-${yearSafe}-${pad}`;
    case 'FLOOR_ABSTRACT':
      return explicitNumber ? `FAB-${explicitNumber.toUpperCase()}` : `FAB-${yearSafe}-${pad}`;
    case 'CLIENT_FLOOR_BILL':
      return explicitNumber ? `CFB-${explicitNumber.toUpperCase()}` : `CFB-${yearSafe}-${pad}`;
    case 'BILLING':
      return explicitNumber ? (explicitNumber.startsWith('RA-') || explicitNumber.startsWith('BILL-') ? explicitNumber : `BILL-${yearSafe}-${explicitNumber}`) : `BILL-${yearSafe}-${pad}`;
    case 'BILL_APPROVAL':
      return `APP-BIL-${explicitNumber || pad}`;
    case 'CLIENT_PAYMENT':
      return explicitNumber ? (explicitNumber.startsWith('CPAY-') ? explicitNumber : `CPAY-${yearSafe}-${explicitNumber}`) : `CPAY-${yearSafe}-${pad}`;
    case 'CLIENT_LEDGER':
      return `CLED-${explicitNumber || 'MAIN'}`;
    case 'WORKER':
      return explicitNumber ? (explicitNumber.startsWith('WRK-') ? explicitNumber : `WRK-${explicitNumber}`) : `WRK-${pad}`;
    case 'ATTENDANCE':
      return `ATT-${dateStr || yearSafe}-${pad}`;
    case 'DLR':
      return `DLR-${dateStr || yearSafe}-${pad}`;
    case 'KHARCHI':
      return `KHAR-${dateStr || yearSafe}-${pad}`;
    case 'ADVANCE':
      return `ADV-${dateStr || yearSafe}-${pad}`;
    case 'WORKER_PAYMENT':
      return `WPAY-${explicitNumber || `${yearSafe}-${pad}`}`;
    case 'WORKER_PAYMENT_APPROVAL':
      return `APP-WPAY-${explicitNumber || pad}`;
    case 'WORKER_LEDGER':
      return `WLED-${explicitNumber || pad}`;
    case 'WORKER_HOLD':
      return `WHOLD-${explicitNumber || pad}`;
    case 'SUBCONTRACTOR':
      return explicitNumber ? `SUB-${explicitNumber}` : `SUB-${pad}`;
    case 'SUBCONTRACTOR_BILL':
      return explicitNumber ? (explicitNumber.startsWith('SBIL-') ? explicitNumber : `SBIL-${yearSafe}-${explicitNumber}`) : `SBIL-${yearSafe}-${pad}`;
    case 'SUBCONTRACTOR_PAYMENT':
      return `SPAY-${yearSafe}-${pad}`;
    case 'SUBCONTRACTOR_LEDGER':
      return `SLED-${explicitNumber || pad}`;
    case 'EXPENSE':
      return `EXP-${yearSafe}-${pad}`;
    case 'EXPENSE_APPROVAL':
      return `APP-EXP-${pad}`;
    case 'MESS_BOOKING':
      return `MESS-${yearSafe}-${pad}`;
    case 'MATERIAL_ITEM':
      return explicitNumber ? `MAT-${explicitNumber}` : `MAT-${pad}`;
    case 'MATERIAL_PURCHASE':
      return explicitNumber ? `MPUR-${explicitNumber}` : `MPUR-${yearSafe}-${pad}`;
    case 'MATERIAL_ISSUE':
      return explicitNumber ? `MISS-${explicitNumber}` : `MISS-${yearSafe}-${pad}`;
    case 'MATERIAL_RETURN':
      return explicitNumber ? `MRET-${explicitNumber}` : `MRET-${yearSafe}-${pad}`;
    case 'MATERIAL_TRANSFER':
      return `MTRF-${yearSafe}-${pad}`;
    case 'ASSET':
      return explicitNumber ? `AST-${explicitNumber}` : `AST-${pad}`;
    case 'ASSET_TRANSFER':
      return `ATRF-${dateStr || yearSafe}-${pad}`;
    case 'ASSET_MAINTENANCE':
      return `AMNT-${dateStr || yearSafe}-${pad}`;
    case 'DMS_DOCUMENT':
      return `DMS-${yearSafe}-${pad}`;
    default:
      return `DOC-${yearSafe}-${pad}`;
  }
}

// Extract standard status badge color
export function getStatusColor(status: DocFlowStatus): 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'gray' | 'slate' {
  switch (status) {
    case 'Paid':
    case 'Approved':
    case 'Posted & Locked':
    case 'Posted':
    case 'Certified':
    case 'Completed':
      return 'green';
    case 'Active':
    case 'Submitted':
    case 'Under Review':
      return 'blue';
    case 'Pending Approval':
    case 'Planning':
    case 'Partially Paid':
    case 'Draft':
      return 'amber';
    case 'Rejected':
    case 'On Hold':
    case 'Outstanding':
      return 'red';
    case 'Reversed':
      return 'purple';
    case 'Archived':
      return 'gray';
    default:
      return 'slate';
  }
}

/**
 * Builds the complete unified map of Document Flow Nodes across all modules
 */
export function buildAllDocumentNodes(
  erpState: any, 
  extraSubcontractors?: {
    subcontractors?: any[];
    bills?: any[];
    payments?: any[];
  }
): Record<string, DocFlowNode> {
  const nodes: Record<string, DocFlowNode> = {};

  const projects = erpState.projects || [];
  const projectMap: Record<string, any> = {};
  projects.forEach((p: any) => { projectMap[p.id] = p; });

  const workers = erpState.workers || [];
  const workerMap: Record<string, any> = {};
  workers.forEach((w: any) => { workerMap[w.id] = w; });

  // 1. Projects
  projects.forEach((p: any, idx: number) => {
    const docNumber = formatSapDocNumber('PROJECT', p.id, p.workOrderNo || p.id, p.startDate);
    const status: DocFlowStatus = p.status === 'Completed' ? 'Completed' 
      : p.status === 'On Hold' ? 'On Hold' 
      : p.status === 'Archived' ? 'Archived' 
      : 'Active';

    nodes[`PRJ-${p.id}`] = {
      id: `PRJ-${p.id}`,
      rawId: p.id,
      documentNumber: docNumber,
      documentType: 'PROJECT',
      documentTypeName: 'Project Master',
      category: 'Project',
      title: p.name,
      subtitle: `Client: ${p.clientName || 'Direct Site'} | Type: ${p.projectType || 'Contract'}`,
      date: p.startDate || '2026-01-01',
      amount: p.budget || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: [],
      followUpDocIds: [],
      projectId: p.id,
      projectName: p.name,
      clientName: p.clientName,
      targetTab: 'projects',
      targetProps: { searchQuery: p.name },
      audit: {
        createdBy: p.projectManager || 'System Administrator',
        createdDate: p.startDate,
        modifiedBy: p.siteIncharge || 'Project PM',
        modifiedDate: p.completionDate
      },
      rawEntity: p,
      stageOrder: 10
    };
  });

  // 2. BOQ Masters
  const boqs = erpState.boqs || [];
  boqs.forEach((boq: any) => {
    const proj = projectMap[boq.projectId];
    const docNumber = formatSapDocNumber('BOQ', boq.id, boq.boqNo, boq.date);
    const totalBoqAmount = (boq.items || []).reduce((sum: number, it: any) => sum + (it.boqAmount || (it.boqQuantity * it.boqRate) || 0), 0);
    const status: DocFlowStatus = boq.status === 'Approved' ? 'Approved' 
      : boq.status === 'Closed' ? 'Completed' 
      : boq.status === 'Pending Approval' ? 'Pending Approval' 
      : 'Draft';

    const nodeId = `BOQ-${boq.id}`;
    const preceding: string[] = [];
    if (boq.projectId && nodes[`PRJ-${boq.projectId}`]) {
      preceding.push(`PRJ-${boq.projectId}`);
      nodes[`PRJ-${boq.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: boq.id,
      documentNumber: docNumber,
      documentType: 'BOQ',
      documentTypeName: 'Bill of Quantities (BOQ)',
      category: 'Billing',
      title: `BOQ: ${boq.boqNo || docNumber} (Rev ${boq.revisionNo || 0})`,
      subtitle: `${proj?.name || 'Site'} | Items: ${(boq.items || []).length} | Client: ${boq.clientName || proj?.clientName || 'Client'}`,
      date: boq.date || '2026-01-01',
      amount: totalBoqAmount,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: boq.projectId,
      projectName: proj?.name,
      clientName: boq.clientName || proj?.clientName,
      targetTab: 'boqs',
      targetProps: { boqId: boq.id },
      audit: {
        createdBy: boq.createdBy || 'Billing Engineer',
        createdDate: boq.createdDate || boq.date,
        modifiedBy: boq.modifiedBy,
        modifiedDate: boq.modifiedDate
      },
      rawEntity: boq,
      stageOrder: 20
    };
  });

  // 3. Floor Abstracts
  const floorAbstracts = erpState.floorAbstracts || [];
  floorAbstracts.forEach((fa: any) => {
    const proj = projectMap[fa.projectId];
    const docNumber = formatSapDocNumber('FLOOR_ABSTRACT', fa.id, fa.srNo ? `FAB-${fa.srNo}` : undefined);
    const status: DocFlowStatus = 'Posted';
    const nodeId = `FAB-${fa.id}`;

    const preceding: string[] = [];
    if (fa.projectId && nodes[`PRJ-${fa.projectId}`]) {
      preceding.push(`PRJ-${fa.projectId}`);
      nodes[`PRJ-${fa.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: fa.id,
      documentNumber: docNumber,
      documentType: 'FLOOR_ABSTRACT',
      documentTypeName: 'Floor Abstract / Measurement',
      category: 'Billing',
      title: `Floor Abstract: ${fa.level || 'Level'} - Flat ${fa.flatNo || 'All'}`,
      subtitle: `${proj?.name || 'Project'} | Tower: ${fa.towerName || 'Main'} | Category: ${fa.category}`,
      date: '2026-01-15',
      amount: fa.amount || 0,
      quantity: fa.flatHajira || fa.totalHajira,
      unit: fa.category === 'Hajira' ? 'Hajira' : '₹',
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: fa.projectId,
      projectName: proj?.name,
      targetTab: 'floor-abstracts',
      targetProps: { level: fa.level, flatNo: fa.flatNo },
      audit: {
        createdBy: 'Site Supervisor',
        createdDate: '2026-01-15'
      },
      rawEntity: fa,
      stageOrder: 30
    };
  });

  // 4. Client Floor Bills
  const clientFloorBills = erpState.clientFloorBills || [];
  clientFloorBills.forEach((cfb: any) => {
    const proj = projectMap[cfb.projectId];
    const docNumber = formatSapDocNumber('CLIENT_FLOOR_BILL', cfb.id, cfb.srNo ? `CFB-${cfb.srNo}` : undefined);
    const status: DocFlowStatus = 'Certified';
    const nodeId = `CFB-${cfb.id}`;

    const preceding: string[] = [];
    if (cfb.projectId && nodes[`PRJ-${cfb.projectId}`]) {
      preceding.push(`PRJ-${cfb.projectId}`);
      nodes[`PRJ-${cfb.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: cfb.id,
      documentNumber: docNumber,
      documentType: 'CLIENT_FLOOR_BILL',
      documentTypeName: 'Client Floor Measurement Area',
      category: 'Billing',
      title: `Area Bill: ${cfb.floor || 'Floor'} - Unit ${cfb.unit || 'Sqft'}`,
      subtitle: `${proj?.name || 'Project'} | Built-Up: ${cfb.builtUpArea || 0} sqft | Workdone: ${cfb.workdoneArea || 0} sqft`,
      date: '2026-02-01',
      amount: cfb.totalAmount || 0,
      quantity: cfb.workdoneArea || 0,
      unit: 'Sqft',
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: cfb.projectId,
      projectName: proj?.name,
      targetTab: 'bill-tracking',
      targetProps: { projectId: cfb.projectId },
      audit: {
        createdBy: 'Billing Engineer',
        createdDate: '2026-02-01'
      },
      rawEntity: cfb,
      stageOrder: 35
    };
  });

  // 5. Billings (RA Bills / Final Bills)
  const billings = erpState.billings || [];
  billings.forEach((b: any) => {
    const proj = projectMap[b.projectId];
    const docNumber = formatSapDocNumber('BILLING', b.id, b.billNo, b.certifyDate);
    const status: DocFlowStatus = b.certifyDate ? 'Certified' : 'Submitted';
    const nodeId = `BILL-${b.id}`;

    const preceding: string[] = [];
    if (b.projectId && nodes[`PRJ-${b.projectId}`]) {
      preceding.push(`PRJ-${b.projectId}`);
      nodes[`PRJ-${b.projectId}`].followUpDocIds.push(nodeId);
    }

    // Connect to BOQ if project matches
    boqs.filter((bq: any) => bq.projectId === b.projectId).forEach((bq: any) => {
      if (nodes[`BOQ-${bq.id}`] && !preceding.includes(`BOQ-${bq.id}`)) {
        preceding.push(`BOQ-${bq.id}`);
        nodes[`BOQ-${bq.id}`].followUpDocIds.push(nodeId);
      }
    });

    // Connect to Floor Abstract if project matches
    floorAbstracts.filter((fa: any) => fa.projectId === b.projectId).slice(0, 3).forEach((fa: any) => {
      if (nodes[`FAB-${fa.id}`] && !preceding.includes(`FAB-${fa.id}`)) {
        preceding.push(`FAB-${fa.id}`);
        nodes[`FAB-${fa.id}`].followUpDocIds.push(nodeId);
      }
    });

    nodes[nodeId] = {
      id: nodeId,
      rawId: b.id,
      documentNumber: docNumber,
      documentType: 'BILLING',
      documentTypeName: b.billType || 'Running Account (RA) Bill',
      category: 'Billing',
      title: `RA Bill: ${b.billNo || docNumber}`,
      subtitle: `${proj?.name || 'Project'} | Work Nature: ${b.workNature || 'Civil Work'} | Month: ${b.month || '2026-01'}`,
      date: b.certifyDate || '2026-01-31',
      amount: b.amount || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: b.projectId,
      projectName: proj?.name,
      clientName: proj?.clientName,
      targetTab: 'billing',
      targetProps: { searchQuery: b.billNo },
      audit: {
        createdBy: proj?.billingEngineer || 'Billing Engineer',
        createdDate: b.certifyDate,
        approvedBy: proj?.projectManager || 'Project Manager',
        approvedDate: b.certifyDate,
        postedBy: 'Chief Accounts Officer',
        postedDate: b.certifyDate
      },
      rawEntity: b,
      stageOrder: 40
    };
  });

  // 6. Client Payments
  const clientPayments = erpState.clientPayments || [];
  clientPayments.forEach((cp: any) => {
    const proj = projectMap[cp.projectId];
    const docNumber = formatSapDocNumber('CLIENT_PAYMENT', cp.id, cp.paymentReference || cp.utrChequeNo, cp.date);
    const status: DocFlowStatus = 'Posted & Locked';
    const nodeId = `CPAY-${cp.id}`;

    const preceding: string[] = [];
    if (cp.projectId && nodes[`PRJ-${cp.projectId}`]) {
      preceding.push(`PRJ-${cp.projectId}`);
      nodes[`PRJ-${cp.projectId}`].followUpDocIds.push(nodeId);
    }

    // Connect to specific bill if linked, otherwise link to project bills
    if (cp.billId && nodes[`BILL-${cp.billId}`]) {
      preceding.push(`BILL-${cp.billId}`);
      nodes[`BILL-${cp.billId}`].followUpDocIds.push(nodeId);
    } else {
      billings.filter((b: any) => b.projectId === cp.projectId).forEach((b: any) => {
        if (nodes[`BILL-${b.id}`] && !preceding.includes(`BILL-${b.id}`)) {
          preceding.push(`BILL-${b.id}`);
          nodes[`BILL-${b.id}`].followUpDocIds.push(nodeId);
        }
      });
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: cp.id,
      documentNumber: docNumber,
      documentType: 'CLIENT_PAYMENT',
      documentTypeName: 'Client Receipt / Bank Voucher',
      category: 'Billing',
      title: `Client Receipt: ₹${(cp.amountReceived || 0).toLocaleString('en-IN')}`,
      subtitle: `${proj?.name || 'Project'} | Mode: ${cp.paymentMode || 'Bank Transfer'} | Bank: ${cp.bankName || 'HDFC Bank'} | Ref: ${cp.paymentReference || cp.utrChequeNo || 'Direct'}`,
      date: cp.date || '2026-02-15',
      amount: cp.amountReceived || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: cp.projectId,
      projectName: proj?.name,
      clientName: proj?.clientName,
      targetTab: 'client-payment',
      targetProps: { searchQuery: cp.paymentReference || cp.utrChequeNo },
      audit: {
        createdBy: 'Senior Accounts Officer',
        createdDate: cp.date,
        approvedBy: 'Finance Director',
        approvedDate: cp.date,
        postedBy: 'SAP Treasury Ledger',
        postedDate: cp.date
      },
      rawEntity: cp,
      stageOrder: 50
    };
  });

  // 7. Workers Master
  workers.forEach((w: any) => {
    const proj = projectMap[w.projectId];
    const docNumber = formatSapDocNumber('WORKER', w.id, w.workerId, w.joiningDate);
    const status: DocFlowStatus = w.exitDate ? 'Completed' : 'Active';
    const nodeId = `WRK-${w.id}`;

    const preceding: string[] = [];
    if (w.projectId && nodes[`PRJ-${w.projectId}`]) {
      preceding.push(`PRJ-${w.projectId}`);
      nodes[`PRJ-${w.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: w.id,
      documentNumber: docNumber,
      documentType: 'WORKER',
      documentTypeName: 'Worker Master Profile',
      category: 'Labour',
      title: `${w.name} (${w.designation || 'Labour'})`,
      subtitle: `Worker ID: ${w.workerId} | Site: ${proj?.name || 'Unassigned'} | Mobile: ${w.mobileNo || 'N/A'}`,
      date: w.joiningDate || '2026-01-01',
      amount: w.openingAdvance || 0,
      quantity: w.dailyRate || 0,
      unit: '₹/Day',
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: w.projectId,
      projectName: proj?.name,
      workerId: w.id,
      workerName: w.name,
      targetTab: 'workers',
      targetProps: { initialWorkerId: w.id, initialView: 'list' },
      audit: {
        createdBy: 'HR / Site Timekeeper',
        createdDate: w.joiningDate
      },
      rawEntity: w,
      stageOrder: 15
    };
  });

  // 8. DLR (Daily Labour Report)
  const dlrs = erpState.dlrs || [];
  dlrs.forEach((dlr: any) => {
    const proj = projectMap[dlr.projectId];
    const docNumber = formatSapDocNumber('DLR', dlr.id, undefined, dlr.date);
    const totalLabour = (dlr.carpenter || 0) + (dlr.fitter || 0) + (dlr.helper || 0) + (dlr.mason || 0) + (dlr.rigger || 0) + (dlr.staff || 0);
    const status: DocFlowStatus = 'Posted & Locked';
    const nodeId = `DLR-${dlr.id}`;

    const preceding: string[] = [];
    if (dlr.projectId && nodes[`PRJ-${dlr.projectId}`]) {
      preceding.push(`PRJ-${dlr.projectId}`);
      nodes[`PRJ-${dlr.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: dlr.id,
      documentNumber: docNumber,
      documentType: 'DLR',
      documentTypeName: 'Daily Labour Report (DLR)',
      category: 'Labour',
      title: `DLR: ${dlr.date} (${totalLabour} Workers on site)`,
      subtitle: `${proj?.name || 'Project'} | Carp: ${dlr.carpenter || 0}, Fitter: ${dlr.fitter || 0}, Mason: ${dlr.mason || 0}, Helper: ${dlr.helper || 0}`,
      date: dlr.date || '2026-02-01',
      quantity: totalLabour,
      unit: 'Labour',
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: dlr.projectId,
      projectName: proj?.name,
      targetTab: 'dlr',
      targetProps: { date: dlr.date },
      audit: {
        createdBy: 'Site Engineer',
        createdDate: dlr.date
      },
      rawEntity: dlr,
      stageOrder: 22
    };
  });

  // 9. Kharchi & Advances
  const kharchis = erpState.kharchis || [];
  kharchis.forEach((kh: any) => {
    const wrk = workerMap[kh.workerId];
    const proj = projectMap[kh.projectId];
    const docNumber = formatSapDocNumber('KHARCHI', kh.id, undefined, kh.date);
    const status: DocFlowStatus = 'Posted';
    const nodeId = `KHAR-${kh.id}`;

    const preceding: string[] = [];
    if (kh.workerId && nodes[`WRK-${kh.workerId}`]) {
      preceding.push(`WRK-${kh.workerId}`);
      nodes[`WRK-${kh.workerId}`].followUpDocIds.push(nodeId);
    }
    if (kh.projectId && nodes[`PRJ-${kh.projectId}`] && !preceding.includes(`PRJ-${kh.projectId}`)) {
      preceding.push(`PRJ-${kh.projectId}`);
      nodes[`PRJ-${kh.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: kh.id,
      documentNumber: docNumber,
      documentType: 'KHARCHI',
      documentTypeName: 'Kharchi (Pocket Money Voucher)',
      category: 'Labour',
      title: `Kharchi: ₹${(kh.amount || 0).toLocaleString('en-IN')} - ${wrk?.name || 'Worker'}`,
      subtitle: `${proj?.name || 'Project'} | Date: ${kh.date}`,
      date: kh.date || '2026-02-01',
      amount: kh.amount || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: kh.projectId,
      projectName: proj?.name,
      workerId: kh.workerId,
      workerName: wrk?.name,
      targetTab: 'kharchi',
      targetProps: { workerId: kh.workerId },
      audit: {
        createdBy: 'Site Supervisor',
        createdDate: kh.date
      },
      rawEntity: kh,
      stageOrder: 25
    };
  });

  const advances = erpState.advances || [];
  advances.forEach((adv: any) => {
    const wrk = workerMap[adv.workerId];
    const proj = projectMap[adv.projectId];
    const docNumber = formatSapDocNumber('ADVANCE', adv.id, undefined, adv.date);
    const status: DocFlowStatus = adv.isDeducted ? 'Completed' : 'Active';
    const nodeId = `ADV-${adv.id}`;

    const preceding: string[] = [];
    if (adv.workerId && nodes[`WRK-${adv.workerId}`]) {
      preceding.push(`WRK-${adv.workerId}`);
      nodes[`WRK-${adv.workerId}`].followUpDocIds.push(nodeId);
    }
    if (adv.projectId && nodes[`PRJ-${adv.projectId}`] && !preceding.includes(`PRJ-${adv.projectId}`)) {
      preceding.push(`PRJ-${adv.projectId}`);
      nodes[`PRJ-${adv.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: adv.id,
      documentNumber: docNumber,
      documentType: 'ADVANCE',
      documentTypeName: 'Worker Advance Voucher',
      category: 'Labour',
      title: `Advance: ₹${(adv.amount || 0).toLocaleString('en-IN')} - ${wrk?.name || 'Worker'}`,
      subtitle: `${proj?.name || 'Project'} | Paid By: ${adv.paidBy || 'Site Office'} | Deducted: ${adv.isDeducted ? 'Yes' : 'Pending'}`,
      date: adv.date || '2026-02-01',
      amount: adv.amount || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: adv.projectId,
      projectName: proj?.name,
      workerId: adv.workerId,
      workerName: wrk?.name,
      targetTab: 'advance',
      targetProps: { workerId: adv.workerId },
      audit: {
        createdBy: adv.paidBy || 'Site Accountant',
        createdDate: adv.date
      },
      rawEntity: adv,
      stageOrder: 26
    };
  });

  // 10. Worker Payments
  const workerPayments = erpState.workerPayments || [];
  workerPayments.forEach((wp: any) => {
    const wrk = workerMap[wp.workerId];
    const proj = projectMap[wp.projectId];
    const docNumber = formatSapDocNumber('WORKER_PAYMENT', wp.id, `${wp.month}-${wrk?.workerId || wp.workerId}`, wp.date);
    const status: DocFlowStatus = wp.paymentStatus === 'Paid' ? 'Paid' : 'Posted & Locked';
    const nodeId = `WPAY-${wp.id}`;

    const preceding: string[] = [];
    if (wp.workerId && nodes[`WRK-${wp.workerId}`]) {
      preceding.push(`WRK-${wp.workerId}`);
      nodes[`WRK-${wp.workerId}`].followUpDocIds.push(nodeId);
    }
    if (wp.projectId && nodes[`PRJ-${wp.projectId}`] && !preceding.includes(`PRJ-${wp.projectId}`)) {
      preceding.push(`PRJ-${wp.projectId}`);
      nodes[`PRJ-${wp.projectId}`].followUpDocIds.push(nodeId);
    }

    // Link preceding kharchi & advance for that month
    kharchis.filter((k: any) => k.workerId === wp.workerId && k.date.startsWith(wp.month)).forEach((k: any) => {
      if (nodes[`KHAR-${k.id}`] && !preceding.includes(`KHAR-${k.id}`)) {
        preceding.push(`KHAR-${k.id}`);
        nodes[`KHAR-${k.id}`].followUpDocIds.push(nodeId);
      }
    });

    advances.filter((a: any) => a.workerId === wp.workerId).forEach((a: any) => {
      if (nodes[`ADV-${a.id}`] && !preceding.includes(`ADV-${a.id}`)) {
        preceding.push(`ADV-${a.id}`);
        nodes[`ADV-${a.id}`].followUpDocIds.push(nodeId);
      }
    });

    nodes[nodeId] = {
      id: nodeId,
      rawId: wp.id,
      documentNumber: docNumber,
      documentType: 'WORKER_PAYMENT',
      documentTypeName: 'Worker Monthly Wage Sheet',
      category: 'Labour',
      title: `Wage Sheet (${wp.month}): ${wrk?.name || 'Worker'} - ₹${(wp.netPayment || 0).toLocaleString('en-IN')}`,
      subtitle: `${proj?.name || 'Project'} | Work Amount: ₹${wp.workAmount || 0} | Deductions: ₹${(wp.messDeduction || 0) + (wp.kharchiDeduction || 0) + (wp.advanceDeduction || 0)}`,
      date: wp.date || '2026-02-28',
      amount: wp.netPayment || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: wp.projectId,
      projectName: proj?.name,
      workerId: wp.workerId,
      workerName: wrk?.name,
      targetTab: 'worker-payment',
      targetProps: { initialWorkerId: wp.workerId },
      audit: {
        createdBy: 'Timekeeper / Payroll Engineer',
        createdDate: wp.date,
        approvedBy: 'Site Incharge',
        approvedDate: wp.date,
        postedBy: 'SAP Payroll Engine',
        postedDate: wp.date
      },
      rawEntity: wp,
      stageOrder: 45
    };
  });

  // 11. Worker Ledger
  const workerLedgers = erpState.workerLedger || [];
  workerLedgers.forEach((wl: any) => {
    const wrk = workerMap[wl.workerId];
    const proj = projectMap[wl.projectId];
    const docNumber = formatSapDocNumber('WORKER_LEDGER', wl.id, wl.voucherNo, wl.date);
    const status: DocFlowStatus = 'Posted';
    const nodeId = `WLED-${wl.id}`;

    const preceding: string[] = [];
    if (wl.workerId && nodes[`WRK-${wl.workerId}`]) {
      preceding.push(`WRK-${wl.workerId}`);
      nodes[`WRK-${wl.workerId}`].followUpDocIds.push(nodeId);
    }
    if (wl.paymentId && nodes[`WPAY-${wl.paymentId}`]) {
      preceding.push(`WPAY-${wl.paymentId}`);
      nodes[`WPAY-${wl.paymentId}`].followUpDocIds.push(nodeId);
    }
    if (wl.advanceId && nodes[`ADV-${wl.advanceId}`]) {
      preceding.push(`ADV-${wl.advanceId}`);
      nodes[`ADV-${wl.advanceId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: wl.id,
      documentNumber: docNumber,
      documentType: 'WORKER_LEDGER',
      documentTypeName: 'Worker Ledger Entry',
      category: 'Labour',
      title: `Ledger [${wl.entryType}]: ${wrk?.name || 'Worker'}`,
      subtitle: `${wl.description || 'Ledger Posting'} | Running Balance: ₹${(wl.runningBalance || 0).toLocaleString('en-IN')}`,
      date: wl.date || '2026-02-28',
      amount: wl.debit > 0 ? wl.debit : wl.credit,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: wl.projectId,
      projectName: proj?.name,
      workerId: wl.workerId,
      workerName: wrk?.name,
      targetTab: 'worker-ledger',
      targetProps: { workerId: wl.workerId },
      audit: {
        createdBy: wl.createdBy || 'Accounts Officer',
        createdDate: wl.createdDate || wl.date
      },
      rawEntity: wl,
      stageOrder: 55
    };
  });

  // 12. Expenses & Petty Cash
  const expenses = erpState.expensesLedger || [];
  expenses.forEach((exp: any) => {
    const proj = projectMap[exp.projectId];
    const totalExp = (exp.kharchi || 0) + (exp.mess || 0) + (exp.workerAdvance || 0) + (exp.tiffin || 0) + (exp.travel || 0) + (exp.machineryMaterial || 0) + (exp.workerPayment || 0) + (exp.stationery || 0) + (exp.others || 0);
    const docNumber = formatSapDocNumber('EXPENSE', exp.id, undefined, exp.date);
    const status: DocFlowStatus = exp.status === 'Approved' ? 'Approved' 
      : exp.status === 'Rejected' ? 'Rejected' 
      : exp.status === 'Submitted' ? 'Submitted' 
      : 'Draft';
    const nodeId = `EXP-${exp.id}`;

    const preceding: string[] = [];
    if (exp.projectId && nodes[`PRJ-${exp.projectId}`]) {
      preceding.push(`PRJ-${exp.projectId}`);
      nodes[`PRJ-${exp.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: exp.id,
      documentNumber: docNumber,
      documentType: 'EXPENSE',
      documentTypeName: 'Petty Cash / Site Expense Voucher',
      category: 'Expense',
      title: `Expense Voucher: ₹${totalExp.toLocaleString('en-IN')}`,
      subtitle: `${exp.description || 'Site Operations'} | Project: ${proj?.name || 'General Site'}`,
      date: exp.date || '2026-02-01',
      amount: totalExp,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: exp.projectId,
      projectName: proj?.name,
      targetTab: 'expenses',
      targetProps: { expenseId: exp.id },
      audit: {
        createdBy: 'Site Engineer / Cashier',
        createdDate: exp.date,
        approvedBy: exp.status === 'Approved' ? 'Project Accountant' : undefined,
        approvedDate: exp.status === 'Approved' ? exp.date : undefined,
        postedBy: 'SAP General Ledger',
        postedDate: exp.date
      },
      rawEntity: exp,
      stageOrder: 32
    };
  });

  // 13. Mess Bookings
  const messBookings = erpState.messBookings || [];
  messBookings.forEach((mb: any) => {
    const proj = projectMap[mb.projectId];
    const docNumber = formatSapDocNumber('MESS_BOOKING', mb.id, undefined, mb.fromDate);
    const status: DocFlowStatus = mb.amountDue <= 0 ? 'Paid' : 'Partially Paid';
    const nodeId = `MESS-${mb.id}`;

    const preceding: string[] = [];
    if (mb.projectId && nodes[`PRJ-${mb.projectId}`]) {
      preceding.push(`PRJ-${mb.projectId}`);
      nodes[`PRJ-${mb.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: mb.id,
      documentNumber: docNumber,
      documentType: 'MESS_BOOKING',
      documentTypeName: 'Labour Mess Catering Bill',
      category: 'Expense',
      title: `Mess Bill: ${mb.fromDate} to ${mb.toDate}`,
      subtitle: `${proj?.name || 'Project'} | Paid To: ${mb.paidTo || 'Mess Vendor'} | Workers: ${mb.workerCount || 0}`,
      date: mb.paymentDate || mb.fromDate || '2026-02-01',
      amount: mb.totalComputed || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: mb.projectId,
      projectName: proj?.name,
      targetTab: 'mess',
      targetProps: { messId: mb.id },
      audit: {
        createdBy: 'Mess Committee Incharge',
        createdDate: mb.paymentDate || mb.fromDate
      },
      rawEntity: mb,
      stageOrder: 33
    };
  });

  // 14. Subcontractors (from extraSubcontractors or props)
  const subcontractors = extraSubcontractors?.subcontractors || [];
  const subMap: Record<string, any> = {};
  subcontractors.forEach((s: any) => { subMap[s.id] = s; });

  subcontractors.forEach((s: any) => {
    const docNumber = formatSapDocNumber('SUBCONTRACTOR', s.id, s.name);
    const status: DocFlowStatus = s.status === 'Active' ? 'Active' : 'Completed';
    const nodeId = `SUB-${s.id}`;

    nodes[nodeId] = {
      id: nodeId,
      rawId: s.id,
      documentNumber: docNumber,
      documentType: 'SUBCONTRACTOR',
      documentTypeName: 'Subcontractor Master',
      category: 'Subcontractor',
      title: `${s.name} (${s.firmName || 'Contractor'})`,
      subtitle: `Trade: ${s.workCategory || 'General'} | Contact: ${s.contactNumber || 'N/A'}`,
      date: s.agreementDate || '2026-01-01',
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: [],
      followUpDocIds: [],
      subcontractorId: s.id,
      subcontractorName: s.name,
      targetTab: 'subcontractors-master',
      targetProps: { subcontractorId: s.id },
      audit: {
        createdBy: s.createdBy || 'Contracts Department',
        createdDate: s.createdDate || s.agreementDate
      },
      rawEntity: s,
      stageOrder: 12
    };
  });

  // 15. Subcontractor Bills
  const subBills = extraSubcontractors?.bills || [];
  subBills.forEach((sb: any) => {
    const proj = projectMap[sb.projectId];
    const sub = subMap[sb.subcontractorId];
    const docNumber = formatSapDocNumber('SUBCONTRACTOR_BILL', sb.id, sb.billNo, sb.billDate);
    const status: DocFlowStatus = sb.status === 'Posted & Locked' ? 'Posted & Locked' 
      : sb.status === 'Approved' ? 'Approved' 
      : 'Draft';
    const nodeId = `SBIL-${sb.id}`;

    const preceding: string[] = [];
    if (sb.subcontractorId && nodes[`SUB-${sb.subcontractorId}`]) {
      preceding.push(`SUB-${sb.subcontractorId}`);
      nodes[`SUB-${sb.subcontractorId}`].followUpDocIds.push(nodeId);
    }
    if (sb.projectId && nodes[`PRJ-${sb.projectId}`] && !preceding.includes(`PRJ-${sb.projectId}`)) {
      preceding.push(`PRJ-${sb.projectId}`);
      nodes[`PRJ-${sb.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: sb.id,
      documentNumber: docNumber,
      documentType: 'SUBCONTRACTOR_BILL',
      documentTypeName: 'Subcontractor RA Bill',
      category: 'Subcontractor',
      title: `Subcontractor Bill #${sb.billNo || docNumber}`,
      subtitle: `${sub?.name || 'Contractor'} | Net Payable: ₹${(sb.netPayableAmount || 0).toLocaleString('en-IN')}`,
      date: sb.billDate || '2026-02-01',
      amount: sb.grossAmount || sb.netPayableAmount || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: sb.projectId,
      projectName: proj?.name,
      subcontractorId: sb.subcontractorId,
      subcontractorName: sub?.name,
      targetTab: 'subcontractors-billing',
      targetProps: { billNo: sb.billNo },
      audit: {
        createdBy: sb.createdBy || 'Billing Surveyor',
        createdDate: sb.createdDate || sb.billDate,
        approvedBy: sb.modifiedBy || 'Chief Project Manager',
        approvedDate: sb.billDate,
        postedBy: 'SAP Subcontractor Module',
        postedDate: sb.billDate
      },
      rawEntity: sb,
      stageOrder: 42
    };
  });

  // 16. Subcontractor Payments
  const subPayments = extraSubcontractors?.payments || [];
  subPayments.forEach((sp: any) => {
    const proj = projectMap[sp.projectId];
    const sub = subMap[sp.subcontractorId];
    const docNumber = formatSapDocNumber('SUBCONTRACTOR_PAYMENT', sp.id, undefined, sp.date);
    const status: DocFlowStatus = 'Posted & Locked';
    const nodeId = `SPAY-${sp.id}`;

    const preceding: string[] = [];
    if (sp.subcontractorId && nodes[`SUB-${sp.subcontractorId}`]) {
      preceding.push(`SUB-${sp.subcontractorId}`);
      nodes[`SUB-${sp.subcontractorId}`].followUpDocIds.push(nodeId);
    }
    if (sp.projectId && nodes[`PRJ-${sp.projectId}`] && !preceding.includes(`PRJ-${sp.projectId}`)) {
      preceding.push(`PRJ-${sp.projectId}`);
      nodes[`PRJ-${sp.projectId}`].followUpDocIds.push(nodeId);
    }

    // Link to Subcontractor Bills
    subBills.filter((sb: any) => sb.subcontractorId === sp.subcontractorId).forEach((sb: any) => {
      if (nodes[`SBIL-${sb.id}`] && !preceding.includes(`SBIL-${sb.id}`)) {
        preceding.push(`SBIL-${sb.id}`);
        nodes[`SBIL-${sb.id}`].followUpDocIds.push(nodeId);
      }
    });

    nodes[nodeId] = {
      id: nodeId,
      rawId: sp.id,
      documentNumber: docNumber,
      documentType: 'SUBCONTRACTOR_PAYMENT',
      documentTypeName: 'Subcontractor Payment Voucher',
      category: 'Subcontractor',
      title: `Subcontractor Payment: ₹${(sp.amount || 0).toLocaleString('en-IN')}`,
      subtitle: `${sub?.name || 'Contractor'} | Mode: ${sp.paymentMode || 'Bank Transfer'}`,
      date: sp.date || '2026-02-15',
      amount: sp.amount || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: sp.projectId,
      projectName: proj?.name,
      subcontractorId: sp.subcontractorId,
      subcontractorName: sub?.name,
      targetTab: 'subcontractors-payments',
      targetProps: { subcontractorId: sp.subcontractorId },
      audit: {
        createdBy: sp.createdBy || 'Finance Manager',
        createdDate: sp.createdDate || sp.date,
        postedBy: 'SAP Treasury',
        postedDate: sp.date
      },
      rawEntity: sp,
      stageOrder: 52
    };
  });

  // 17. Materials (Purchases, Issues, Returns)
  const matItems = erpState.materialItems || [];
  const matItemMap: Record<string, any> = {};
  matItems.forEach((m: any) => { matItemMap[m.id] = m; });

  const matPurchases = erpState.materialPurchases || [];
  matPurchases.forEach((mp: any) => {
    const proj = projectMap[mp.projectId];
    const itm = matItemMap[mp.itemId];
    const docNumber = formatSapDocNumber('MATERIAL_PURCHASE', mp.id, mp.purchaseVoucherNo || mp.invoiceNumber, mp.purchaseDate);
    const status: DocFlowStatus = 'Posted & Locked';
    const nodeId = `MPUR-${mp.id}`;

    const preceding: string[] = [];
    if (mp.projectId && nodes[`PRJ-${mp.projectId}`]) {
      preceding.push(`PRJ-${mp.projectId}`);
      nodes[`PRJ-${mp.projectId}`].followUpDocIds.push(nodeId);
    }

    nodes[nodeId] = {
      id: nodeId,
      rawId: mp.id,
      documentNumber: docNumber,
      documentType: 'MATERIAL_PURCHASE',
      documentTypeName: 'Material Purchase / GRN (Goods Receipt)',
      category: 'Material',
      title: `Goods Receipt: ${itm?.itemName || 'Material'} (${mp.qty || 0} ${itm?.unit || 'Nos'})`,
      subtitle: `Supplier: ${mp.supplierName || 'Vendor'} | Total: ₹${(mp.grandTotal || mp.totalAmount || 0).toLocaleString('en-IN')}`,
      date: mp.purchaseDate || '2026-02-01',
      amount: mp.grandTotal || mp.totalAmount || 0,
      quantity: mp.qty || 0,
      unit: itm?.unit || 'Nos',
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: mp.projectId,
      projectName: proj?.name,
      targetTab: 'materials',
      targetProps: { initialTab: 'purchase' },
      audit: {
        createdBy: mp.createdBy || 'Store Manager',
        createdDate: mp.createdDate || mp.purchaseDate,
        postedBy: 'SAP Inventory Management',
        postedDate: mp.purchaseDate
      },
      rawEntity: mp,
      stageOrder: 28
    };
  });

  const matIssues = erpState.materialIssues || [];
  matIssues.forEach((mi: any) => {
    const proj = projectMap[mi.projectId];
    const itm = matItemMap[mi.itemId];
    const docNumber = formatSapDocNumber('MATERIAL_ISSUE', mi.id, mi.voucherNo, mi.issueDate);
    const status: DocFlowStatus = 'Posted & Locked';
    const nodeId = `MISS-${mi.id}`;

    const preceding: string[] = [];
    if (mi.projectId && nodes[`PRJ-${mi.projectId}`]) {
      preceding.push(`PRJ-${mi.projectId}`);
      nodes[`PRJ-${mi.projectId}`].followUpDocIds.push(nodeId);
    }

    // Link preceding material purchases for the same item
    matPurchases.filter((mp: any) => mp.itemId === mi.itemId && mp.projectId === mi.projectId).forEach((mp: any) => {
      if (nodes[`MPUR-${mp.id}`] && !preceding.includes(`MPUR-${mp.id}`)) {
        preceding.push(`MPUR-${mp.id}`);
        nodes[`MPUR-${mp.id}`].followUpDocIds.push(nodeId);
      }
    });

    nodes[nodeId] = {
      id: nodeId,
      rawId: mi.id,
      documentNumber: docNumber,
      documentType: 'MATERIAL_ISSUE',
      documentTypeName: 'Material Issue Voucher (MIV)',
      category: 'Material',
      title: `Material Issue: ${itm?.itemName || 'Material'} (${mi.qty || 0} ${itm?.unit || 'Nos'})`,
      subtitle: `${proj?.name || 'Project'} | Issued To: ${mi.issuedTo || 'Site Work'} | Tower: ${mi.tower || 'T1'}`,
      date: mi.issueDate || '2026-02-05',
      quantity: mi.qty || 0,
      unit: itm?.unit || 'Nos',
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: preceding,
      followUpDocIds: [],
      projectId: mi.projectId,
      projectName: proj?.name,
      targetTab: 'materials',
      targetProps: { initialTab: 'issue' },
      audit: {
        createdBy: mi.createdBy || 'Store Incharge',
        createdDate: mi.createdDate || mi.issueDate
      },
      rawEntity: mi,
      stageOrder: 36
    };
  });

  // 18. Equipment & Assets
  const assets = erpState.assets || [];
  assets.forEach((ast: any) => {
    const proj = projectMap[ast.currentSiteId];
    const docNumber = formatSapDocNumber('ASSET', ast.id, ast.assetCode, ast.purchaseDate);
    const status: DocFlowStatus = ast.status === 'Available' || ast.status === 'In Use' ? 'Active' : 'On Hold';
    const nodeId = `AST-${ast.id}`;

    nodes[nodeId] = {
      id: nodeId,
      rawId: ast.id,
      documentNumber: docNumber,
      documentType: 'ASSET',
      documentTypeName: 'Asset / Equipment Master',
      category: 'Asset',
      title: `${ast.name} (${ast.category})`,
      subtitle: `Code: ${ast.assetCode} | Site: ${proj?.name || 'General Warehouse'} | Brand: ${ast.brand || 'N/A'}`,
      date: ast.purchaseDate || '2026-01-01',
      amount: ast.purchaseCost || 0,
      status,
      statusColor: getStatusColor(status),
      precedingDocIds: [],
      followUpDocIds: [],
      projectId: ast.currentSiteId,
      projectName: proj?.name,
      targetTab: 'assets',
      targetProps: { assetId: ast.id },
      audit: {
        createdBy: ast.createdBy || 'Plant & Machinery Head',
        createdDate: ast.createdDate || ast.purchaseDate
      },
      rawEntity: ast,
      stageOrder: 18
    };
  });

  return nodes;
}

/**
 * Resolves full document chain, stages, and preceding/follow-up documents for a given node
 */
export function resolveDocumentChain(
  targetDocIdOrNum: string, 
  allNodes: Record<string, DocFlowNode>
): DocFlowChain | null {
  // Find node by exact key or document number or rawId
  let currentDoc = allNodes[targetDocIdOrNum];
  if (!currentDoc) {
    currentDoc = Object.values(allNodes).find(
      n => n.documentNumber.toLowerCase() === targetDocIdOrNum.toLowerCase() ||
           n.rawId === targetDocIdOrNum ||
           n.id.toLowerCase() === targetDocIdOrNum.toLowerCase()
    );
  }

  if (!currentDoc) {
    // If not found, return first available or empty
    const first = Object.values(allNodes)[0];
    if (!first) return null;
    currentDoc = first;
  }

  const relatedSet = new Set<string>();
  const visitedPreceding = new Set<string>();
  const visitedFollowUp = new Set<string>();

  // Upstream traversal (Preceding documents)
  function traversePreceding(nodeId: string) {
    const node = allNodes[nodeId];
    if (!node) return;
    node.precedingDocIds.forEach(pId => {
      if (!visitedPreceding.has(pId)) {
        visitedPreceding.add(pId);
        relatedSet.add(pId);
        traversePreceding(pId);
      }
    });
  }

  // Downstream traversal (Follow-up documents)
  function traverseFollowUp(nodeId: string) {
    const node = allNodes[nodeId];
    if (!node) return;
    node.followUpDocIds.forEach(fId => {
      if (!visitedFollowUp.has(fId)) {
        visitedFollowUp.add(fId);
        relatedSet.add(fId);
        traverseFollowUp(fId);
      }
    });
  }

  // Also include project-level related docs if current node belongs to a project
  if (currentDoc.projectId && allNodes[`PRJ-${currentDoc.projectId}`]) {
    relatedSet.add(`PRJ-${currentDoc.projectId}`);
  }

  relatedSet.add(currentDoc.id);
  traversePreceding(currentDoc.id);
  traverseFollowUp(currentDoc.id);

  // If worker is attached, include worker's core chain
  if (currentDoc.workerId && allNodes[`WRK-${currentDoc.workerId}`]) {
    relatedSet.add(`WRK-${currentDoc.workerId}`);
  }

  // If subcontractor is attached, include subcontractor
  if (currentDoc.subcontractorId && allNodes[`SUB-${currentDoc.subcontractorId}`]) {
    relatedSet.add(`SUB-${currentDoc.subcontractorId}`);
  }

  const allRelatedNodes = Array.from(relatedSet)
    .map(id => allNodes[id])
    .filter(Boolean);

  // Identify root document
  const rootDoc = allRelatedNodes.find(n => n.precedingDocIds.length === 0) || currentDoc;

  // Build sorted preceding and follow-up lists
  const precedingDocs = Array.from(visitedPreceding)
    .map(id => allNodes[id])
    .filter(Boolean)
    .sort((a, b) => a.stageOrder - b.stageOrder);

  const followUpDocs = Array.from(visitedFollowUp)
    .map(id => allNodes[id])
    .filter(Boolean)
    .sort((a, b) => a.stageOrder - b.stageOrder);

  // Group into standard SAP Lifecycle Stages
  const stageDefinitions = [
    { key: 'origin', title: '1. Originating Document / Master', category: 'Project' as DocFlowCategory, min: 10, max: 19 },
    { key: 'planning', title: '2. Planning, BOQ & Deployment', category: 'Billing' as DocFlowCategory, min: 20, max: 29 },
    { key: 'execution', title: '3. Execution, Abstract & Operations', category: 'Billing' as DocFlowCategory, min: 30, max: 39 },
    { key: 'billing', title: '4. RA Billing & Certification', category: 'Billing' as DocFlowCategory, min: 40, max: 49 },
    { key: 'settlement', title: '5. Settlement, Payments & Ledger', category: 'Billing' as DocFlowCategory, min: 50, max: 99 }
  ];

  const stages = stageDefinitions.map(def => {
    const nodesInStage = allRelatedNodes
      .filter(n => n.stageOrder >= def.min && n.stageOrder <= def.max)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return {
      stageKey: def.key,
      stageTitle: def.title,
      stageCategory: def.category,
      nodes: nodesInStage
    };
  }).filter(stg => stg.nodes.length > 0);

  return {
    rootDoc,
    currentDoc,
    allRelatedNodes,
    precedingDocs,
    followUpDocs,
    stages
  };
}

/**
 * Filter documents according to user queries
 */
export function searchDocumentFlow(
  filter: DocFlowFilter, 
  allNodes: Record<string, DocFlowNode>
): DocFlowNode[] {
  let list = Object.values(allNodes);

  if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
    const q = filter.searchQuery.trim().toLowerCase();
    list = list.filter(n => 
      n.documentNumber.toLowerCase().includes(q) ||
      n.title.toLowerCase().includes(q) ||
      (n.subtitle && n.subtitle.toLowerCase().includes(q)) ||
      (n.projectName && n.projectName.toLowerCase().includes(q)) ||
      (n.clientName && n.clientName.toLowerCase().includes(q)) ||
      (n.workerName && n.workerName.toLowerCase().includes(q)) ||
      (n.subcontractorName && n.subcontractorName.toLowerCase().includes(q)) ||
      n.documentTypeName.toLowerCase().includes(q) ||
      n.category.toLowerCase().includes(q)
    );
  }

  if (filter.projectId && filter.projectId !== 'all') {
    list = list.filter(n => n.projectId === filter.projectId);
  }

  if (filter.category && filter.category !== 'all') {
    list = list.filter(n => n.category.toLowerCase() === filter.category?.toLowerCase());
  }

  if (filter.docType && filter.docType !== 'all') {
    list = list.filter(n => n.documentType === filter.docType);
  }

  if (filter.status && filter.status !== 'all') {
    list = list.filter(n => n.status.toLowerCase() === filter.status?.toLowerCase());
  }

  if (filter.dateFrom) {
    list = list.filter(n => n.date >= filter.dateFrom!);
  }

  if (filter.dateTo) {
    list = list.filter(n => n.date <= filter.dateTo!);
  }

  return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

/**
 * Export Document Flow to Excel (.xlsx)
 */
export function exportDocumentFlowToExcel(
  flowName: string, 
  nodes: DocFlowNode[]
) {
  const data = nodes.map((n, idx) => ({
    'Sr No': idx + 1,
    'Document Number': n.documentNumber,
    'Transaction Type': n.documentTypeName,
    'Category': n.category,
    'Title / Description': n.title,
    'Project': n.projectName || 'N/A',
    'Client / Worker / Vendor': n.clientName || n.workerName || n.subcontractorName || 'N/A',
    'Date': n.date,
    'Amount (₹)': n.amount || 0,
    'Quantity / Hajira': n.quantity ? `${n.quantity} ${n.unit || ''}` : 'N/A',
    'Status': n.status,
    'Created By': n.audit.createdBy || 'System',
    'Approved By': n.audit.approvedBy || 'N/A',
    'Posted By': n.audit.postedBy || 'N/A'
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Document Flow');
  XLSX.writeFile(workbook, `SAP_Document_Flow_${flowName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
}

/**
 * Export Document Flow to PDF
 */
export function exportDocumentFlowToPDF(
  flowName: string, 
  currentDoc: DocFlowNode | undefined,
  nodes: DocFlowNode[],
  userName: string = 'Authorized Staff'
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4'
  });

  // Header banner
  doc.setFillColor(11, 46, 89);
  doc.rect(0, 0, 842, 60, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('SN ENTERPRISES - SAP BUSINESS DOCUMENT FLOW AUDIT REPORT', 30, 30);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Flow Scope: ${flowName.toUpperCase()} | Generated By: ${userName} | Date: ${new Date().toLocaleString()}`, 30, 48);

  if (currentDoc) {
    doc.setFillColor(240, 244, 248);
    doc.rect(30, 70, 782, 35, 'F');
    doc.setDrawColor(200, 215, 230);
    doc.rect(30, 70, 782, 35, 'S');

    doc.setTextColor(11, 46, 89);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`Origin Document: ${currentDoc.documentNumber} (${currentDoc.documentTypeName})`, 40, 86);

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text(`Status: ${currentDoc.status} | Project: ${currentDoc.projectName || 'N/A'} | Amount: ₹${(currentDoc.amount || 0).toLocaleString('en-IN')} | Date: ${currentDoc.date}`, 40, 98);
  }

  const tableBody = nodes.map((n, i) => [
    (i + 1).toString(),
    n.documentNumber,
    n.documentTypeName,
    n.title,
    n.projectName || 'N/A',
    n.date,
    n.amount ? `₹${n.amount.toLocaleString('en-IN')}` : (n.quantity ? `${n.quantity} ${n.unit || ''}` : '-'),
    n.status,
    n.audit.createdBy || 'System',
    n.audit.approvedBy || '-'
  ]);

  (doc as any).autoTable({
    startY: currentDoc ? 115 : 75,
    head: [['#', 'Document No', 'Transaction Type', 'Particulars / Description', 'Project', 'Date', 'Amount / Qty', 'Status', 'Created By', 'Approved By']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: [11, 46, 89],
      textColor: [255, 255, 255],
      fontSize: 8,
      fontStyle: 'bold'
    },
    bodyStyles: {
      fontSize: 7.5,
      textColor: [30, 30, 30]
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    margin: { left: 30, right: 30, bottom: 40 }
  });

  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7.5);
    doc.setTextColor(130, 130, 130);
    doc.text(`SN ENTERPRISES SAP DOCUMENT FLOW ENGINE | Page ${i} of ${pageCount} | Confidential ERP Audit Record`, 30, 580);
  }

  doc.save(`SAP_Doc_Flow_${flowName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
}
