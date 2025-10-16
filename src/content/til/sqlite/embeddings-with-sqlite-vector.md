---
title: Embeddings with sqlite-vector
createdAt: 2025-10-15T20:45:52-04:00
updatedAt: 2025-10-15T20:45:52-04:00
publishedAt: 2025-10-15T20:45:52-04:00
draft: false
tags:
  - sqlite
  - sqlite-vector
  - embeddings
---

Ago a year and a half ago I [wrote about using `sqlite-vss`](/til/sqlite/sqlite-vss) to store and query embedding vectors in a SQLite database.
Much has changed since then and I'm working on a project that motivated another pass at querying embeddings on a local system for smallish datasets.
The [`sqlite-vector`](https://github.com/sqliteai/sqlite-vector) project seemed like an interesting one to try for this purpose.

I am going to use the same [news dataset](https://www.kaggle.com/datasets/rmisra/news-category-dataset) as last time and the [`nomic-embed-text-v1.5`](https://huggingface.co/nomic-ai/nomic-embed-text-v1.5) model to generate 768-dimensional embeddings.

I also downloaded the `vector.dylib` file from the [`sqlite-vector` GitHub repo](https://github.com/sqliteai/sqlite-vector/releases/tag/0.9.37) and placed it in my working directory for this example.
I've tried exercises similar to this one with both the macOS and Linux versions of the library.

To get started, we'll install the libraries we will need to load the data, create the database and generate embeddings.

```python
pip install -q pandas scikit-learn sentence-transformers
```

Next, we'll create the database and table and load the sqlite-vector extension, verifying that it loaded correctly.

```python
import sqlite3
import json
from pathlib import Path


conn = sqlite3.connect('news.db')
conn.enable_load_extension(True)
conn.load_extension('./vector.dylib')
conn.enable_load_extension(False)

version = conn.execute("SELECT vector_version()").fetchone()[0]
print(f"SQLite Vector extension version: {version}")
```

    SQLite Vector extension version: 0.9.37

Looks good!
The query shows the same [version](https://github.com/sqliteai/sqlite-vector/releases/tag/0.9.37) I downloaded.

If you haven't taken a look at the dataset yet, here's a sample:

```python
import pandas as pd

# Load the first few records to see the structure
data_path = Path('data/News_Category_Dataset_v3.json')
articles = []

with open(data_path, 'r') as f:
    for i, line in enumerate(f):
        articles.append(json.loads(line))

df = pd.DataFrame(articles)
df.head()

```

|     | link                                              | headline                                          | category  | short_description                                 | authors              | date       |
| --- | ------------------------------------------------- | ------------------------------------------------- | --------- | ------------------------------------------------- | -------------------- | ---------- |
| 0   | https://www.huffpost.com/entry/covid-boosters-... | Over 4 Million Americans Roll Up Sleeves For O... | U.S. NEWS | Health experts said it is too early to predict... | Carla K. Johnson, AP | 2022-09-23 |
| 1   | https://www.huffpost.com/entry/american-airlin... | American Airlines Flyer Charged, Banned For Li... | U.S. NEWS | He was subdued by passengers and crew when he ... | Mary Papenfuss       | 2022-09-23 |
| 2   | https://www.huffpost.com/entry/funniest-tweets... | 23 Of The Funniest Tweets About Cats And Dogs ... | COMEDY    | "Until you have a dog you don't understand wha... | Elyse Wanshel        | 2022-09-23 |
| 3   | https://www.huffpost.com/entry/funniest-parent... | The Funniest Tweets From Parents This Week (Se... | PARENTING | "Accidentally put grown-up toothpaste on my to... | Caroline Bologna     | 2022-09-23 |
| 4   | https://www.huffpost.com/entry/amy-cooper-lose... | Woman Who Called Cops On Black Bird-Watcher Lo... | U.S. NEWS | Amy Cooper accused investment firm Franklin Te... | Nina Golgowski       | 2022-09-22 |

From here, we'll use the same database connection to create a table to store the news dataset as well as embeddings for both the `short_description` and `headline` fields of the dataset.

I'm only using the first 1000 entries because it takes a few minutes to compute all the embeddings.

```python
conn.execute("""
    CREATE TABLE news_articles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        link TEXT,
        headline TEXT,
        category TEXT,
        short_description TEXT,
        authors TEXT,
        date TEXT,
        headline_embedding BLOB,
        description_embedding BLOB
    )
""")
```

```python
for _, article in df.head(1000).iterrows():
    conn.execute("""
        INSERT INTO news_articles (link, headline, category, short_description, authors, date)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        article['link'],
        article['headline'],
        article['category'],
        article['short_description'],
        article['authors'],
        article['date']
    ))

conn.commit()


count = conn.execute("SELECT COUNT(*) FROM news_articles").fetchone()[0]
print(f"Loaded {count:,} articles")

print("\nSample articles:")
for row in conn.execute("SELECT id, headline, category FROM news_articles LIMIT 5"):
    print(f"  [{row[2]}] {row[1][:70]}...")
```

    Loaded 1,000 articles

    Sample articles:
      [U.S. NEWS] Over 4 Million Americans Roll Up Sleeves For Omicron-Targeted COVID Bo...
      [U.S. NEWS] American Airlines Flyer Charged, Banned For Life After Punching Flight...
      [COMEDY] 23 Of The Funniest Tweets About Cats And Dogs This Week (Sept. 17-23)...
      [PARENTING] The Funniest Tweets From Parents This Week (Sept. 17-23)...
      [U.S. NEWS] Woman Who Called Cops On Black Bird-Watcher Loses Lawsuit Against Ex-E...

With the source data loaded, we'll now generate the embeddings for the `headline` and `short_description` fields, using the `nomic-embed-text-v1.5` model and store those in the database as well.

```python
from sentence_transformers import SentenceTransformer

model = SentenceTransformer('nomic-ai/nomic-embed-text-v1.5', trust_remote_code=True)
print(f"Model loaded (embedding dimension: {model.get_sentence_embedding_dimension()})")

```

    Model loaded (embedding dimension: 768)

```python
articles = conn.execute("""
    SELECT id, headline, short_description
    FROM news_articles
""").fetchall()

batch_size = 32
for i in range(0, len(articles), batch_size):
    batch = articles[i:i + batch_size]
    article_ids = [article[0] for article in batch]
    headlines = [article[1] for article in batch]
    descriptions = [article[2] if article[2] else "" for article in batch]

    headline_embeddings = model.encode(headlines, normalize_embeddings=True)
    description_embeddings = model.encode(descriptions, normalize_embeddings=True)

    # Store in database as BLOB
    for article_id, h_emb, d_emb in zip(article_ids, headline_embeddings, description_embeddings):
        h_blob = h_emb.tobytes()
        d_blob = d_emb.tobytes()
        conn.execute(
            "UPDATE news_articles SET headline_embedding = ?, description_embedding = ? WHERE id = ?",
            (h_blob, d_blob, article_id)
        )

    # Commit and show progress every 4000 articles (helpful if you actually load all the data)
    if (i + batch_size) % 4000 == 0 or (i + batch_size) >= len(articles):
        conn.commit()
        print(f"Processed {min(i + batch_size, len(articles)):,}/{len(articles):,} articles")
```

    Processed 1,000/1,000 articles

With the embeddings generated and inserted into the database, we'll now initialize the vector search for both the `headline` and `short_description` fields.
According to the [documentation](https://github.com/sqliteai/sqlite-vector/blob/main/API.md)

> Only tables explicitly initialized using vector_init are eligible for vector search.

So let's do that:

```python
conn.execute("""
    SELECT vector_init(
        'news_articles',
        'headline_embedding',
        'type=FLOAT32,dimension=768,distance=COSINE'
    )
""")

conn.execute("""
    SELECT vector_init(
        'news_articles',
        'description_embedding',
        'type=FLOAT32,dimension=768,distance=COSINE'
    )
""")
```

We could also [quantize](https://github.com/sqliteai/sqlite-vector/blob/main/QUANTIZATION.md) the vector for faster and more efficient search, but let's save that for another time.

With our embeddings generated and initialized, we can now define the search functions over the two fields.
Before we do though, we'll briefly discuss how the search functions work.
We start by taking `query_text` and encoding it using the same model we used to generate the embeddings.

```python
encoded = model.encode(["hello world!"])[0]
encoded[:20]  # truncated for brevity
```

    array([ 0.12390442, -0.06160246, -3.9840953 , -0.24632797, -0.3041943 ,
            1.5918531 , -0.20516105, -0.6006584 , -0.22573042, -1.319676  ,
            0.31299376,  1.2585417 ,  0.49875298,  1.381727  ,  0.5602437 ,
           -1.0751574 ,  0.27402204, -1.1879947 , -0.98643625,  0.46151334],
          dtype=float32)

Specifically, the size of the vector is equal to the number of dimensions of the embedding model.

```python
encoded.shape
```

    (768,)

Given this approach, let's show how we can calculate the distance of a `query` from one of the `headline`s in the dataset.
As we specified in `vector_init`, we will use cosine distance (`distance=COSINE`).

```python
from sklearn.metrics.pairwise import cosine_similarity


query = "sports"
headline = "New York City To Let Unvaccinated Athletes Play Home Games"

query_embedding = model.encode([query], normalize_embeddings=True)
headline_embedding = model.encode([headline], normalize_embeddings=True)

similarity = cosine_similarity(query_embedding, headline_embedding)
print(1-similarity)

```

    [[0.34292662]]

Back to analyzing our dataset -- since I normalized the embeddings when I encoded them above, we'll also need to do that here.
Finally, we'll get the output as an array that we can convert to a blob (our column data type of the embeddings) and pass it to the `vector_full_scan` function.

```python
f"{model.encode(["hello world!"], normalize_embeddings=True).tobytes()[:20]}..."
```

    "b'\\r-\\xb4;\\xa8(3\\xbb\\xdf\\x0b5\\xbej\\x193\\xbc*,]\\xbc'..."

```python
def search_by_headline(conn, query_text, top_k=5):
    query_embedding = model.encode([query_text], normalize_embeddings=True)
    query_blob = query_embedding.tobytes()

    results = conn.execute("""
        SELECT a.id, a.headline, a.category, a.short_description, v.distance
        FROM news_articles AS a
        JOIN vector_full_scan('news_articles', 'headline_embedding', ?, ?) AS v
            ON a.id = v.rowid
        ORDER BY v.distance ASC
    """, (query_blob, top_k)).fetchall()

    return results


def search_by_description(conn, query_text, top_k=5):
    query_embedding = model.encode([query_text], normalize_embeddings=True)
    query_blob = query_embedding.tobytes()

    results = conn.execute("""
        SELECT a.id, a.headline, a.category, a.short_description, v.distance
        FROM news_articles AS a
        JOIN vector_full_scan('news_articles', 'description_embedding', ?, ?) AS v
            ON a.id = v.rowid
        ORDER BY v.distance ASC
    """, (query_blob, top_k)).fetchall()

    return results
```

Let's run some semantic queries and see what we find!
This should look familiar -- we're using the same query we embedded and calculated cosine distance for above.

```python
query = "sports"

headline_results = search_by_headline(conn, query, top_k=3)
for i, (article_id, headline, category, description, distance) in enumerate(headline_results, 1):
    print(f"{i}. [{category}] {headline} (distance: {distance:.4f})")
```

    1. [U.S. NEWS] New York City To Let Unvaccinated Athletes Play Home Games (distance: 0.3429)
    2. [SPORTS] Video Shows NFL Player Hopping Into Stands To Stop Fighting Fans (distance: 0.3828)
    3. [POLITICS] NBA Won't Host Election Day Games In Effort To Increase Voter Turnout (distance: 0.4232)

We see an identical result as we calculated above for the first (and closest) headline match `(distance: 0.3429)`.

Now we can run a similar query on the `description` field:

```python
description_results = search_by_description(conn, query, top_k=3)
for i, (article_id, headline, category, description, distance) in enumerate(description_results, 1):
    print(f"{i}. [{category}] {headline} (distance: {distance:.4f})")
    print(f"   Description: {description}")
```

    1. [SPORTS] Las Vegas Aces Win First WNBA Title, Chelsea Gray Named MVP (distance: 0.3580)
       Description: Las Vegas never had a professional sports champion — until Sunday.
    2. [SPORTS] Lucius Fox Makes Sickening Exit Just 2 Pitches Into Game (distance: 0.3966)
       Description: The Washington Nationals infielder became a hurler for one gross moment — which was caught on video — against the San Francisco Giants.
    3. [SPORTS] Diego Maradona's 'Hand Of God' Jersey Sells For Record Sum (distance: 0.4160)
       Description: The Argentine soccer superstar wore the shirt when he scored the controversial goal against England in the 1986 World Cup.

```python
headline_results = search_by_headline(conn, "artificial intelligence", top_k=3)
description_results = search_by_description(conn, "artificial intelligence", top_k=3)

for i, (article_id, headline, category, description, distance) in enumerate(headline_results, 1):
    print(f"{i}. [{category}] {headline} (distance: {distance:.4f})")

print()

for i, (article_id, headline, category, description, distance) in enumerate(description_results, 1):
    print(f"{i}. [{category}] {description} (distance: {distance:.4f})")
```

    1. [TECH] Google Engineer On Leave After He Claims AI Program Has Gone Sentient (distance: 0.3774)
    2. [CULTURE & ARTS] How Ani Liu Is Brilliantly Disguising Her Art As Science (distance: 0.5151)
    3. [ENTERTAINMENT] Andrew Garfield Confirms Method Acting Is Possible Without 'Being An Asshole' (distance: 0.5217)

    1. [TECH] Artificially intelligent chatbot generator LaMDA wants “to be acknowledged as an employee of Google rather than as property," says engineer Blake Lemoine. (distance: 0.4230)
    2. [POLITICS] The House Intelligence Committee hearing follows a 2021 report of a possible national security "challenge" from UFOs. (distance: 0.4950)
    3. [U.S. NEWS] The American Academy of Pediatrics says it is putting all its guidance under the microscope to eliminate “race-based” medicine and resulting health disparities. (distance: 0.4967)

Embeddings and cosine similarity allow us to do search over the `headline` and `short_description` fields of the dataset, finding semantically similar results even if the results themselves don't contain or match the query text or parts of the query text exactly.
