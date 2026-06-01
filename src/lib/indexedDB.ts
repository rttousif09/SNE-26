import { Project, Worker, Billing, ClientPayment, Kharchi, Advance, WorkerPayment, Approval, PaymentSheetApproval } from '../types';

const DB_NAME = 'ERM_Offline_DB';
const DB_VERSION = 7;
const STORES = ['projects', 'workers', 'billings', 'clientPayments', 'kharchis', 'advances', 'workerPayments', 'approvals', 'kharchiApprovals', 'paymentSheetApprovals', 'expensesLedger', 'messBookings', 'dlrs', 'materialItems', 'materialIssues', 'materialReturns', 'materialPurchases', 'labourPlannings', 'workerTransfers'];

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Error opening db:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      STORES.forEach(storeName => {
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      });
    };
  });
};

export const saveAllToStore = (storeName: string, data: any[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);

      const clearRequest = store.clear();
      clearRequest.onsuccess = () => {
        if (data.length === 0) {
          resolve();
          return;
        }

        let completed = 0;
        let failed = false;

        data.forEach(item => {
          // Clone item to prevent modifications on read-only objects
          const itemCopy = JSON.parse(JSON.stringify(item));
          const addReq = store.put(itemCopy);
          addReq.onsuccess = () => {
            completed++;
            if (completed === data.length && !failed) {
              resolve();
            }
          };
          addReq.onerror = () => {
            if (!failed) {
              failed = true;
              reject(addReq.error);
            }
          };
        });
      };
      
      clearRequest.onerror = () => reject(clearRequest.error);
    }).catch(reject);
  });
};

export const getAllFromStore = (storeName: string): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result || []);
      };

      request.onerror = () => {
        reject(request.error);
      };
    }).catch(reject);
  });
};

export const clearAllStores = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    initDB().then(db => {
      const transaction = db.transaction(STORES, 'readwrite');
      let completed = 0;
      STORES.forEach(storeName => {
        const store = transaction.objectStore(storeName);
        const request = store.clear();
        request.onsuccess = () => {
          completed++;
          if (completed === STORES.length) {
            resolve();
          }
        };
        request.onerror = () => reject(request.error);
      });
    }).catch(reject);
  });
};
