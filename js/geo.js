/* Shared route engine. The active route is no longer fixed — call GEO.build()
   with a polyline (the base I-40 corridor, or a route he built through his own
   detours) and everything (progress, fuel, stops, directions) recomputes.
   Used by both the app and the printable directions. */

const GEO = (function () {
  const REF_LAT = 35.5;
  const KX = Math.cos(REF_LAT * Math.PI / 180) * 69.172;
  const KY = 69.0;
  const toXY = (lat, lng) => ({ x: lng * KX, y: lat * KY });
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const fmtMi = n => Math.round(n).toLocaleString() + " mi";

  let PTS = [], XY = [], SEG = [], CUM = [0], TOTAL = 0, DUR = null;
  let STEPS = null, NAMED = null, LEGS = null, MILE = [];

  function build(latlngs, opts) {
    opts = opts || {};
    PTS = latlngs.map(p => ({ lat: p[0], lng: p[1] }));
    XY = PTS.map(p => toXY(p.lat, p.lng));
    const factor = opts.factor != null ? opts.factor : 1.0;
    SEG = []; CUM = [0];
    for (let i = 0; i < XY.length - 1; i++) {
      const s = d2(XY[i], XY[i + 1]) * factor;
      SEG.push(s); CUM.push(CUM[i] + s);
    }
    // If a real driving distance is known (from the router), scale the
    // geometry mileposts to match it so every number agrees.
    if (opts.distanceMi != null && CUM[CUM.length - 1] > 0) {
      const k = opts.distanceMi / CUM[CUM.length - 1];
      SEG = SEG.map(s => s * k); CUM = CUM.map(c => c * k);
    }
    TOTAL = CUM[CUM.length - 1];
    DUR = opts.durationHr != null ? opts.durationHr : null;
    STEPS = opts.steps || null;
    NAMED = opts.named || null;
    LEGS = opts.legs || null;

    const thr = opts.landmarkThresholdMi || 75;
    MILE = MILESTONES.map(m => { const pr = project(m.lat, m.lng); return Object.assign({}, m, { along: pr.along, off: pr.off }); })
      .filter(m => m.off <= thr)
      .sort((a, b) => a.along - b.along);
  }

  function project(lat, lng) {
    const p = toXY(lat, lng);
    let best = { off: Infinity, along: 0 };
    for (let i = 0; i < XY.length - 1; i++) {
      const a = XY[i], b = XY[i + 1];
      const abx = b.x - a.x, aby = b.y - a.y;
      const len2 = abx * abx + aby * aby || 1e-9;
      let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
      t = Math.max(0, Math.min(1, t));
      const off = Math.hypot(p.x - (a.x + t * abx), p.y - (a.y + t * aby));
      if (off < best.off) best = { off, along: CUM[i] + t * SEG[i] };
    }
    return best;
  }

  // Point (lat/lng) at a given milepost along the route.
  function pointAt(mile) {
    for (let i = 0; i < CUM.length - 1; i++) {
      if (mile <= CUM[i + 1]) {
        const t = SEG[i] > 0 ? (mile - CUM[i]) / SEG[i] : 0;
        return { lat: PTS[i].lat + t * (PTS[i + 1].lat - PTS[i].lat),
                 lng: PTS[i].lng + t * (PTS[i + 1].lng - PTS[i].lng) };
      }
    }
    return PTS[PTS.length - 1];
  }

  // Town-naming pool: the big city dataset PLUS the actual route-corridor towns
  // and detour cities, so a sampled point names a town that's on the road rather
  // than a bigger city far off to the side.
  const POOL = TOWNS.map(t => ({ name: t.n + ", " + t.s, lat: t.lat, lng: t.lng }));
  if (typeof ROUTE !== "undefined") ROUTE.forEach(p => {
    const nm = p.name.replace(/ \(home\)/, "");
    if (/,/.test(nm)) POOL.push({ name: nm, lat: p.lat, lng: p.lng });
  });
  if (typeof DETOURS !== "undefined") DETOURS.forEach(d => POOL.push({ name: d.name, lat: d.lat, lng: d.lng }));

  function nearestTown(lat, lng) {
    const p = toXY(lat, lng);
    let best = null, bd = Infinity;
    for (const t of POOL) {
      const dd = d2(p, toXY(t.lat, t.lng));
      if (dd < bd) { bd = dd; best = t; }
    }
    return best ? { name: best.name, lat: best.lat, lng: best.lng, off: bd } : null;
  }

  function nearestPlace(lat, lng) {
    const t = nearestTown(lat, lng);
    return t ? { name: t.name } : { name: "the route" };
  }

  // Stops every `interval` miles, named by nearest town, de-duplicated.
  function sampleStops(interval) {
    const out = [];
    for (let mi = interval; mi < TOTAL - 25; mi += interval) {
      const pt = pointAt(mi);
      const t = nearestTown(pt.lat, pt.lng);
      if (!t) continue;
      if (!out.some(s => s.town === t.name)) out.push({ mile: Math.round(mi), town: t.name, lat: t.lat, lng: t.lng });
    }
    return out;
  }
  const fuelStops = interval => sampleStops(Math.max(120, interval || 300));
  const overnightStops = interval => sampleStops(Math.max(200, interval || 450));

  // Highway-level directions. Uses router steps when available (collapsed by
  // road so it reads like a printed direction sheet); otherwise named waypoints.
  function directions() {
    if (LEGS && LEGS.length) return LEGS;
    if (STEPS && STEPS.length) {
      const legs = [];
      let cur = null, cum = 0;
      STEPS.forEach(st => {
        const road = st.name || st.ref || "";
        const miles = (st.distance || 0) * 0.000621371;
        cum += miles;
        if (cur && road && road === cur.road) { cur.seg += miles; cur.cum = cum; }
        else if (road) { cur = { road, seg: miles, cum }; legs.push(cur); }
        else if (cur) { cur.seg += miles; cur.cum = cum; }
      });
      return legs.filter(l => l.seg >= 1).map(l => ({ road: l.road, to: null, seg: Math.round(l.seg), cum: Math.round(l.cum), stops: [] }));
    }
    // fallback: consecutive named waypoints
    const names = NAMED || PTS.map((p, i) => ({ name: "Point " + (i + 1), lat: p.lat, lng: p.lng }));
    const joinIdx = names.findIndex(p => p.name === (typeof I40_JOIN !== "undefined" ? I40_JOIN : ""));
    const out = [];
    for (let i = 0; i < names.length - 1; i++) {
      const road = (joinIdx >= 0 && i < joinIdx) ? "I-15 N" : "I-40 E";
      const near = MILE.filter(m => m.along > CUM[i] + 2 && m.along <= CUM[i + 1] + 2).map(m => m.name);
      out.push({ road, to: names[i + 1].name.replace(/ \(home\)/, ""), seg: Math.round(SEG[i]), cum: Math.round(CUM[i + 1]), stops: near });
    }
    return out;
  }

  const drivingHours = () => DUR != null ? DUR : TOTAL / 58;

  return {
    build, project, pointAt, nearestTown, nearestPlace,
    fuelStops, overnightStops, directions, drivingHours, fmtMi,
    get TOTAL() { return TOTAL; },
    get milestones() { return MILE; },
    points() { return PTS.map(p => [p.lat, p.lng]); }
  };
})();
