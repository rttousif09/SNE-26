sed -i 's/const billedQty = currentBillings.filter(b => b.status === '"'"'Approved'"'"').flatMap/const billedQty = currentBillings.flatMap/' src/store.tsx
