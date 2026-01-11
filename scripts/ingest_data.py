import pandas as pd
import os
import json
import uuid
from openai import OpenAI
from dotenv import load_dotenv
import time

# Resolve .env path relative to this script or CWD
BASE_DIR = os.getcwd()
ENV_PATH = os.path.join(BASE_DIR, 'web', '.env')
load_dotenv(ENV_PATH)

# Configuration
RESOURCES_DIR = "resources"
OUTPUT_DIR = "web/data"
JOURNALS_FILE = "List Scopus Outlet.xlsx"
SDGS_FILE = "SDGs Keyword.xlsx"
EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 500

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SDG_NAMES = {
    1: "No Poverty",
    2: "Zero Hunger",
    3: "Good Health and Well-being",
    4: "Quality Education",
    5: "Gender Equality",
    6: "Clean Water and Sanitation",
    7: "Affordable and Clean Energy",
    8: "Decent Work and Economic Growth",
    9: "Industry, Innovation and Infrastructure",
    10: "Reduced Inequalities",
    11: "Sustainable Cities and Communities",
    12: "Responsible Consumption and Production",
    13: "Climate Action",
    14: "Life Below Water",
    15: "Life on Land",
    16: "Peace, Justice and Strong Institutions",
    17: "Partnerships for the Goals"
}

def get_embeddings_batched_safe(text_map, model):
    """
    text_map: list of { index: int, text: string }
    Returns map of { index: embedding[] }
    """
    if not text_map:
        return {}
        
    results = {}
    total = len(text_map)
    print(f"Generating embeddings for {total} new items...")
    
    # Extract just texts for the batch
    all_indices = [item['index'] for item in text_map]
    all_texts = [item['text'].replace("\n", " ") for item in text_map]
    
    for i in range(0, total, BATCH_SIZE):
        batch_texts = all_texts[i:i+BATCH_SIZE]
        batch_indices = all_indices[i:i+BATCH_SIZE]
        
        try:
            response = client.embeddings.create(input=batch_texts, model=model)
            for j, data in enumerate(response.data):
                original_idx = batch_indices[j]
                results[original_idx] = data.embedding
            print(f"Processed {min(i+BATCH_SIZE, total)}/{total}")
        except Exception as e:
            print(f"Error in batch {i}: {e}")
            time.sleep(2) # Backoff
            
    return results

def ingest():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    # --- PROCESS JOURNALS (Main Cost Center) ---
    print("Processing Journals...")
    journals_jsonl_path = os.path.join(OUTPUT_DIR, "journals.jsonl")
    journals_json_path = os.path.join(OUTPUT_DIR, "journals.json")
    
    existing_journals = {}
    
    # 1. Load Existing Data from JSONL (Preferred for Resume)
    if os.path.exists(journals_jsonl_path):
        print(f"Loading existing progress from {journals_jsonl_path}...")
        try:
            with open(journals_jsonl_path, "r", encoding="utf-8") as f:
                for line in f:
                    if line.strip():
                        try:
                            record = json.loads(line)
                            existing_journals[record['name']] = record
                        except: pass
            print(f"Loaded {len(existing_journals)} existing records.")
        except Exception as e:
            print(f"Error reading JSONL: {e}")

    # Fallback to JSON if JSONL empty/missing
    if not existing_journals and os.path.exists(journals_json_path):
        print("Loading existing journals from legacy JSON...")
        with open(journals_json_path, "r", encoding="utf-8") as f:
            try:
                loaded = json.load(f)
                for item in loaded:
                    existing_journals[item['name']] = item
            except: pass

    # 1.5 Load ASJC Mapping
    asjc_map = {}
    asjc_path_file = os.path.join(RESOURCES_DIR, "ASJC1.xlsx")
    if os.path.exists(asjc_path_file):
        print("Loading ASJC mapping...")
        df_asjc = pd.read_excel(asjc_path_file)
        for _, r in df_asjc.iterrows():
            code = str(r['Code']).strip()
            desc = str(r['Description']).strip() 
            asjc_map[code] = desc

    # 2. Load Excel Data
    journals_path = os.path.join(RESOURCES_DIR, JOURNALS_FILE)
    if os.path.exists(journals_path):
        df_journals = pd.read_excel(journals_path, usecols=[
            'Source Title', 'scope', 'All Science Journal Classification Codes (ASJC)', 
            'Publisher', 'Sourcerecord ID', 'Active or Inactive', 'Coverage'
        ])
        df_journals = df_journals.dropna(subset=['Source Title'])
        
        # We process in order
        pending_records = [] 
        final_list = [] # Keep track of everything for final JSON dump if needed
        
        print(f"Total rows in Excel: {len(df_journals)}")
        
        for _, row in df_journals.iterrows():
            title = row['Source Title']
            
            # If we already have it fully processed (with embedding), skip expensive logic
            if title in existing_journals and "embedding" in existing_journals[title]:
                final_list.append(existing_journals[title])
                continue

            # ... Otherwise, prepare for processing ...
            scope = str(row['scope']) if pd.notna(row['scope']) else ""
            raw_asjc = str(row['All Science Journal Classification Codes (ASJC)']) if pd.notna(row['All Science Journal Classification Codes (ASJC)']) else ""
            asjc_codes = [c.strip() for c in raw_asjc.replace(',', ';').split(';') if c.strip()]
            asjc_descs = [asjc_map.get(c, c) for c in asjc_codes]
            asjc_final = "; ".join(asjc_descs)
            
            publisher = str(row['Publisher']) if pd.notna(row['Publisher']) else "Unknown Publisher"
            source_id = str(row['Sourcerecord ID']) if pd.notna(row['Sourcerecord ID']) else ""
            active_status = str(row['Active or Inactive']) if pd.notna(row['Active or Inactive']) else "Unknown"
            years = str(row['Coverage']) if pd.notna(row['Coverage']) else ""
            coverage = f"{active_status} ({years})" if years else active_status
            link = f"https://www.scopus.com/sourceid/{source_id}" if source_id else ""

            if len(scope) > 4000:
                scope = scope[:4000] + "..."
            
            content = f"{title}. {scope}. matches ASJC codes: {asjc_final}".strip()
            
            # Reuse ID if possible
            rec_id = existing_journals[title]['id'] if title in existing_journals else str(uuid.uuid4())

            record = {
                "id": rec_id,
                "name": title,
                "scope": scope,
                "content": content,
                "publisher": publisher,
                "link": link,
                "coverage": coverage,
                "asjc": asjc_final
            }
            
            pending_records.append(record)

        print(f"Already processed: {len(final_list)}")
        print(f"Pending processing: {len(pending_records)}")
        
        # 3. Process Pending in Batches & SAVE INCREMENTALLY
        # Smaller batch size for better resume capability
        RESUME_BATCH_SIZE = 100 
        
        if os.getenv("OPENAI_API_KEY") and pending_records:
            total_pending = len(pending_records)
            for i in range(0, total_pending, RESUME_BATCH_SIZE):
                batch = pending_records[i : i + RESUME_BATCH_SIZE]
                
                # Prepare text map for embedding function
                to_embed_map = [{"index": idx, "text": item["content"]} for idx, item in enumerate(batch)]
                
                try:
                    # Call OpenAI
                    print(f"Embedding batch {i} to {i+len(batch)} of {total_pending}...")
                    embeddings = get_embeddings_batched_safe(to_embed_map, EMBEDDING_MODEL)
                    
                    # Assign embeddings
                    valid_batch = []
                    for idx, emb in embeddings.items():
                        batch[idx]["embedding"] = emb
                        valid_batch.append(batch[idx])
                    
                    # APPEND TO JSONL IMMEDIATELY (Checkpoint)
                    if valid_batch:
                        with open(journals_jsonl_path, "a", encoding="utf-8") as f:
                            for item in valid_batch:
                                f.write(json.dumps(item) + "\n")
                        print(f"Saved {len(valid_batch)} new records to {journals_jsonl_path}")
                        
                        # Add to final list in memory
                        final_list.extend(valid_batch)
                        
                except Exception as e:
                    print(f"CRITICAL ERROR in batch {i}: {e}")
                    print("Waiting 10s before retry loop continues...")
                    time.sleep(10)
        else:
            # No API key or no pending -> Just dump text data if needed
            if pending_records:
                print("No API Key or Dry Run: Saving pending records without embeddings.")
                with open(journals_jsonl_path, "a", encoding="utf-8") as f:
                    for item in pending_records:
                        final_list.append(item)
                        f.write(json.dumps(item) + "\n")

        # Optional: update the full JSON for backup (reconstruct from all processed)
        # Note: If we really want to keep json and jsonl in sync, we should re-read jsonl or dump final_list
        # But for huge files, maybe skip JSON dump? User asked for robust ingest.
        # Let's dump it if it fits in memory (which final_list does).
        try:
            print("Syncing journals.json (Backup)...")
            with open(journals_json_path, "w", encoding="utf-8") as f:
                json.dump(final_list, f)
            print("Sync Complete.")
        except Exception as e:
            print(f"Warning: Could not save full legacy JSON: {e}")

    else:
        print(f"File not found: {journals_path}")

    # --- PROCESS SDGs (Fast) ---
    # (Simpler logic here as it is small)
    print("Processing SDGs...")
    sdgs_path = os.path.join(RESOURCES_DIR, SDGS_FILE)
    if os.path.exists(sdgs_path):
        df_sdg = pd.read_excel(sdgs_path)
        sdg_data = []
        sdg_texts = []
        
        for _, row in df_sdg.iterrows():
            sdg_id = row['SDG']
            query = str(row['Query']) if pd.notna(row['Query']) else ""
            keywords = [k.strip().lower() for k in query.split(';') if k.strip()]
            name = SDG_NAMES.get(int(sdg_id), f"SDG {sdg_id}")
            
            text_for_embedding = f"{name}: {query}".strip()
            sdg_texts.append(text_for_embedding)

            sdg_data.append({
                "id": sdg_id,
                "name": name,
                "keywords": keywords
            })
        
        if os.getenv("OPENAI_API_KEY"):
            embeddings = get_embeddings_batched_safe([{'index': i, 'text': t} for i,t in enumerate(sdg_texts)], EMBEDDING_MODEL)
            for i, emb in embeddings.items():
                sdg_data[i]["embedding"] = emb
        
        with open(os.path.join(OUTPUT_DIR, "sdgs.json"), "w", encoding="utf-8") as f:
            json.dump(sdg_data, f)

if __name__ == "__main__":
    ingest()
