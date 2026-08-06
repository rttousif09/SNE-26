import re

with open('src/lib/indexedDB.ts', 'r') as f:
    content = f.read()

missing = ["'staff'", "'floorAbstracts'", "'activityLogs'", "'numberingSettings'", "'numberingAuditLogs'"]

for m in missing:
    if m not in content:
        content = content.replace("'boqAuditLogs']", f"'boqAuditLogs', {m}]")

content = content.replace("DB_VERSION = 11;", "DB_VERSION = 12;")

with open('src/lib/indexedDB.ts', 'w') as f:
    f.write(content)
