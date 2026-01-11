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
    journals_json_path = os.path.join(OUTPUT_DIR, "journals.json")
    existing_journals = {}
    
    # 1. Load Existing Data (Smart Resume)
    if os.path.exists(journals_json_path):
        print("Loading existing journals to resume...")
        with open(journals_json_path, "r", encoding="utf-8") as f:
            try:
                loaded = json.load(f)
                # Map by Journal Name to avoid duplicates or re-embedding
                for item in loaded:
                    existing_journals[item['name']] = item
            except:
                print("Could not read existing json, starting fresh.")

    # 1.5 Load ASJC Mapping
    asjc_map = {}
    asjc_path_file = os.path.join(RESOURCES_DIR, "ASJC1.xlsx")
    if os.path.exists(asjc_path_file):
        print("Loading ASJC mapping...")
        df_asjc = pd.read_excel(asjc_path_file)
        # Assuming columns: Code, Description
        for _, r in df_asjc.iterrows():
            code = str(r['Code']).strip()
            desc = str(r['Description']).strip() 
            asjc_map[code] = desc

    # 2. Load Excel Data
    journals_path = os.path.join(RESOURCES_DIR, JOURNALS_FILE)
    if os.path.exists(journals_path):
        # Update columns to include new fields
        df_journals = pd.read_excel(journals_path, usecols=[
            'Source Title', 
            'scope', 
            'All Science Journal Classification Codes (ASJC)', 
            'Publisher', 
            'Sourcerecord ID', 
            'Active or Inactive',
            'Coverage'
        ])
        df_journals = df_journals.dropna(subset=['Source Title'])
        
        final_list = []
        to_embed = [] # List of { index, text } to preserve order mapping
        
        print(f"Total rows in Excel: {len(df_journals)}")
        
        current_idx = 0
        skipped_count = 0
        
        for _, row in df_journals.iterrows():
            title = row['Source Title']
            
            # Prepare new record fields
            scope = str(row['scope']) if pd.notna(row['scope']) else ""
            
            # ASJC Processing
            raw_asjc = str(row['All Science Journal Classification Codes (ASJC)']) if pd.notna(row['All Science Journal Classification Codes (ASJC)']) else ""
            # ASJC codes usually separated by semi-colon or comma. Let's try both.
            # E.g. "1200; 1305"
            asjc_codes = [c.strip() for c in raw_asjc.replace(',', ';').split(';') if c.strip()]
            asjc_descs = [asjc_map.get(c, c) for c in asjc_codes]
            asjc_final = "; ".join(asjc_descs) # E.g. "Arts and Humanities; Biochemistry"
            
            publisher = str(row['Publisher']) if pd.notna(row['Publisher']) else "Unknown Publisher"
            source_id = str(row['Sourcerecord ID']) if pd.notna(row['Sourcerecord ID']) else ""
            
            # Coverage Processing
            active_status = str(row['Active or Inactive']) if pd.notna(row['Active or Inactive']) else "Unknown"
            years = str(row['Coverage']) if pd.notna(row['Coverage']) else ""
            coverage = f"{active_status} ({years})" if years else active_status

            # Construct Link
            link = f"https://www.scopus.com/sourceid/{source_id}" if source_id else ""

            # Optimization: limit scope length
            if len(scope) > 4000:
                scope = scope[:4000] + "..."
            
            content = f"{title}. {scope}. matches ASJC codes: {asjc_final}".strip()
            
            # Check if embedding exists
            embedding = None
            if title in existing_journals and "embedding" in existing_journals[title]:
                 embedding = existing_journals[title]["embedding"]
                 skipped_count += 1
            
            # Allow reusing ID if existed, else new ID
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

            if embedding:
                record["embedding"] = embedding
            
            final_list.append(record)
            
            # Mark for embedding ONLY if missing
            if not embedding:
                to_embed.append({
                    "index": len(final_list) - 1,
                    "text": content
                })
        
        print(f"Skipped {skipped_count} already embedded journals.")
        
        # 3. Batch Embed New Items
        if os.getenv("OPENAI_API_KEY") and to_embed:
            # Estimate cost: approx 1 token per 4 chars. 
            total_chars = sum([len(x['text']) for x in to_embed])
            est_tokens = total_chars / 4
            est_cost = (est_tokens / 1_000_000) * 0.02
            print(f"Ready to embed {len(to_embed)} journals.")
            print(f"Estimated tokens: {int(est_tokens)}. Estimated cost: ${est_cost:.4f}")
            
            embeddings_map = get_embeddings_batched_safe(to_embed, EMBEDDING_MODEL)
            
            # Apply back to final_list
            for idx, emb in embeddings_map.items():
                final_list[idx]["embedding"] = emb
            
            # Save Updated Data
            print("Saving updated journals.json...")
            with open(journals_json_path, "w", encoding="utf-8") as f:
                json.dump(final_list, f)
            print("Done.")
            
        else:
            if not os.getenv("OPENAI_API_KEY"):
                print("No API Key found. Saving without embeddings.")
            else:
                print("Nothing new to embed.")
            
            # Save anyway to sync new excel rows if any
            with open(journals_json_path, "w", encoding="utf-8") as f:
                json.dump(final_list, f)

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
