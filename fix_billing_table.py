with open('src/pages/Billing.tsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    if '<table className="w-full border-collapse border border-[#8c9ba8] bg-white">' in line:
        new_lines.append('<div className="overflow-x-auto">\n')
        # Also need to make sure the sticky header is applied
    if 'thead className="sap-header"' in line:
        line = line.replace('thead className="sap-header"', 'thead className="bg-[#eef2f6] text-[11px] font-semibold text-slate-700 sticky top-0 z-10 shadow-sm"')
    
    new_lines.append(line)
    
    if '      </table>' in line and '        </>' in lines[i+1]:
        new_lines.append('</div>\n')

with open('src/pages/Billing.tsx', 'w') as f:
    f.writelines(new_lines)
