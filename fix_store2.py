with open('src/store.tsx', 'r') as f:
    content = f.read()

content = content.replace("clientFloorBills, newBill", "newBill")
content = content.replace("clientFloorBills: cfbRes || [],", "")

with open('src/store.tsx', 'w') as f:
    f.write(content)
