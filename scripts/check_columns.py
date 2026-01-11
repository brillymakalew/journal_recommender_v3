import pandas as pd
import os

files = ["resources/List Scopus Outlet.xlsx", "resources/ASJC1.xlsx"]

for f in files:
    path = os.path.join(os.getcwd(), f)
    if os.path.exists(path):
        print(f"--- HEADERS FOR {f} ---")
        try:
            df = pd.read_excel(path, nrows=5)
            print(df.columns.tolist())
            print("--- First Row Sample ---")
            print(df.iloc[0].to_dict())
        except Exception as e:
            print(f"Error reading {f}: {e}")
    else:
        print(f"File not found: {path} (CWD: {os.getcwd()})")
