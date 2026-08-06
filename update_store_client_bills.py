import re

with open('src/store.tsx', 'r') as f:
    content = f.read()

if "clientFloorBills" not in content:
    # Add to imports
    content = content.replace("BOQAuditLog } from './types';", "BOQAuditLog, ClientFloorBill } from './types';")
    
    # Add to AppState
    content = content.replace("trackedBills: TrackedBill[];", "trackedBills: TrackedBill[];\n  clientFloorBills: ClientFloorBill[];")
    
    # Add to AppContextType
    content = content.replace("deleteTrackedBill: (id: string) => Promise<void>;", "deleteTrackedBill: (id: string) => Promise<void>;\n  addClientFloorBill: (bill: Omit<ClientFloorBill, 'id'>) => Promise<void>;\n  updateClientFloorBill: (id: string, bill: Partial<ClientFloorBill>) => Promise<void>;\n  deleteClientFloorBill: (id: string) => Promise<void>;")
    
    # Add to initialState
    content = content.replace("trackedBills: [],", "trackedBills: [],\n  clientFloorBills: [],")
    content = content.replace("trackedBills: [],", "trackedBills: [],\n    clientFloorBills: [],")
    
    # Add to initDb
    content = content.replace("const tbRes = await getAllFromStore('trackedBills');", "const tbRes = await getAllFromStore('trackedBills');\n          const cfbRes = await getAllFromStore('clientFloorBills');")
    content = content.replace("trackedBills: tbRes || [],", "trackedBills: tbRes || [],\n          clientFloorBills: cfbRes || [],")
    content = content.replace("await saveAllToStore('trackedBills', tbRes || []).catch(() => {});", "await saveAllToStore('trackedBills', tbRes || []).catch(() => {});\n        await saveAllToStore('clientFloorBills', cfbRes || []).catch(() => {});")
    
    # export
    content = content.replace("const trackedBills = await getAllFromStore('trackedBills').catch(() => []);", "const trackedBills = await getAllFromStore('trackedBills').catch(() => []);\n          const clientFloorBills = await getAllFromStore('clientFloorBills').catch(() => []);")
    content = content.replace("trackedBills,", "trackedBills,\n              clientFloorBills,")
    
    # importBackup
    content = content.replace("await saveAllToStore('trackedBills', backupState.trackedBills || []).catch(() => {});", "await saveAllToStore('trackedBills', backupState.trackedBills || []).catch(() => {});\n      await saveAllToStore('clientFloorBills', backupState.clientFloorBills || []).catch(() => {});")
    
    # Methods
    methods = """
  const addClientFloorBill = async (bill: Omit<ClientFloorBill, 'id'>) => {
    const newBill = { ...bill, id: generateId() };
    setState(s => ({ ...s, clientFloorBills: [...(s.clientFloorBills || []), newBill] }));
    try {
      await fetch('/api/client-floor-bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newBill)
      });
      await saveAllToStore('clientFloorBills', [...(state.clientFloorBills || []), newBill]);
    } catch (e) {
      console.error(e);
      await saveAllToStore('clientFloorBills', [...(state.clientFloorBills || []), newBill]);
    }
  };

  const updateClientFloorBill = async (id: string, bill: Partial<ClientFloorBill>) => {
    setState(s => {
      const updated = (s.clientFloorBills || []).map(tb => tb.id === id ? { ...tb, ...bill } : tb);
      saveAllToStore('clientFloorBills', updated).catch(() => {});
      return { ...s, clientFloorBills: updated };
    });
    try {
      const existing = (state.clientFloorBills || []).find(tb => tb.id === id);
      if (existing) {
        const merged = { ...existing, ...bill };
        await fetch(`/api/client-floor-bills/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(merged)
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const deleteClientFloorBill = async (id: string) => {
    setState(s => {
      const filtered = (s.clientFloorBills || []).filter(tb => tb.id !== id);
      saveAllToStore('clientFloorBills', filtered).catch(() => {});
      return { ...s, clientFloorBills: filtered };
    });
    try {
      await fetch(`/api/client-floor-bills/${id}`, { method: 'DELETE' });
    } catch (e) {
      console.error(e);
    }
  };
"""
    content = content.replace("const addTrackedBill = async", methods + "\n  const addTrackedBill = async")
    
    # export methods
    content = content.replace("addTrackedBill,", "addTrackedBill,\n      addClientFloorBill,\n      updateClientFloorBill,\n      deleteClientFloorBill,")

with open('src/store.tsx', 'w') as f:
    f.write(content)

