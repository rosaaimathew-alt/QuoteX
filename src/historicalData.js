// Real 2024–2025 job & appointment history, loaded into the software as
// `isHistorical` records so the dashboards reflect the business BEFORE the
// platform went live in 2026. Imported once via importHistory2024_2025() in
// the store; everything here is real data the owner provided.
//
// Won jobs carry the real client + contract value + sale MONTH (day pinned to
// the 15th — only month granularity was available). Appointment counts are the
// real monthly logs; the importer fills the non-won remainder with blank
// historical "Lost" proposals so the appointments line matches without
// inventing client/revenue detail.

// ── Won jobs: 2024 (46) + 2025 (47 line items incl. 3 add-ons) ──────────────
export const HISTORICAL_JOBS = [
  // 2024 — January
  { client: 'Raju Varna',                total: 32500,    date: '2024-01-15' },
  { client: 'Nate Haddox',               total: 12000,    date: '2024-01-15' },
  { client: 'Jim Tribble',               total: 42350,    date: '2024-01-15' },
  { client: 'Charles Huffman',           total: 13900,    date: '2024-01-15' },
  // 2024 — April
  { client: 'Ed Zimnowski',              total: 51000,    date: '2024-04-15' },
  { client: 'Peter Sallemi',             total: 23200,    date: '2024-04-15' },
  { client: 'Matt Mogk',                 total: 24400,    date: '2024-04-15' },
  { client: 'Susanne & Jonathan Morgan', total: 64770,    date: '2024-04-15' },
  { client: 'Stephen Maier',             total: 38800,    date: '2024-04-15' },
  { client: 'Tom Bastian',               total: 24760,    date: '2024-04-15' },
  // 2024 — May
  { client: 'Kelly Randall',             total: 39250,    date: '2024-05-15' },
  { client: 'Tiffany Faulkner',          total: 40000,    date: '2024-05-15' },
  { client: 'Adriane Brown',             total: 41950,    date: '2024-05-15' },
  // 2024 — June
  { client: 'Ellen & Nick',              total: 63250,    date: '2024-06-15' },
  { client: 'Amelia & Karunya',          total: 26500,    date: '2024-06-15' },
  { client: 'Yoni Kaplansky',            total: 70718.99, date: '2024-06-15' },
  { client: 'Sean Riley',                total: 26600,    date: '2024-06-15' },
  // 2024 — July
  { client: 'Ni Ankra',                  total: 30000,    date: '2024-07-15' },
  { client: 'Jana Gullio',               total: 38700,    date: '2024-07-15' },
  { client: 'Lawrence Quinn',            total: 3000,     date: '2024-07-15' },
  { client: 'Rodney Collins',            total: 14752,    date: '2024-07-15' },
  { client: 'Jenny',                     total: 53650,    date: '2024-07-15' },
  { client: 'Jaqueline Smith',           total: 33500,    date: '2024-07-15' },
  { client: 'Sean Condon',               total: 50600,    date: '2024-07-15' },
  { client: 'Hari Chipthu',              total: 7500,     date: '2024-07-15' },
  // 2024 — August
  { client: 'Brian Martin',              total: 23400,    date: '2024-08-15' },
  { client: 'Jim High',                  total: 37602,    date: '2024-08-15' },
  { client: 'Erik Henderickson',         total: 25000,    date: '2024-08-15' },
  { client: 'Ben & Susan Gregory',       total: 15710,    date: '2024-08-15' },
  { client: 'Kelly Randal',              total: 28376,    date: '2024-08-15' },
  // 2024 — September
  { client: 'Brett Findlay',             total: 70180,    date: '2024-09-15' },
  { client: 'Jason & Shauna',            total: 29650,    date: '2024-09-15' },
  { client: 'Scott Weynand',             total: 60700,    date: '2024-09-15' },
  { client: 'Carter Garbutt',            total: 83320,    date: '2024-09-15' },
  // 2024 — October
  { client: 'Melissa Skalla',            total: 44800,    date: '2024-10-15' },
  { client: 'Michael Tomsic',            total: 17800,    date: '2024-10-15' },
  { client: 'Bryan and Katrina',         total: 62950,    date: '2024-10-15' },
  { client: 'Selen',                     total: 82250,    date: '2024-10-15' },
  // 2024 — November
  { client: 'Max & Katie Schulman',      total: 60150,    date: '2024-11-15' },
  { client: 'Courtney and Ryan',         total: 48370,    date: '2024-11-15' },
  { client: 'Angelique Curley',          total: 48000,    date: '2024-11-15' },
  { client: 'Josh & Erin Winchester',    total: 21500,    date: '2024-11-15' },
  { client: 'Ramsey & Lauren',           total: 16350,    date: '2024-11-15' },
  { client: 'Kerry Abrams',              total: 47000,    date: '2024-11-15' },
  // 2024 — December
  { client: 'Sean and Katya Harvey',     total: 44750,    date: '2024-12-15' },
  { client: 'Jason and Christine',       total: 89000,    date: '2024-12-15' },

  // 2025 — January
  { client: 'Matt Mogk',                 total: 7200,     date: '2025-01-15' },
  { client: 'Glenn Hines',               total: 90880,    date: '2025-01-15' },
  // 2025 — March
  { client: 'Alex and Kristen Huffman',  total: 58037,    date: '2025-03-15' },
  { client: 'Mike Thomas',               total: 43000,    date: '2025-03-15' },
  { client: 'Elena Gomez',               total: 15310,    date: '2025-03-15' },
  { client: 'Steve and Viviane Lane',    total: 32810,    date: '2025-03-15' },
  { client: 'Terrence',                  total: 37000,    date: '2025-03-15' },
  { client: 'Steve and Viviane Lane (add-on)', total: 580, date: '2025-03-15' },
  { client: 'Drew Crawford',             total: 120602,   date: '2025-03-15' },
  // 2025 — April
  { client: 'Charles Myers',             total: 56270,    date: '2025-04-15' },
  { client: 'Brandan & Rachel Halsey',   total: 58000,    date: '2025-04-15' },
  { client: 'Sherman Pharr',             total: 20650,    date: '2025-04-15' },
  { client: 'Nick and Ellen Norman',     total: 8210,     date: '2025-04-15' },
  { client: 'Brett Findlay',             total: 36095,    date: '2025-04-15' },
  { client: 'Bob Driver',                total: 28600,    date: '2025-04-15' },
  { client: 'Chris Reed',                total: 29500,    date: '2025-04-15' },
  { client: 'Wayne Anderson',            total: 18830,    date: '2025-04-15' },
  // 2025 — May
  { client: 'Andrew Polonus',            total: 46220,    date: '2025-05-15' },
  { client: 'Mitchell Hunt',             total: 9250,     date: '2025-05-15' },
  { client: 'Roy & Lori Izzo',           total: 99941,    date: '2025-05-15' },
  { client: 'Eddie Dornsmith',           total: 13500,    date: '2025-05-15' },
  { client: 'Jason and Christine Duffy', total: 15040,    date: '2025-05-15' },
  { client: 'Bill Eisley',               total: 41760,    date: '2025-05-15' },
  // 2025 — June
  { client: 'Julie',                     total: 78930,    date: '2025-06-15' },
  { client: 'Darnell & Dedra',           total: 40000,    date: '2025-06-15' },
  // 2025 — July
  { client: 'Darnell (add-on)',          total: 2600,     date: '2025-07-15' },
  // 2025 — August
  { client: 'Yared Gebregiorgis',        total: 9105,     date: '2025-08-15' },
  { client: 'Daniel Sabido',             total: 40590,    date: '2025-08-15' },
  { client: 'Jennifer Heidel',           total: 17110,    date: '2025-08-15' },
  // 2025 — September
  { client: 'Charity and Matt',          total: 80500,    date: '2025-09-15' },
  { client: 'Tom Bastian',               total: 22337,    date: '2025-09-15' },
  { client: 'Selen Vining',              total: 13228,    date: '2025-09-15' },
  { client: 'Jay Shad',                  total: 40000,    date: '2025-09-15' },
  // 2025 — October
  { client: 'Ashley Hollifield',         total: 10884,    date: '2025-10-15' },
  { client: 'Chase',                     total: 13054,    date: '2025-10-15' },
  { client: 'Lauren',                    total: 28950,    date: '2025-10-15' },
  { client: 'Terry and Paul Kramlick',   total: 7370,     date: '2025-10-15' },
  { client: 'Yanim & Jim Heaney',        total: 117537,   date: '2025-10-15' },
  { client: 'Wesley Norman',             total: 17280,    date: '2025-10-15' },
  { client: 'Clifford Moore',            total: 19384,    date: '2025-10-15' },
  // 2025 — November
  { client: 'Paul & Quinn Braneky',      total: 83813,    date: '2025-11-15' },
  { client: 'Carter (add-on)',           total: 13610,    date: '2025-11-15' },
  { client: 'Duncan & Samantha Dorris',  total: 69550,    date: '2025-11-15' },
  // 2025 — December
  { client: 'Brian Register',            total: 13900,    date: '2025-12-15' },
  { client: 'Joe and Chris Aug',         total: 49596,    date: '2025-12-15' },
  { client: 'Ben and Robin Hahn',        total: 66340,    date: '2025-12-15' },
  { client: 'Kate Malani',               total: 55000,    date: '2025-12-15' },
]

// ── Real appointments run per month (month index 0–11) ──────────────────────
export const HISTORICAL_APPTS = [
  { year: 2024, month: 0,  appts: 31 }, { year: 2024, month: 1,  appts: 49 },
  { year: 2024, month: 2,  appts: 51 }, { year: 2024, month: 3,  appts: 48 },
  { year: 2024, month: 4,  appts: 53 }, { year: 2024, month: 5,  appts: 50 },
  { year: 2024, month: 6,  appts: 52 }, { year: 2024, month: 7,  appts: 43 },
  { year: 2024, month: 8,  appts: 40 }, { year: 2024, month: 9,  appts: 24 },
  { year: 2024, month: 10, appts: 37 }, { year: 2024, month: 11, appts: 10 },
  { year: 2025, month: 0,  appts: 10 }, { year: 2025, month: 1,  appts: 18 },
  { year: 2025, month: 2,  appts: 38 }, { year: 2025, month: 3,  appts: 50 },
  { year: 2025, month: 4,  appts: 39 }, { year: 2025, month: 5,  appts: 45 },
  { year: 2025, month: 6,  appts: 21 }, { year: 2025, month: 7,  appts: 19 },
  { year: 2025, month: 8,  appts: 14 }, { year: 2025, month: 9,  appts: 17 },
  { year: 2025, month: 10, appts: 14 }, { year: 2025, month: 11, appts: 10 },
]
