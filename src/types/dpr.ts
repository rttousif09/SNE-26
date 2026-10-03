export interface DPRManpowerItem {
  sNo: number;
  trade: string;
  skilled: number;
  semiSkilled: number;
  unskilled: number;
  total: number;
  agency: string;
  remarks?: string;
}

export interface DPRPlantMachineryItem {
  sNo: number;
  equipment: string;
  nos: number;
  hoursRun: number;
  idleHours: number;
  fuelLtr: number;
  remarks?: string;
  ownedOrHired: 'Owned' | 'Hired';
}

export interface DPRWorkExecutedItem {
  sNo: number;
  location: string; // Location / Grid / Floor
  activity: string;
  unit: string;
  quantity: number;
  cumulative: number;
  drawingRef?: string;
  remarks?: string;
}

export interface DPRMaterialReceivedItem {
  sNo: number;
  material: string;
  unit: string;
  quantity: number;
  challanNo: string;
  supplier: string;
  testCertificateReceived: 'Yes' | 'No' | 'NA';
  remarks?: string;
}

export interface DPRConcreteItem {
  sNo: number;
  memberLocation: string; // Member / Location
  grade: string;
  volume: number; // Volume (cum)
  slump: number; // Slump (mm)
  cubesCast: number; // Cubes Cast (nos)
  startFinishTime: string; // Start & Finish Time
  remarks?: string;
}

export interface DPRSafetyItem {
  id: string;
  time: string;
  category: 'Toolbox Talk' | 'Unsafe Act' | 'Unsafe Condition' | 'Near Miss' | 'First Aid' | 'Incident' | 'PPE Compliance' | 'Good Practice';
  observation: string;
  actionTaken: string;
  responsiblePerson: string;
  status: 'Open' | 'In Progress' | 'Rectified' | 'Closed';
}

export interface DPRHindranceItem {
  id: string;
  time: string;
  issue: string;
  location: string;
  timeLost: string; // e.g. "2 hrs"
  manpowerAffected: number;
  actionTaken: string;
  personInformed: string;
  timeInformed: string;
  status: 'Pending' | 'Under Review' | 'Resolved' | 'Escalated';
  rfiRef?: string;
}

export interface DPRInstructionItem {
  id: string;
  dateTime: string;
  from: string; // Client / Consultant Representative
  instruction: string;
  location: string;
  actionRequired: string;
  responsiblePerson: string;
  dueDate: string;
  status: 'Pending' | 'In Progress' | 'Complied' | 'Closed';
}

export interface DPRTomorrowPlanItem {
  sNo: number;
  location: string;
  plannedActivity: string;
  unit: string;
  plannedQuantity: number;
  drawingRef?: string;
  remarks?: string;
}

export interface DPRPhotoItem {
  id: string;
  caption: string;
  location: string;
  dateTime: string;
  dataUrl: string;
}

export type DPRStatus = 'Draft' | 'Submitted' | 'Reviewed' | 'Approved' | 'Locked';

export interface DPRAuditLog {
  id: string;
  dprId: string;
  reportNo: string;
  action: string;
  performedBy: string;
  timestamp: string;
  details: string;
}

export interface DPRReport {
  id: string;
  reportNo: string;
  projectId: string;
  projectCode: string;
  projectName: string;
  clientName: string;
  contractorName: string;
  date: string; // YYYY-MM-DD
  weather: string;
  workingHours: string;
  status: DPRStatus;
  preparedBy: string;
  reviewedBy: string;
  approvedBy: string;
  lockedBy?: string;
  lockedAt?: string;

  manpower: DPRManpowerItem[];
  plantMachinery: DPRPlantMachineryItem[];
  workExecuted: DPRWorkExecutedItem[];
  materialReceived: DPRMaterialReceivedItem[];
  concrete: DPRConcreteItem[];
  safety: DPRSafetyItem[];
  hindrances: DPRHindranceItem[];
  instructions: DPRInstructionItem[];
  tomorrowPlan: DPRTomorrowPlanItem[];
  photos: DPRPhotoItem[];

  remarks?: string;
  createdBy?: string;
  createdDate?: string;
  modifiedBy?: string;
  modifiedDate?: string;
}
