import re

# 1. Add ClientFloorBill to types.ts
with open('src/types.ts', 'r') as f:
    content = f.read()

new_type = """
export interface ClientFloorBill {
  id: string;
  projectId: string;
  srNo: string;
  floor: string;
  unit: string;
  builtUpArea: number;
  workdoneArea: number;
  raBills: Record<string, number>; // RA-01, RA-02... mapped to area
  totalArea: number;
  totalAmount: number;
  rate: number;
}
"""
if "ClientFloorBill" not in content:
    content = content + new_type

with open('src/types.ts', 'w') as f:
    f.write(content)

