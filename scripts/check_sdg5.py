
import json

with open('web/data/sdgs.json', 'r') as f:
    data = json.load(f)

for sdg in data:
    if sdg['id'] == 5:
        print(f"SDG 5 Keywords ({len(sdg['keywords'])}):")
        print(sdg['keywords'])
        break
