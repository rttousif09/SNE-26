import re

with open('src/index.css', 'r') as f:
    content = f.read()

# Update .sap-panel
content = re.sub(
    r'\.sap-panel \{[\s\S]*?\}',
    '''.sap-panel {
  background-color: var(--color-sap-header-val);
  border: 1px solid var(--color-sap-border-val);
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  border-radius: 4px;
}''',
    content
)

content = re.sub(
    r'\.sap-header \{[\s\S]*?\}',
    '''.sap-header {
  background-color: var(--color-sap-header-val);
  color: var(--text-primary);
  font-weight: 600;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-sap-border-val);
  display: flex;
  align-items: center;
}''',
    content
)

content = re.sub(
    r'\.sap-header-light \{[\s\S]*?\}',
    '''.sap-header-light {
  background-color: var(--color-sap-bg-val);
  color: var(--text-primary);
  font-weight: 500;
  padding: 8px 16px;
  border-bottom: 1px solid var(--color-sap-border-val);
}''',
    content
)

# Update excel grid / sap-table
content = re.sub(
    r'\.excel-grid th \{[\s\S]*?\}',
    '''.excel-grid th {
  background-color: var(--color-sap-bg-val);
  border: 1px solid var(--grid-td-border);
  font-weight: 600;
  color: var(--text-primary);
  text-align: center;
  position: relative;
  padding: 8px;
}''',
    content
)

content = re.sub(
    r'\.sap-table th \{[\s\S]*?\}',
    '''.sap-table th {
  background-color: var(--color-sap-bg-val);
  border-bottom: 1px solid var(--grid-td-border);
  border-top: 1px solid var(--grid-td-border);
  padding: 8px 12px;
  font-weight: 600;
  color: var(--text-primary);
  text-align: left;
}''',
    content
)

content = re.sub(
    r'\.sap-table td \{[\s\S]*?\}',
    '''.sap-table td {
  border-bottom: 1px solid var(--grid-td-border);
  padding: 8px 12px;
  background-color: #ffffff;
}''',
    content
)

content = re.sub(
    r'\.sap-table tbody tr:nth-child\(even\) td \{[\s\S]*?\}',
    '''.sap-table tbody tr:nth-child(even) td {
  background-color: #f9fbfd;
}''',
    content
)

with open('src/index.css', 'w') as f:
    f.write(content)

