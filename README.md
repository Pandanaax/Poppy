
# Poppy Poppy Journey Planner

A brief description of what this project does and who it's for


A multi-leg journey planner & price estimator for Poppy. It picks the cheapest strategy per leg/session using live vehicles, geofences, and pricing (per-minute vs per-km), including reservation (first 15 min free) and pause vs end decisions.

## Tech Stack

**Client:** React, Redux, TailwindCSS

**Server:** Node, Express


## Features

- Multi-leg journeys (legs[]), each leg has from, to, optional stopMinutes and startAt/endAt.

- Live vehicles in Brussels; user is indifferent to keeping the same car → we pick nearest vehicle per leg.

- Parking vs no-parking geofences (supports Polygon and MultiPolygon).

- Pricing choice per session (no switching mid-session): per-minute or per-km (whichever is cheaper).

- Reservation: first 15 min free, then bookUnitPrice per minute; unlock fee applied once per session.

- Pause vs End at destination:

- If destination is no-parking, compare PAUSE at destination vs END at nearest parking boundary + walk.

- If destination is parking, compare PAUSE vs END and choose cheaper.

- Caps (if present in pricing): hourly/daily caps applied per session.

- Distance/time:

 Default crow-fly with speeds (drive 25 km/h, walk 5 km/h).

Optional OpenRouteService integration for real drive/walk ETA.

- Units: all engine computations are in thousandths, VAT excl. (API convention). UI can display TTC if desired.

## How the engine works

For each leg:

1) Pick the nearest available vehicle (Haversine distance).

2) Compute walk minutes to the vehicle (provider ETA or crow-fly) → reservation cost (first 15 min free).

3) Compute drive minutes and distance for the leg.

4) Compute per-minute cost vs per-km cost (one basis per session).

5) Compute pause cost if stopMinutes > 0.

6) If destination is no-parking, evaluate END near parking boundary + walk vs PAUSE at destination, choose cheaper.

7) If destination is parking, evaluate END vs PAUSE, choose cheaper.

Sessions & caps:

A session = reservation + unlock + one or more drive/pause segments until you END.

Dynamic programming stores two states at each leg index:

NO (no open session) and HAS (session open).

We apply hour/day caps when closing a session (with the same pricing used for that session).

Output:

- bestChoice: "perMinute" or "perKilometer".

- priceMilliExclVAT: total in thousandths (excl. VAT).

- plan[]: mirrors legs with an action hint.

- scenarios: raw totals for both bases.

## Architecture 
```http
Poppy/
├─ apps/
│  ├─ web/
│  │  ├─ public/
│  │  │  └─ poppy-logo.png
│  │  ├─ src/
│  │  │  ├─ components/
│  │  │  │  ├─ PlannerForm.tsx
│  │  │  │  ├─ StageRow.tsx
│  │  │  │  ├─ ResultCard.tsx
│  │  │  │  ├─ Header.tsx
│  │  │  │  └─ ui/
│  │  │  │     ├─ Button.tsx
│  │  │  │     └─ Card.tsx
│  │  │  ├─ lib/
│  │  │  │  └─ ors.ts
│  │  │  ├─ constants.ts
│  │  │  ├─ App.tsx
│  │  │  ├─ main.tsx
│  │  │  └─ index.css
│  │  ├─ index.html
│  │  ├─ vite.config.ts
│  │  ├─ tailwind.config.js
│  │  └─ postcss.config.js
│  └─ api/                      (optionnel — supprime si non utilisé)
│     └─ smoke.ts               (exécutions locales de l’engine)
├─ packages/
│  └─ shared/
│     ├─ src/
│     │  ├─ api.ts              (fetch vehicles/geozones/pricing + normalisation)
│     │  ├─ pricing.ts          (estimateJourney: coûts, sessions, caps)
│     │  ├─ geo.ts              (haversine, point-in-polygon, multipolygons)
│     │  ├─ routes.ts           (RouteProvider: crow-fly / ORS)
│     │  ├─ types.ts            (Vehicle, Pricing, Leg, Journey, …)
│     │  ├─ index.ts            (exports du package)
│     │  ├─ test.setup.ts       (optionnel, tests)
│     │  └─ *.test.ts           (optionnel, tests Vitest)
│     ├─ package.json
│     ├─ tsconfig.json
│     └─ dist/                  (build — ignoré par git)
├─ .gitignore
├─ .nvmrc
├─ package.json
├─ package-lock.json
├─ tsconfig.base.json
└─ README.md
```
The UI hides raw IDs (city/geozone) and shows readable labels (“Bruxelles”, “Zones parking (voitures)”).

## Installation

Install my-project with npm

```bash
  npm install my-project
  cd my-project
```
    
## Assumptions

- Cars only (vans filtered when identifiable).

- User indifferent to vehicle continuity → pick nearest per leg.

- Routing: crow-fly fallback is acceptable (assignment explicitly allows it).

- Speeds: 25 km/h driving, 5 km/h walking (override via ORS).

- VAT: engine keeps excl. VAT (API convention). UI can convert to TTC if needed.
## APIs & data

#### Vehicule & Brussels (Brussels)
```http
   /api/v3/cities/a88ea9d0-3d5e-4002-8bbf-775313a5973c/vehicles
```
#### Geozones (parking/no-parking):
```http
   /api/v3/geozones/62c4bd62-881c-473e-8a6b-fbedfd276739
```
#### Pricing (valid params only):
```http
   /api/v3/pricing/pay-per-use?modelType=car&tier=S|M|L|XL
```
#### Important:

The pricing API only accepts modelType=car|van. Never send a model name (e.g. CORSA) → 422.

Vehicle data is normalized from multiple shapes (public v3 & partner) and fallback to partner API if configured.
## Run Locally

#### Clone the project

#### Requirements

Node 18+ (has global fetch)

NPM 9+

```bash
  npm install
```

Create apps/web/.env (see .env.example if present):


```bash
VITE_POPPY_PARTNER_KEY=your-partner-api-key

# Optional ORS (routing ETA). If absent or false → crow-fly fallback is used.
VITE_USE_ORS=true
VITE_ORS_API_KEY=your-ors-key
```

Proxy (already configured)

Vite proxies /poppy/* → https://poppy.red/*.

#### Run
```bash
npm run -w @poppy/shared build

start the web app
npm run web
# → http://localhost:5173 (or 5174 if the port is busy)
```

## Running Tests

To run tests, run the following command

```bash
npm -w @poppy/shared i -D vitest @types/node

# run tests
npm -w @poppy/shared test
npm run web
```
