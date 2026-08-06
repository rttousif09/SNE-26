import re

with open('src/store.tsx', 'r') as f:
    lines = f.readlines()

with open('src/store.tsx', 'w') as f:
    for i, line in enumerate(lines):
        # We probably duplicated "clientFloorBills: []," or "clientFloorBills," because of regex replace.
        if "cfbRes" in line:
            # Let's just fix it by replacing the whole thing cleanly.
            pass
