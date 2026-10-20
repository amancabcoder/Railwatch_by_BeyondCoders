# Railwatch + TinyFish Integration

## 1. Overview

Railwatch is a railway-corridor monitoring and inspection-prioritisation
prototype for the Delhi railway network. It combines satellite imagery,
weather and hydrological observations, vegetation and water-change
indicators, railway/geographic references, public notices and geotagged
citizen reports.

**TinyFish adds a web intelligence layer.** It can search the live web,
fetch rendered pages into structured content, and run goal-driven
browser workflows on supported public websites. Railwatch can use it to
discover and extract public information that is not conveniently
available through a structured API.

TinyFish is not a satellite data provider, GIS system, weather station
or railway land-record authority. Use official APIs and authorised
datasets for measurements and authoritative boundaries.

> **Safety and scope:** Railwatch is a decision-support prototype. It
> does not replace official railway inspections, engineering judgement,
> emergency response procedures or authorised land-record verification.
> An AI alert is not proof of a safety defect or illegal encroachment.

## 2. What TinyFish contributes

TinyFish currently presents four main capabilities:

  --------------------------------------------------------------------------
  Capability              Railwatch use              Recommended priority
  ----------------------- -------------------------- -----------------------
  TinySearch              Discover public railway    High
                          notices, flood bulletins,  
                          project updates and        
                          environmental reports      

  TinyFetch               Read a known public        High
                          webpage and extract        
                          content as Markdown, JSON  
                          or HTML                    

  TinyAgent / Web Agent   Navigate a multi-step      Medium
                          public website workflow    
                          and return structured      
                          results                    

  TinyBrowser             Run custom                 Later / only if needed
                          Playwright/Puppeteer/CDP   
                          automation in a managed    
                          browser session            
  --------------------------------------------------------------------------

Official starting points:

-   TinyFish website: https://www.tinyfish.ai/
-   TinyFish Web Agent: https://agent.tinyfish.ai/
-   TinyFish cookbook and API examples:
    https://github.com/tinyfish-io/tinyfish-cookbook
-   TinyFish Browser overview: https://www.tinyfish.ai/browser

Check current official documentation for endpoint schemas, limits,
pricing, authentication and terms before deploying. Product details can
change.

## 3. Proposed Railwatch + TinyFish architecture

``` text
             STRUCTURED / GEOSPATIAL DATA
   Copernicus | Earth Engine | Weather APIs | CWC | OSM
                         |
                         v
              Data collection and processing
                         |
                         v
                 PostGIS / Object Storage
                         ^
                         |
                 TINYFISH WEB LAYER
        +----------------+------------------+
        |                |                  |
     TinySearch       TinyFetch          TinyAgent
   Discover pages   Extract page data   Multi-step research
        |                |                  |
        +----------------+------------------+
                         |
                         v
            Source validation and normalisation
                         |
                         v
               Public information records
                         |
                         v
         Segment matching + human verification
                         |
                         v
       Vegetation / Flood / Encroachment models
                         |
                         v
               Explainable risk engine
                         |
                         v
             Railwatch map and dashboard
```

### Recommended division of responsibility

-   Use Copernicus / Earth Engine for satellite observations and derived
    raster features.
-   Use weather and hydrology sources for rainfall and water-level
    measurements.
-   Use TinyFish to find, read and monitor relevant public web
    information.
-   Use official railway records and authorised GIS data for railway
    asset and land-boundary verification.
-   Use Railwatch's own upload service for citizen photographs.
-   Use human review before a public web report or citizen complaint
    influences a high-priority operational alert.

## 4. Useful TinyFish workflows for Railwatch

### Workflow A --- Discover public railway updates

Search for public information such as:

-   Delhi railway maintenance or infrastructure notices.
-   Public railway project updates.
-   Publicly released inspection or safety-related reports.
-   Government announcements concerning drainage, bridges or railway
    corridors.

Example search themes:

``` text
Delhi railway drainage work public notice
Delhi railway bridge maintenance public update
Delhi railway land encroachment public notice
Delhi railway flood waterlogging news
Delhi railway infrastructure project update
```

Search results are leads, not verified facts. Save the original source
URL, publisher and publication date. A news report or search snippet
must not be treated as an official engineering finding.

### Workflow B --- Fetch and extract a known page

When a source URL is known, use TinyFetch to retrieve rendered page
content. Extract only fields needed by Railwatch:

-   Page title.
-   Publisher or issuing organisation.
-   Publication date.
-   Notice or report type.
-   Location or railway station mentioned.
-   Relevant summary.
-   Original source URL.

### Workflow C --- Monitor public bulletins

Run scheduled searches for selected topics, then compare new source URLs
and publication dates against previously stored records. Do not
repeatedly crawl a site at high frequency. Respect its terms, robots
instructions, rate limits and access restrictions.

### Workflow D --- Multi-step public portal research

Use TinyAgent only where a public portal requires navigation, filters,
pagination or other multi-step browsing. Give the agent a narrow task
and request structured JSON with source URLs. Do not ask it to infer
legal ownership, engineering safety or facts not stated on the source
page.

## 5. TinyFish API setup

1.  Create an account using the official TinyFish website.
2.  Create an API key in the TinyFish dashboard.
3.  Store the key as an environment variable.
4.  Do not put the API key in frontend code, GitHub, notebooks committed
    to a repository, or public logs.
5.  Check current account limits and pricing before scheduling recurring
    jobs.

Create a `.env` file locally:

``` env
TINYFISH_API_KEY=replace_with_your_key
```

Add `.env` to `.gitignore`:

``` gitignore
.env
.env.*
!.env.example
```

Create a safe `.env.example`:

``` env
TINYFISH_API_KEY=
```

Install dependencies:

``` bash
pip install requests python-dotenv
```

## 6. TinySearch --- discover relevant pages

The TinyFish cookbook documents a Search endpoint at
`https://api.search.tinyfish.ai`.

Example Python request:

``` python
import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ["TINYFISH_API_KEY"]

def tinyfish_search(query: str):
    response = requests.get(
        "https://api.search.tinyfish.ai",
        params={"query": query},
        headers={"X-API-Key": API_KEY},
        timeout=60,
    )
    response.raise_for_status()
    return response.json()

results = tinyfish_search(
    "Delhi railway drainage flood public notice"
)
print(results)
```

Inspect the actual response structure from your account/API version
before mapping it into the Railwatch database. Store development
responses with secrets removed so your team can adapt the parser to the
current response schema.

## 7. TinyFetch --- extract content from known URLs

The cookbook documents a Fetch endpoint at
`https://api.fetch.tinyfish.ai`, accepting a list of URLs.

Example:

``` python
import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ["TINYFISH_API_KEY"]

def tinyfish_fetch(urls: list[str]):
    response = requests.post(
        "https://api.fetch.tinyfish.ai",
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        json={"urls": urls},
        timeout=120,
    )
    response.raise_for_status()
    return response.json()

pages = tinyfish_fetch([
    "https://indianrailways.gov.in/"
])
print(pages)
```

Use a URL allowlist in production. Do not accept arbitrary URLs from
anonymous users and fetch them on the backend. Validate schemes and
hosts to reduce server-side request forgery (SSRF) risks. Never fetch
private network addresses, localhost, cloud metadata endpoints or
internal services.

## 8. TinyAgent --- goal-driven web research

TinyAgent is useful for public websites where information requires
multiple navigation steps.

The TinyFish cookbook documents the streaming endpoint:

`https://agent.tinyfish.ai/v1/automation/run-sse`

Example Python starter:

``` python
import os
import requests
from dotenv import load_dotenv

load_dotenv()
API_KEY = os.environ["TINYFISH_API_KEY"]

def tinyfish_agent(url: str, goal: str):
    response = requests.post(
        "https://agent.tinyfish.ai/v1/automation/run-sse",
        headers={
            "X-API-Key": API_KEY,
            "Content-Type": "application/json",
        },
        json={
            "url": url,
            "goal": goal,
        },
        stream=True,
        timeout=300,
    )
    response.raise_for_status()

    for line in response.iter_lines(decode_unicode=True):
        if line:
            print(line)

tinyfish_agent(
    "https://indianrailways.gov.in/",
    """
    Review publicly accessible pages relevant to Delhi railway
    infrastructure updates. Return only information explicitly
    present on the pages. Provide JSON records with:
    title, issuing_organisation, publication_date, location,
    summary, source_url, and uncertainty_notes.
    Do not infer railway land ownership or safety status.
    """
)
```

This example prints the SSE stream for inspection. Check the current API
documentation for event framing and final-result payload, then parse it
into a validated internal schema. Do not assume each streamed line is a
complete JSON result.

## 9. Normalised Railwatch web intelligence schema

Store TinyFish outputs as source records. Keep extracted statements
separate from verified railway observations.

Example JSON record:

``` json
{
  "record_id": "WEB-DEL-0001",
  "provider": "tinyfish",
  "capability": "search_fetch",
  "source_url": "https://example.gov.in/public-notice",
  "publisher": "Example public authority",
  "title": "Example public infrastructure notice",
  "published_at": null,
  "retrieved_at": "2026-10-14T12:00:00+05:30",
  "location_text": "Delhi",
  "railway_segment_id": null,
  "topic": "drainage",
  "summary": "Illustrative summary; replace with extracted source content.",
  "source_type": "official_notice",
  "verification_status": "pending",
  "reviewer_id": null,
  "reviewed_at": null,
  "content_hash": null
}
```

The example URL and content are placeholders, not real notices.

Suggested database table: `web_intelligence_records`.

  Field                 Type                Purpose
  --------------------- ------------------- ---------------------------------------
  record_id             UUID / VARCHAR      Unique record
  provider              VARCHAR             `tinyfish`
  capability            VARCHAR             Search, Fetch or Agent
  source_url            TEXT                Original source
  publisher             TEXT                Issuing organisation
  title                 TEXT                Page or notice title
  published_at          TIMESTAMPTZ         Source publication date, if available
  retrieved_at          TIMESTAMPTZ         Collection timestamp
  location_text         TEXT                Location as written by source
  segment_id            VARCHAR, nullable   Linked segment after review
  topic                 VARCHAR             Flood, drainage, project, land, etc.
  summary               TEXT                Concise extracted summary
  raw_payload_uri       TEXT                Secure reference to raw response
  verification_status   VARCHAR             Pending, verified, rejected
  reviewer_id           TEXT, nullable      Authorised reviewer
  content_hash          TEXT                Duplicate detection

Keep a provenance table to record source licence, publisher, retrieval
time, original URL and permitted reuse.

## 10. How web intelligence should affect risk assessments

TinyFish outputs should not directly assign a railway segment to an
urgent category.

Recommended flow:

1.  TinyFish discovers or extracts a public report.
2.  Railwatch stores the source URL and retrieval timestamp.
3.  A parser converts the response into the normalised schema.
4.  A location-matching step proposes a station, corridor or segment.
5.  A human reviewer checks the source and location.
6.  If relevant, the verified information is made available to the risk
    engine.
7.  The risk engine records which evidence contributed to the alert.

Example:

-   A public bulletin mentions waterlogging near a railway location.
-   Railwatch stores it as an unverified web intelligence record.
-   The location matcher suggests a nearby segment.
-   A reviewer confirms that the report is relevant.
-   Satellite imagery and rainfall observations are checked
    independently.
-   The system creates an inspection recommendation if the combined
    evidence meets the prototype's review policy.

A public news article alone should not trigger a claim that a railway
segment is unsafe.

## 11. Suggested source categories and search schedule

  -----------------------------------------------------------------------
  Topic                   Example query           Prototype schedule
  ----------------------- ----------------------- -----------------------
  Railway works           Delhi railway           Daily
                          maintenance work public 
                          notice                  

  Flooding                Delhi railway           Every 6 hours during
                          waterlogging flood      monsoon monitoring;
                          bulletin                otherwise daily

  Bridges                 Delhi railway bridge    Daily
                          inspection or repair    
                          public update           

  Encroachment            Delhi railway land      Weekly
                          encroachment official   
                          notice                  

  Drainage                Delhi railway drainage  Daily during monsoon
                          improvement public      
                          notice                  

  Environmental changes   Delhi railway corridor  Weekly
                          vegetation clearance    
                          notice                  
  -----------------------------------------------------------------------

These are suggested prototype schedules, not a requirement to crawl
every website at that frequency. Prefer official feeds and APIs when
available. Use slower schedules for sites with restrictive terms or
infrequently updated content.

## 12. Recommended project structure

``` text
railwatch/
├── README.md
├── .env.example
├── .gitignore
├── data_collection/
│   ├── satellite/
│   │   ├── sentinel_download.py
│   │   └── earth_engine_processing.py
│   ├── weather/
│   │   └── weather_download.py
│   ├── geography/
│   │   └── osm_download.py
│   └── tinyfish/
│       ├── search_public_sources.py
│       ├── fetch_public_pages.py
│       ├── agent_public_research.py
│       ├── parse_sse.py
│       └── normalise_records.py
├── preprocessing/
│   ├── calculate_ndvi.py
│   ├── flood_mapping.py
│   └── segment_matching.py
├── models/
│   ├── vegetation/
│   ├── flooding/
│   └── encroachment/
├── backend/
│   ├── main.py
│   ├── routes/
│   ├── database/
│   └── services/
├── frontend/
├── schemas/
│   ├── web_intelligence.schema.json
│   └── segment_observation.schema.json
└── notebooks/
    └── data_quality_checks.ipynb
```

## 13. Environment variables and security

-   Keep TinyFish API keys on the backend only.
-   Never expose API keys in React or browser JavaScript.
-   Restrict which domains TinyFish jobs may visit.
-   Validate and sanitise extracted content before storing or displaying
    it.
-   Treat webpage text as untrusted input; pages can contain misleading
    content or prompt-injection attempts.
-   Do not let extracted page instructions change system prompts, call
    arbitrary tools or execute code.
-   Do not submit private citizen data, personal information or
    confidential railway records to external web agents unless
    explicitly authorised and covered by the relevant privacy and
    security arrangements.
-   Use official, public pages and respect website terms, copyright,
    robots instructions and rate limits.
-   Do not attempt to bypass authentication, paywalls or access
    controls.
-   Keep audit logs for queries, URLs, retrieval timestamps, reviewer
    decisions and downstream alerts.

## 14. Data quality and verification rules

Before a TinyFish record can influence a segment assessment, check:

-   Does the source URL exist and belong to the claimed publisher?
-   Is the publisher an official authority, reputable media source or
    another clearly identified source?
-   Is the publication date known?
-   Is the report about Delhi and the relevant railway location?
-   Does it describe an observation, proposal, planned work or confirmed
    incident?
-   Is the same report duplicated elsewhere?
-   Has a human reviewer confirmed its relevance?
-   Is the record still current?

Use explicit statuses:

-   `pending`: retrieved but not reviewed.
-   `verified`: source and relevance checked.
-   `rejected`: irrelevant, misleading or unsupported.
-   `duplicate`: same underlying report already stored.
-   `expired`: no longer current for operational context.

## 15. Hackathon implementation plan

### Phase 1 --- Setup

-   Create TinyFish account and API key.
-   Add API key to backend environment.
-   Test TinySearch with one Delhi railway query.
-   Test TinyFetch with one known public page.
-   Save example responses securely.

### Phase 2 --- Build the web intelligence collector

-   Create a small allowlist of official public domains.
-   Add search queries for railway, flood, drainage and infrastructure
    topics.
-   Fetch relevant result pages.
-   Parse source URL, title, publisher, date and summary.
-   Save normalised records to PostgreSQL.

### Phase 3 --- Add verification

-   Build an admin review queue.
-   Show the original source beside extracted text.
-   Allow a reviewer to verify, reject or mark duplicate.
-   Add optional segment matching after location review.

### Phase 4 --- Integrate with Railwatch

-   Display verified public reports on the map.
-   Show source and retrieval date.
-   Link reports to satellite and weather observations.
-   Add evidence references to each inspection recommendation.
-   Keep web intelligence as supporting evidence, not an independent
    safety verdict.

### Phase 5 --- Demonstration

For the hackathon demo:

1.  Search for a public Delhi railway infrastructure update using
    TinySearch.
2.  Fetch one relevant public page using TinyFetch.
3.  Extract a structured record.
4.  Show the source URL and publication date.
5.  Have an admin verify the record.
6.  Link it to a candidate railway segment.
7.  Show the record alongside satellite, rainfall and citizen-report
    evidence on the Railwatch dashboard.

Use clearly labelled sample records if no relevant live public notice is
found. Never fabricate an official alert.

## 16. Testing checklist

-   [ ] API key is stored in backend environment variables.
-   [ ] TinySearch request succeeds.
-   [ ] TinyFetch request succeeds.
-   [ ] TinyAgent SSE output is parsed according to current
    documentation.
-   [ ] Errors, timeouts and rate limits are handled.
-   [ ] Duplicate source URLs are detected.
-   [ ] Publication date and retrieval date are stored separately.
-   [ ] Every extracted record retains its source URL.
-   [ ] Unverified records cannot create an urgent operational alert.
-   [ ] Human review and audit trail are available.
-   [ ] Domain allowlist and SSRF protections are enabled.
-   [ ] No personal or confidential data is sent to TinyFish without
    authorisation.

## 17. Official TinyFish references

-   Main website: https://www.tinyfish.ai/
-   Web Agent: https://agent.tinyfish.ai/
-   Cookbook / examples:
    https://github.com/tinyfish-io/tinyfish-cookbook
-   Browser API overview: https://www.tinyfish.ai/browser
-   Agent API endpoint used in cookbook examples:
    https://agent.tinyfish.ai/v1/automation/run-sse
-   Search API endpoint used in cookbook examples:
    https://api.search.tinyfish.ai
-   Fetch API endpoint used in cookbook examples:
    https://api.fetch.tinyfish.ai

The cookbook includes example REST calls for Search, Fetch and Agent.
Verify the latest request and response schemas in official documentation
before production use.

------------------------------------------------------------------------

## 18. Final recommendation

For Railwatch, use TinyFish as the **Public Web Intelligence
Collector**.

The strongest division of work is:

-   Copernicus / Earth Engine: satellite imagery and remote-sensing
    analysis.
-   IMD / Open-Meteo / CWC: weather and hydrological information.
-   OpenStreetMap and authorised railway records: geographic references.
-   TinyFish: discovery and extraction of relevant public web
    information.
-   Citizen reporting: local photographs and complaints.
-   Railwatch AI: image analysis, change detection and
    inspection-priority support.
-   Human reviewers: source verification and operational decisions.

This makes TinyFish a useful additional layer without confusing
web-reported information with measured environmental data or official
railway records.8

**Project:** Railwatch\
**Integration:** TinyFish Web Intelligence\
**Geographical scope:** Delhi railway network\
**Target:** Hackathon / startup prototype\
**Document status:** Integration plan; verify current TinyFish API
documentation, terms and pricing before implementation.


## Aerial Encroachment Analysis (integrated module)

The teammate's aerial-image change detection prototype is available from the **Aerial Analysis**
tab. It runs inside the existing Express server and keeps the existing GIS, TinyFish intelligence,
citizen-report, review, and work-order flows intact.

### Additional runtime requirement

Install Python 3.10+ and the computer-vision dependencies:

```bash
python3 -m pip install opencv-python numpy
npm install
npm run dev
```

The integrated analysis API uses the existing server on port 5000. The teammate's standalone
module is under `encroachment/` (`cv/detect.py`, `config/sections.json`, demo imagery, and review
dashboard). Analysis output is stored in `encroachment/data/analyses/`.

**Prototype limitation:** the included demo imagery is synthetic. Validate with representative,
properly georeferenced imagery and railway boundary records before using detections operationally.
