#!/bin/bash
for file in $(find src -name "*.tsx"); do
  sed -i 's/bg-\[#f2f2f2\]/bg-white/g' "$file"
  sed -i 's/bg-\[#e6e6e6\]/bg-gray-100/g' "$file"
  sed -i 's/bg-\[#002f6c\]/bg-\[var(--color-sap-blue-val)\]/g' "$file"
  sed -i 's/text-\[#002f6c\]/text-\[var(--color-sap-blue-val)\]/g' "$file"
  sed -i 's/border-\[#002f6c\]/border-\[var(--color-sap-blue-val)\]/g' "$file"
  sed -i 's/bg-\[#0056b3\]/bg-\[var(--btn-hover-top)\]/g' "$file"
done
