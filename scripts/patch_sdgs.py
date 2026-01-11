
import json
import os

# Paths
SDG_FILE = 'web/data/sdgs.json'

def patch_sdgs():
    if not os.path.exists(SDG_FILE):
        print(f"Error: {SDG_FILE} not found.")
        return

    with open(SDG_FILE, 'r') as f:
        data = json.load(f)

    # keywords to add
    new_keywords = ["finance", "financial", "personal finance", "financial management", "budgeting", "saving", "investment", "economics"]

    patched_count = 0
    for sdg in data:
        # SDG 1: No Poverty
        # SDG 8: Decent Work and Economic Growth
        # SDG 9: Industry, Innovation (maybe?)
        
        if sdg['id'] in [1, 8]:
            current_keywords = set(sdg['keywords'])
            for kw in new_keywords:
                if kw not in current_keywords:
                    sdg['keywords'].append(kw)
            print(f"Patched SDG {sdg['id']} ({sdg['name']}) with finance keywords.")
            patched_count += 1

    if patched_count > 0:
        with open(SDG_FILE, 'w') as f:
            json.dump(data, f, indent=4)
        print("Successfully updated sdgs.json")
    else:
        print("No SDGs matched for patching.")

if __name__ == "__main__":
    patch_sdgs()
