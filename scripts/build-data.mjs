#!/usr/bin/env node
// Collecte l'open data parlementaire et produit public/data/{an,senat,pe}.json.
// Usage : node scripts/build-data.mjs [an] [senat] [pe]   (toutes par défaut)
// Variable RAW_DIR : dossier de cache des fichiers bruts (défaut .raw).
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import readline from "node:readline";
import { execFileSync } from "node:child_process";
import { TOPICS, classifyFr, classifyEp } from "./topics.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const OUT = path.join(ROOT, "public", "data");
const RAW = path.resolve(process.env.RAW_DIR || path.join(ROOT, ".raw"));
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(RAW, { recursive: true });

const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const UA = { "User-Agent": "Deputy-Monitoring (open data; github.com/aminecharfeddine/Deputy-Monitoring)" };

async function fetchRetry(url, { tries = 4, asText = false, asJson = false } = {}) {
  let err;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { headers: UA, redirect: "follow" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`HTTP ${res.status} ${url}`);
      if (asJson) return await res.json();
      if (asText) return await res.text();
      return Buffer.from(await res.arrayBuffer());
    } catch (e) {
      err = e;
      await sleep(1500 * (i + 1));
    }
  }
  throw err;
}

async function download(url, file, { maxAgeH = 12 } = {}) {
  const p = path.join(RAW, file);
  if (fs.existsSync(p) && Date.now() - fs.statSync(p).mtimeMs < maxAgeH * 3600e3) return p;
  log("download", url);
  const buf = await fetchRetry(url);
  if (!buf) throw new Error(`404 ${url}`);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, buf);
  return p;
}

function unzipTo(zip, dir) {
  const d = path.join(RAW, dir);
  fs.rmSync(d, { recursive: true, force: true });
  fs.mkdirSync(d, { recursive: true });
  execFileSync("unzip", ["-q", "-o", zip, "-d", d]);
  return d;
}

const walk = (dir) =>
  fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]
  );

const asArray = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
const ucfirst = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const cleanTitle = (s) => ucfirst(s.replace(/\s+/g, " ").trim().replace(/\.$/, ""));

// CSV minimal (guillemets, virgules, retours ligne dans les champs)
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else q = false;
      } else field += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [head, ...body] = rows.filter((r) => r.length > 1 || r[0]);
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i] ?? ""])));
}

const csvGz = (file) => parseCsv(zlib.gunzipSync(fs.readFileSync(file)).toString("utf8"));

// Positions encodées : P pour, C contre, A abstention, N non-votant, - absent ou hors mandat
function groupMajorities(members, votes, positions) {
  return votes.map((_, i) => {
    const out = {};
    const counts = {};
    for (const m of members) {
      const p = positions[m.id][i];
      if (!"PCA".includes(p)) continue;
      (counts[m.group] ||= { P: 0, C: 0, A: 0 })[p]++;
    }
    for (const [g, c] of Object.entries(counts)) {
      const best = Object.entries(c).sort((a, b) => b[1] - a[1])[0];
      if (best[1] > 0) out[g] = best[0];
    }
    return out;
  });
}

function writeChamber(key, data) {
  for (const g of data.groups) g.count = data.members.filter((m) => m.group === g.id).length;
  data.groups = data.groups.filter((g) => g.count > 0).sort((a, b) => a.order - b.order);
  data.topics = TOPICS.filter((t) => data.votes.some((v) => v.topics.includes(t.id)));
  data.generatedAt = new Date().toISOString();
  const file = path.join(OUT, `${key}.json`);
  fs.writeFileSync(file, JSON.stringify(data));
  log(`${key}: ${data.members.length} élus, ${data.votes.length} scrutins, ${(fs.statSync(file).size / 1024).toFixed(0)} Ko`);
}

/* ------------------------------------------------------------------ */
/* Assemblée nationale                                                 */
/* ------------------------------------------------------------------ */
const AN_ORDER = ["LFI-NFP", "GDR", "ECOS", "SOC", "LIOT", "EPR", "DEM", "HOR", "DR", "UDDPLR", "RN", "NI"];
const AN_SHORT = { UDDPLR: "UDR", "LFI-NFP": "LFI-NFP" };

async function buildAN() {
  const LEG = process.env.AN_LEGISLATURE || "17";
  const base = `https://data.assemblee-nationale.fr/static/openData/repository/${LEG}`;
  const amoZip = await download(`${base}/amo/deputes_actifs_mandats_actifs_organes/AMO10_deputes_actifs_mandats_actifs_organes.json.zip`, `an/amo${LEG}.zip`);
  const scrZip = await download(`${base}/loi/scrutins/Scrutins.json.zip`, `an/scrutins${LEG}.zip`);
  const amo = unzipTo(amoZip, "an/amo");
  const files = walk(amo);

  const organes = {};
  for (const f of files.filter((f) => f.includes(`${path.sep}organe${path.sep}`))) {
    const o = JSON.parse(fs.readFileSync(f, "utf8")).organe;
    organes[o.uid] = o;
  }
  const groups = Object.values(organes)
    .filter((o) => o.codeType === "GP" && o.legislature === LEG && !o.viMoDe?.dateFin)
    .map((o) => {
      const abbr = o.libelleAbrev || o.libelleAbrege;
      const idx = AN_ORDER.indexOf(abbr);
      return { id: o.uid, short: AN_SHORT[abbr] || abbr, name: o.libelle, color: o.couleurAssociee || "#8D949A", order: idx < 0 ? 50 : idx };
    });
  const groupIds = new Set(groups.map((g) => g.id));

  const members = [];
  for (const f of files.filter((f) => f.includes(`${path.sep}acteur${path.sep}`))) {
    const a = JSON.parse(fs.readFileSync(f, "utf8")).acteur;
    const mandats = asArray(a.mandats?.mandat);
    const depute = mandats.find((m) => m.typeOrgane === "ASSEMBLEE" && m.legislature === LEG && !m.dateFin);
    if (!depute) continue;
    const gp = mandats.find((m) => m.typeOrgane === "GP" && !m.dateFin && groupIds.has(m.organes?.organeRef));
    const comper = mandats.find((m) => m.typeOrgane === "COMPER" && !m.dateFin);
    const lieu = depute.election?.lieu || {};
    const uid = a.uid["#text"] || a.uid;
    const id = a.etatCivil.ident;
    const adresses = asArray(a.adresses?.adresse);
    const twitter = adresses.find((x) => x.typeLibelle === "Twitter")?.valElec;
    const n = Number(lieu.numCirco);
    members.push({
      id: uid,
      name: `${id.prenom} ${id.nom}`,
      sort: id.alpha || id.nom,
      civ: id.civ,
      group: gp?.organes?.organeRef || groups.find((g) => g.short === "NI")?.id || "NI",
      area: lieu.departement ? `${lieu.departement} (${lieu.numDepartement}) · ${n === 1 ? "1re" : `${n}e`} circonscription` : "",
      region: lieu.region || "",
      commission: comper ? organes[comper.organes?.organeRef]?.libelle || "" : "",
      seat: Number(depute.mandature?.placeHemicycle) || null,
      since: depute.dateDebut,
      profession: a.profession?.libelleCourant || "",
      photo: `https://www.assemblee-nationale.fr/dyn/static/tribun/${LEG}/photos/carre/${uid.replace("PA", "")}.jpg`,
      url: `https://www.assemblee-nationale.fr/dyn/deputes/${uid}`,
      links: [
        a.uri_hatvp && { label: "Déclarations HATVP", url: a.uri_hatvp },
        twitter && { label: `X ${twitter.startsWith("@") ? twitter : "@" + twitter}`, url: `https://x.com/${twitter.replace(/^@/, "")}` },
      ].filter(Boolean),
    });
  }

  // Scrutins : votes sur l'ensemble des textes, articles uniques, résolutions, motions de censure, déclarations
  const scrDir = unzipTo(scrZip, "an/scrutins");
  const KEY = /^(l'ensemble|l’ensemble|l'article unique|l’article unique|la proposition de résolution|la motion de censure|la déclaration)/i;
  const votes = [];
  const raw = [];
  for (const f of walk(scrDir).filter((f) => f.endsWith(".json"))) {
    const s = JSON.parse(fs.readFileSync(f, "utf8")).scrutin;
    const isCensure = s.typeVote?.codeTypeVote === "MOC";
    if (!isCensure && !KEY.test(s.titre)) continue;
    // On écarte les « l'ensemble de la deuxième partie » etc. (votes partiels de loi de finances)
    if (/^l.ensemble de la (premi|deuxi|troisi)/i.test(s.titre)) continue;
    raw.push(s);
  }
  raw.sort((a, b) => b.dateScrutin.localeCompare(a.dateScrutin) || Number(b.numero) - Number(a.numero));
  const posMaps = [];
  const groupPos = [];
  for (const s of raw) {
    const map = {};
    const gpos = {};
    const kind = s.typeVote?.codeTypeVote === "MOC" ? "censure" : "texte";
    for (const g of asArray(s.ventilationVotes?.organe?.groupes?.groupe)) {
      const pm = g.vote?.positionMajoritaire;
      if (pm) gpos[g.organeRef] = { pour: "P", contre: "C", abstention: "A" }[pm] || "N";
      const dn = g.vote?.decompteNominatif || {};
      for (const [k, code] of [["pours", "P"], ["contres", "C"], ["abstentions", "A"], ["nonVotants", "N"]]) {
        for (const v of asArray(dn[k]?.votant)) map[v.acteurRef] = code;
      }
    }
    const d = s.syntheseVote?.decompte || {};
    const title = cleanTitle(s.titre);
    votes.push({
      id: s.uid,
      num: Number(s.numero),
      date: s.dateScrutin,
      title,
      kind,
      result: /adopt/i.test(s.sort?.code || "") ? "adopté" : "rejeté",
      counts: { P: Number(d.pour) || 0, C: Number(d.contre) || 0, A: Number(d.abstentions) || 0 },
      url: `https://www.assemblee-nationale.fr/dyn/${LEG}/scrutins/${s.numero}`,
      topics: kind === "censure" ? ["gouvernement"] : classifyFr(title),
    });
    posMaps.push(map);
    groupPos.push(gpos);
  }
  const positions = {};
  for (const m of members) positions[m.id] = posMaps.map((pm) => pm[m.id] || "-").join("");

  writeChamber("an", {
    chamber: "an",
    label: "Assemblée nationale",
    memberLabel: "député",
    legislature: `${LEG}e législature`,
    groups,
    members: members.sort((a, b) => a.sort.localeCompare(b.sort, "fr")),
    votes,
    positions,
    groupPositions: groupPos,
    sources: [
      { label: "Open data de l'Assemblée nationale — députés en exercice (AMO10)", url: "https://data.assemblee-nationale.fr/acteurs/deputes-en-exercice", licence: "Licence Ouverte / Open Licence" },
      { label: "Open data de l'Assemblée nationale — scrutins", url: "https://data.assemblee-nationale.fr/travaux-parlementaires/votes", licence: "Licence Ouverte / Open Licence" },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Sénat                                                               */
/* ------------------------------------------------------------------ */
const SENAT_GROUPS = {
  "CRCE-K": { name: "Communiste, républicain, citoyen et écologiste – Kanaky", color: "#B3172C", order: 0 },
  GEST: { name: "Écologiste – Solidarité et Territoires", color: "#5DAA5A", order: 1 },
  SER: { name: "Socialiste, écologiste et républicain", color: "#E8579A", order: 2 },
  RDSE: { name: "Rassemblement démocratique et social européen", color: "#D9A23B", order: 3 },
  RDPI: { name: "Rassemblement des démocrates, progressistes et indépendants", color: "#F1C24B", order: 4 },
  UCI: { name: "Union centriste et indépendants", color: "#4DB0E0", order: 5 },
  UC: { name: "Union centriste", color: "#4DB0E0", order: 5 },
  "Les Indépendants": { short: "LIRT", name: "Les Indépendants – République et Territoires", color: "#2E86C1", order: 6 },
  "Les Républicains": { short: "LR", name: "Les Républicains", color: "#1F4E9E", order: 7 },
  UNT: { name: "Union nationale pour les territoires", color: "#1B2050", order: 8 },
  NI: { name: "Réunion administrative des sénateurs ne figurant sur la liste d'aucun groupe", color: "#8D949A", order: 9 },
};
const MOIS = { janvier: 1, fevrier: 2, février: 2, mars: 3, avril: 4, mai: 5, juin: 6, juillet: 7, aout: 8, août: 8, septembre: 9, octobre: 10, novembre: 11, decembre: 12, décembre: 12 };
const decodeHtml = (s) =>
  s.replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&deg;/g, "°").replace(/&eacute;/g, "é").replace(/&egrave;/g, "è")
    .replace(/&agrave;/g, "à").replace(/&ecirc;/g, "ê").replace(/&ccedil;/g, "ç").replace(/&ocirc;/g, "ô")
    .replace(/&icirc;/g, "î").replace(/&ucirc;/g, "û").replace(/&rsquo;/g, "’").replace(/&laquo;/g, "«").replace(/&raquo;/g, "»")
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'").replace(/&amp;/g, "&").replace(/&#(\d+);/g, (_, n) => String.fromCharCode(n))
    .replace(/\s+/g, " ").trim();

async function buildSenat() {
  const genFile = await download("https://data.senat.fr/data/senateurs/ODSEN_GENERAL.csv", "senat/ODSEN_GENERAL.csv");
  const comFile = await download("https://data.senat.fr/data/senateurs/ODSEN_CUR_COMS.csv", "senat/ODSEN_CUR_COMS.csv");
  const readLatin = (f) => new TextDecoder("latin1").decode(fs.readFileSync(f)).split("\n").filter((l) => !l.startsWith("%")).join("\n");
  const gen = parseCsv(readLatin(genFile)).filter((r) => r["État"] === "ACTIF");
  const coms = parseCsv(readLatin(comFile));
  const liste = await fetchRetry("https://www.senat.fr/senateurs/senatl.html", { asText: true });
  const slugs = {};
  for (const [, slug, mat] of liste.matchAll(/\/senateur\/([a-z0-9_]+?)(\d{5}[a-z])\.html/g)) slugs[mat.toUpperCase()] = slug + mat;

  const groups = Object.entries(SENAT_GROUPS)
    .filter(([code]) => gen.some((r) => r["Groupe politique"] === code))
    .map(([code, g]) => ({ id: code, short: g.short || code, name: g.name, color: g.color, order: g.order }));
  for (const code of new Set(gen.map((r) => r["Groupe politique"]))) {
    if (!SENAT_GROUPS[code]) groups.push({ id: code, short: code, name: code, color: "#8D949A", order: 40 });
  }

  const members = gen.map((r) => {
    const mat = r["Matricule"];
    const slug = slugs[mat];
    const com = coms.find((c) => c["Matricule"] === mat && c["Type commission"] === "Commission permanente" && !c["Fin d'appartenance"]);
    return {
      id: mat,
      name: `${r["Prénom usuel"]} ${r["Nom usuel"]}`,
      sort: r["Nom usuel"],
      civ: r["Qualité"],
      group: r["Groupe politique"] || "NI",
      area: r["Circonscription"],
      region: "",
      commission: com ? ucfirst(com["Nom commission"]) : r["Commission permanente"] || "",
      seat: null,
      profession: r["Description de la profession"] || "",
      photo: slug ? `https://www.senat.fr/senimg/${slug}_carre.jpg` : null,
      url: slug ? `https://www.senat.fr/senateur/${slug}.html` : "https://www.senat.fr/senateurs/senatl.html",
      links: [],
    };
  });
  const memberIds = new Set(members.map((m) => m.id));

  // Scrutins des sessions depuis octobre 2023 (dernier renouvellement complet de la série précédente)
  const now = new Date();
  const lastSession = now.getMonth() >= 9 ? now.getFullYear() : now.getFullYear() - 1;
  const KEY = /^sur (l'ensemble|l’ensemble|l'article unique|l’article unique|la proposition de résolution|la motion de censure|la déclaration)/i;
  const candidates = [];
  for (let y = Number(process.env.SENAT_FIRST_SESSION || 2023); y <= lastSession; y++) {
    const html = await fetchRetry(`https://www.senat.fr/scrutin-public/scr${y}.html`, { asText: true });
    if (!html) continue;
    let date = null;
    const re = /<div class="list-group-subtitle">([^<]+)<\/div>|<p class="my-2">([\s\S]*?)<\/p>/g;
    for (const m of html.matchAll(re)) {
      if (m[1]) {
        const [d, mo, yr] = decodeHtml(m[1]).split(" ");
        const mm = MOIS[mo?.toLowerCase()];
        date = mm ? `${yr}-${String(mm).padStart(2, "0")}-${String(parseInt(d)).padStart(2, "0")}` : null;
        continue;
      }
      const block = m[2];
      const link = block.match(/href="(\d{4})\/scr\d{4}-(\d+)\.html"/);
      if (!link) continue;
      let text = decodeHtml(block).replace(/^Scrutin N°\s*\d+\s*:\s*/i, "");
      const result = /Adoption|Adopt/i.test(text) ? "adopté" : /Rejet/i.test(text) ? "rejeté" : "";
      text = text.replace(/\s*-?\s*consulter le dossier l[ée]gislatif\.?/i, "").replace(/\s*(Adoption|Rejet|Adopté|Rejeté)\s*$/i, "").trim();
      if (!KEY.test(text)) continue;
      candidates.push({ session: link[1], num: Number(link[2]), date, title: cleanTitle(text.replace(/^sur /i, "")), result });
    }
  }
  log(`senat: ${candidates.length} scrutins clés à récupérer`);
  candidates.sort((a, b) => (b.date || "").localeCompare(a.date || "") || b.num - a.num);

  const votes = [];
  const posMaps = [];
  for (const c of candidates) {
    const base = `https://www.senat.fr/scrutin-public/${c.session}/scr${c.session}-${c.num}`;
    const j = await fetchRetry(`${base}.json`, { asJson: true }).catch(() => null);
    await sleep(120);
    if (!j?.votes) continue;
    const map = {};
    const counts = { P: 0, C: 0, A: 0 };
    for (const v of j.votes) {
      const code = { p: "P", c: "C", a: "A", n: "N" }[v.vote] || "N";
      if (counts[code] !== undefined) counts[code]++;
      if (memberIds.has(v.matricule)) map[v.matricule] = code;
    }
    const kind = /motion de censure/i.test(c.title) ? "censure" : "texte";
    votes.push({
      id: `scr${c.session}-${c.num}`,
      num: c.num,
      date: c.date,
      title: c.title,
      kind,
      result: c.result || (counts.P > counts.C ? "adopté" : "rejeté"),
      counts,
      url: `${base}.html`,
      topics: kind === "censure" ? ["gouvernement"] : classifyFr(c.title),
    });
    posMaps.push(map);
  }
  const positions = {};
  for (const m of members) positions[m.id] = posMaps.map((pm) => pm[m.id] || "-").join("");

  writeChamber("senat", {
    chamber: "senat",
    label: "Sénat",
    memberLabel: "sénateur",
    legislature: "Sénat renouvelé en septembre 2026",
    groups,
    members: members.sort((a, b) => a.sort.localeCompare(b.sort, "fr")),
    votes,
    positions,
    groupPositions: groupMajorities(members, votes, positions),
    sources: [
      { label: "data.senat.fr — base des sénateurs (ODSEN)", url: "https://data.senat.fr/les-senateurs/", licence: "Licence Ouverte / Open Licence" },
      { label: "Sénat — scrutins publics (résultats nominatifs)", url: "https://www.senat.fr/scrutin-public/", licence: "Réutilisation libre avec mention de la source" },
    ],
  });
}

/* ------------------------------------------------------------------ */
/* Parlement européen (HowTheyVote.eu)                                 */
/* ------------------------------------------------------------------ */
const PE_GROUPS = {
  GUE_NGL: { short: "The Left", name: "La Gauche au Parlement européen", color: "#8E1F2F", order: 0 },
  GREEN_EFA: { short: "Verts/ALE", name: "Les Verts / Alliance libre européenne", color: "#57A641", order: 1 },
  SD: { short: "S&D", name: "Alliance progressiste des socialistes et démocrates", color: "#E3363E", order: 2 },
  RENEW: { short: "Renew", name: "Renew Europe", color: "#F2B705", order: 3 },
  EPP: { short: "PPE", name: "Parti populaire européen", color: "#3E8FD8", order: 4 },
  ECR: { short: "ECR", name: "Conservateurs et réformistes européens", color: "#1E5A9C", order: 5 },
  PFE: { short: "PfE", name: "Patriotes pour l'Europe", color: "#2B2366", order: 6 },
  ESN: { short: "ESN", name: "Europe des nations souveraines", color: "#0E2A40", order: 7 },
  NI: { short: "NI", name: "Non-inscrits", color: "#8D949A", order: 8 },
};
const COUNTRY_FR = {
  AUT: "Autriche", BEL: "Belgique", BGR: "Bulgarie", HRV: "Croatie", CYP: "Chypre", CZE: "Tchéquie", DNK: "Danemark", EST: "Estonie",
  FIN: "Finlande", FRA: "France", DEU: "Allemagne", GRC: "Grèce", HUN: "Hongrie", IRL: "Irlande", ITA: "Italie", LVA: "Lettonie",
  LTU: "Lituanie", LUX: "Luxembourg", MLT: "Malte", NLD: "Pays-Bas", POL: "Pologne", PRT: "Portugal", ROU: "Roumanie", SVK: "Slovaquie",
  SVN: "Slovénie", ESP: "Espagne", SWE: "Suède",
};

async function buildPE() {
  const release = await fetchRetry("https://api.github.com/repos/HowTheyVote/data/releases/latest", { asJson: true });
  const asset = (name) => release.assets.find((a) => a.name === name)?.browser_download_url;
  const get = (name) => download(asset(name), `pe/${release.tag_name}/${name}`, { maxAgeH: 1e6 });
  const [membersF, gmF, npF, npmF, votesF, oeilF, mvF] = await Promise.all(
    ["members.csv.gz", "group_memberships.csv.gz", "national_parties.csv.gz", "national_party_memberships.csv.gz", "votes.csv.gz", "oeil_subject_votes.csv.gz", "member_votes.csv.gz"].map(get)
  );

  const TERM_START = "2024-07-16";
  const current = csvGz(gmF).filter((r) => r.term === "10" && !r.end_date);
  const groupOf = Object.fromEntries(current.map((r) => [r.member_id, r.group_code]));
  const parties = Object.fromEntries(csvGz(npF).map((r) => [r.id, r.label]));
  const partyOf = Object.fromEntries(csvGz(npmF).filter((r) => !r.end_date).map((r) => [r.member_id, parties[r.national_party_id]]));

  const members = csvGz(membersF)
    .filter((r) => groupOf[r.id])
    .map((r) => {
      const lastName = r.last_name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, s, c) => s + c.toUpperCase());
      return {
        id: r.id,
        name: `${r.first_name} ${lastName}`,
        sort: lastName,
        civ: "",
        group: groupOf[r.id],
        area: COUNTRY_FR[r.country_code] || r.country_code,
        country: r.country_code,
        region: partyOf[r.id] || "",
        commission: "",
        seat: null,
        profession: "",
        photo: `https://www.europarl.europa.eu/mepphoto/${r.id}.jpg`,
        url: `https://www.europarl.europa.eu/meps/fr/${r.id}`,
        links: [
          { label: "Fiche HowTheyVote", url: `https://howtheyvote.eu/members/${r.id}` },
          r.twitter && { label: "X", url: r.twitter.replace("twitter.com", "x.com") },
        ].filter(Boolean),
      };
    });
  const memberIdx = new Map(members.map((m, i) => [m.id, i]));
  const groups = Object.entries(PE_GROUPS).map(([id, g]) => ({ id, ...g }));
  for (const code of new Set(members.map((m) => m.group))) if (!PE_GROUPS[code]) groups.push({ id: code, short: code, name: code, color: "#8D949A", order: 40 });

  const oeil = {};
  for (const r of csvGz(oeilF)) (oeil[r.vote_id] ||= []).push(r.oeil_subject_code);

  const votes = csvGz(votesF)
    .filter((r) => r.timestamp >= TERM_START && r.is_main === "True")
    .filter((r) => r.procedure_type !== "DEC" && !(r.procedure_type === "BUD" && !/budget/i.test(r.display_title)))
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .map((r) => {
      const ta = r.texts_adopted_reference?.match(/P(\d+)_TA\((\d{4})\)(\d+)/);
      return {
        id: r.id,
        num: Number(r.id),
        date: r.timestamp.slice(0, 10),
        title: r.display_title,
        reference: r.procedure_reference || r.reference || "",
        kind: "texte",
        result: r.result === "ADOPTED" ? "adopté" : r.result === "REJECTED" ? "rejeté" : "",
        counts: { P: Number(r.count_for) || 0, C: Number(r.count_against) || 0, A: Number(r.count_abstention) || 0 },
        url: `https://howtheyvote.eu/votes/${r.id}`,
        officialUrl: ta ? `https://www.europarl.europa.eu/doceo/document/TA-${ta[1]}-${ta[2]}-${ta[3]}_FR.html` : null,
        topics: classifyEp(r.display_title, oeil[r.id]),
      };
    });
  const voteIdx = new Map(votes.map((v, i) => [v.id, i]));

  // member_votes.csv.gz est volumineux : lecture en flux
  const grid = members.map(() => Array(votes.length).fill("-"));
  const rl = readline.createInterface({ input: fs.createReadStream(mvF).pipe(zlib.createGunzip()), crlfDelay: Infinity });
  let header = null;
  for await (const line of rl) {
    const cols = line.split(",");
    if (!header) { header = Object.fromEntries(cols.map((c, i) => [c.trim(), i])); continue; }
    const vi = voteIdx.get(cols[header.vote_id]);
    if (vi === undefined) continue;
    const mi = memberIdx.get(cols[header.member_id]);
    if (mi === undefined) continue;
    grid[mi][vi] = { FOR: "P", AGAINST: "C", ABSTENTION: "A", DID_NOT_VOTE: "N" }[cols[header.position]] || "N";
  }
  const positions = Object.fromEntries(members.map((m, i) => [m.id, grid[i].join("")]));

  writeChamber("pe", {
    chamber: "pe",
    label: "Parlement européen",
    memberLabel: "eurodéputé",
    legislature: "10e législature (2024-2029)",
    groups,
    members: members.sort((a, b) => a.sort.localeCompare(b.sort, "fr")),
    votes,
    positions,
    groupPositions: groupMajorities(members, votes, positions),
    sources: [
      { label: `HowTheyVote.eu — votes par appel nominal (export du ${release.tag_name})`, url: "https://howtheyvote.eu/", licence: "ODbL" },
      { label: "Parlement européen — procès-verbaux des votes par appel nominal", url: "https://www.europarl.europa.eu/plenary/fr/votes.html", licence: "Réutilisation autorisée avec mention de la source" },
    ],
  });
}

/* ------------------------------------------------------------------ */
const builders = { an: buildAN, senat: buildSenat, pe: buildPE };
const wanted = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(builders);
let failed = 0;
for (const k of wanted) {
  try {
    log(`--- ${k}`);
    await builders[k]();
  } catch (e) {
    failed++;
    console.error(`ÉCHEC ${k} — le fichier précédent est conservé :`, e);
  }
}
const index = {};
for (const k of Object.keys(builders)) {
  const f = path.join(OUT, `${k}.json`);
  if (!fs.existsSync(f)) continue;
  const d = JSON.parse(fs.readFileSync(f, "utf8"));
  index[k] = { label: d.label, members: d.members.length, votes: d.votes.length, generatedAt: d.generatedAt, lastVote: d.votes[0]?.date };
}
fs.writeFileSync(path.join(OUT, "index.json"), JSON.stringify(index, null, 2));
process.exit(failed === wanted.length ? 1 : 0);
