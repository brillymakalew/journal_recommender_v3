import pandas as pd
import re

# Abstract provided by user
abstract = """The aim of this work is to design an application with the main function to ease the user in the process of managing their personal finance. The process of evaluating their financial activities record should becomes easier because the application enables their own financial goal to be monitored, controlled, and evaluated using the data. There are two phases in this research:(1) concept evaluation phase, and (2) content realization phase. The first phase produced a list of approved features that had undergone a series of concept testing. All features support all three time period: past, present, and future. Users can see their past activities, record their present transaction, and plan their future goals. The second phase produced a design for a mobile application, specifically in a form of use case diagram and class diagram. Feature comparison between similar applications had also been done twice, in the beginning and at the end. All process are done to ensure that the concept are designed as objective as possible."""

# Load SDG 7 Keywords
df = pd.read_excel('resources/SDGs Keyword.xlsx')
sdg7_row = df[df['SDG'] == 7]
if sdg7_row.empty:
    print("SDG 7 not found")
    exit()

query = str(sdg7_row.iloc[0]['Query'])
keywords = [k.strip().lower() for k in query.split(';') if k.strip()]

print(f"Total SDG 7 Keywords: {len(keywords)}")

matches = []
for kw in keywords:
    try:
        # Replicate TS logic: const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        # Python re.escape does this
        escaped_kw = re.escape(kw)
        # Replicate TS logic: const regex = new RegExp(`\\b${escapedKw}\\b`, 'i');
        # Python: re.searchWith \b
        pattern = f'\\b{escaped_kw}\\b'
        if re.search(pattern, abstract, re.IGNORECASE):
            matches.append(kw)
    except Exception as e:
        print(f"Error with kw '{kw}': {e}")

print("--- MATCHES FOUND ---")
for m in matches:
    print(f"MATCH: '{m}'")
