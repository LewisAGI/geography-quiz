# geography-quiz content pack (v1, built 2026-10-22 23:12 ICT)

Generated entirely by `tools/build.py` (deterministic, seed 42). Re-run: `python3 tools/build.py && python3 tools/validate.py . && python3 tools/check_urls.py .`

## Counts
2,000 questions over 238 entities (sovereign states + territories with an ISO 3166 code in GeoNames and a CIA Factbook profile).
capital 216 · capital_reverse 216 · map_click 366 (216 capitals + 150 mountains) · flag 171 · border 162 · border_count 162 · population_compare 202 · population_band 208 · highest_point 220 · river 77.
Difficulty: easy 379 · medium 725 · hard 896. 242 sources, all fetched HTTP 200 (tools/url_check.json).

## Schema (content.json)
- `entities[]`: iso2, iso3, name (GeoNames English), continent, capital, capital_latlon [lat,lon], population, pop_year, sources[], note (disputed/special status).
- `questions[]`: id (q00001…), type, prompt, answer, distractors[] (MC; same-continent where possible), difficulty, country_iso2, sources[], optional explanation, note.
  - flag: prompt is the Factbook text description; `answer_iso2` + `flag_image_hint` let the app render a flag from an open set by ISO code. No images shipped. Flags whose description contains the country name were dropped.
  - map_click: lat, lon, tolerance_km (capitals 300/200/150 km by difficulty; peaks 150/100 km).
  - population_compare: country2_iso2; explanation gives both Factbook estimates and years.
- sources.json: id, title, publisher, url, type, note. One source per Factbook country file (`wfb-xx`, FIPS code) plus cia-wfb, factbook-json, geonames-countryinfo, ne-elev.

## Data sources and labels
- **Evidence**: all answers come straight from CIA World Factbook (factbook.json mirror, commit in content.json `factbook_snapshot`, Sep 2026), GeoNames countryInfo (ISO codes, continent, FIPS->ISO), Natural Earth 10m elevation points (mountain coordinates/heights).
- **Inference**: difficulty = population rank (top 40 easy, 41-120 medium, rest hard; peaks by Natural Earth scalerank). Not a measure of real-world familiarity.
- **Uncertainty**: Factbook population figures are estimates of differing years (2024/2025). Border counts follow Factbook (may count territories like French Guiana's neighbours under France). Natural Earth elevations can differ by metres from national surveys (note on each peak question).

## Disputed territories (neutral notes, `note` field)
TW, XK, EH, PS, IL, CY, GE, MD, UA, IN, PK, CN, MA, SO, SS, SD carry neutral notes. Capital questions skipped for IL, PS, EH (disputed) and BO, ZA, NL (multiple capitals, noted instead).

## Gaps
- UN data not used (Factbook chosen for single consistent source); a UN WPP cross-check of populations is a next step.
- River questions only 77 (first "major river" per country); no lake, desert or ocean questions yet. Natural Earth rivers file is cached in scratch but unused.
- Map-click for borders/regions (polygon hit-testing) not built; capitals and peaks only.
- Distractors are random within continent; some may be too easy. Not human-reviewed; spot-checked ~30 questions.
- Factbook text in local spellings for some capitals (e.g. "Mexico City (Ciudad de Mexico)"); app may want display cleanup.

## Verification log
- 2026-10-22 23:12 ICT: built from Factbook commit 144d697, GeoNames, Natural Earth. validate.py: 0 errors (2,238 sourced objects, no unused/duplicate ids). check_urls.py: 242/242 HTTP 200.
- Spot checks: Paris/France, Asunción/Paraguay, Greece borders, Sweden vs Latvia population, Tajikistan/Syr Darya all match Factbook text.
- Fixed during build: river names stripped of "river mouth/source" suffix and English names preferred (Rhin -> Rhine); river distractors exclude any river mentioned for the country; flag questions leaking the country name removed.
