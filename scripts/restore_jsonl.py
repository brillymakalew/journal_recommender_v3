import json
import os

INPUT_FILE = "web/data/journals.json"
OUTPUT_FILE = "web/data/journals.jsonl"

def convert():
    if not os.path.exists(INPUT_FILE):
        print(f"Error: {INPUT_FILE} not found.")
        return

    print("Reading JSON...")
    # Since we can't load 1.7GB easily in some envs, let's try standard load (Python handles large strings better than Node somewhat, but mostly because of 64bit).
    # If this fails, we need ijson. But let's try standard load first as User machine likely has RAM.
    try:
        with open(INPUT_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"Loaded {len(data)} records. Writing JSONL...")
        
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            for entry in data:
                f.write(json.dumps(entry) + '\n')
        
        print("Success! JSONL created.")
    except Exception as e:
        print(f"Failed to convert: {e}")

if __name__ == "__main__":
    convert()
