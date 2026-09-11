/* Shared route math — used by both the app and the printable directions.
   Pure functions over ROUTE / MILESTONES from data.js. */

const GEO = (function () {
  const REF_LAT = 35.5;
  const KX = Math.cos(REF_LAT * Math.PI / 180) * 69.172; // miles per degree lng
  const KY = 69.0;                                        // miles per degree lat
  const toXY = (lat, lng) => ({ x: lng * KX, y: lat * KY });
  const d2 = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

  // Waypoints are sparse, so straight lines between them cut the road's curves.
  // This factor scales the geometry up to approximate real driving miles.
  const ROAD_FACTOR = 1.10;
  const XY = ROUTE.map(p => toXY(p.lat, p.lng));
  const SEG = [];
  const CUM = [0];
  for (let i = 0; i < XY.length - 1; i++) {
    const s = d2(XY[i], XY[i + 1]) * ROAD_FACTOR;
    SEG.push(s);
    CUM.push(CUM[i] + s);
  }
  const TOTAL = CUM[CUM.length - 1];

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

  // Nearest named place (route town or milestone) to a point.
  function nearestPlace(lat, lng) {
    const cands = ROUTE.concat(MILESTONES);
    let best = null, bd = Infinity;
    const p = toXY(lat, lng);
    cands.forEach(c => {
      const dd = d2(p, toXY(c.lat, c.lng));
      if (dd < bd) { bd = dd; best = c; }
    });
    return { name: best ? best.name.replace(/ \(home\)/, "") : "the route", miles: bd };
  }

  // Milestones with their mileposts, west -> east.
  const milestones = MILESTONES
    .map(m => ({ ...m, along: project(m.lat, m.lng).along }))
    .sort((a, b) => a.along - b.along);

  // Suggested refuel points every `interval` miles, snapped to the nearest town.
  function fuelStops(interval) {
    const stops = [];
    for (let mi = interval; mi < TOTAL - 40; mi += interval) {
      // nearest route waypoint by milepost
      let idx = 0, bd = Infinity;
      CUM.forEach((c, i) => { const dd = Math.abs(c - mi); if (dd < bd) { bd = dd; idx = i; } });
      const town = ROUTE[idx].name.replace(/ \(home\)/, "");
      if (!stops.some(s => s.town === town)) stops.push({ mile: Math.round(CUM[idx]), town });
    }
    return stops;
  }

  // MapQuest-style leg list between consecutive towns, with stops noted per leg.
  function legs() {
    const joinIdx = ROUTE.findIndex(p => p.name === I40_JOIN);
    const out = [];
    for (let i = 0; i < ROUTE.length - 1; i++) {
      const road = i < joinIdx ? "I-15 N" : "I-40 E";
      const near = milestones.filter(m => m.along > CUM[i] + 2 && m.along <= CUM[i + 1] + 2)
        .map(m => m.name);
      out.push({
        road,
        from: ROUTE[i].name.replace(/ \(home\)/, ""),
        to: ROUTE[i + 1].name.replace(/ \(home\)/, ""),
        seg: Math.round(SEG[i]),
        cum: Math.round(CUM[i + 1]),
        stops: near
      });
    }
    return out;
  }

  const drivingHours = () => TOTAL / 58; // ~58 mph effective with stops
  const fmtMi = n => Math.round(n).toLocaleString() + " mi";

  return { ROUTE, TOTAL, CUM, project, nearestPlace, milestones, fuelStops, legs, drivingHours, fmtMi };
})();
