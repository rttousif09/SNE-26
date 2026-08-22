sed -i 's/import { GitFork } from '"'"'lucide-react'"'"';/import { GitFork } from '"'"'lucide-react'"'"';\nimport { BOQAllocationSelector } from '"'"'..\/components\/BOQAllocationSelector'"'"';/' src/pages/Billing.tsx
sed -i 's/const { user, billings/const { user, boqs = [], billings/' src/pages/Billing.tsx
sed -i 's/const \[activeTab, setActiveTab\] = useState/const \[isBOQSelectorOpen, setIsBOQSelectorOpen\] = useState(false);\n  const \[activeTab, setActiveTab\] = useState/' src/pages/Billing.tsx
