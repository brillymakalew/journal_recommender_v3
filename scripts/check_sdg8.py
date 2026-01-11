
import json

with open('web/data/sdgs.json', 'r') as f:
    data = json.load(f)

for sdg in data:
    if sdg['id'] == 8:
        print(f"SDG 8 Keywords ({len(sdg['keywords'])}):")
        print(sdg['keywords'])
        break
