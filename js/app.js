/* I-40 trip companion — app wiring.
   Screens: Plan, Map, Stops, Gas, Budget, Journal.
   The route is built once (on WiFi) via a routing service, then saved and used
   fully offline. GEO recomputes everything from whatever route is active. */

const $  = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const money = n => "$" + Math.round(Number(n) || 0).toLocaleString();

/* ---------- text size + print ---------- */
if (localStorage.getItem("i40_big") === "1") document.documentElement.classList.add("big");
$("#textToggle").addEventListener("click", () => {
  const big = document.documentElement.classList.toggle("big");
  localStorage.setItem("i40_big", big ? "1" : "0");
  if (map) map.invalidateSize();
});
$("#printBtn").addEventListener("click", () => window.open("print.html", "_blank"));

/* ---------- navigation ---------- */
function show(screen) {
  $$(".screen").forEach(s => s.classList.remove("on"));
  $("#screen-" + screen).classList.add("on");
  $$(".nav button").forEach(b => b.classList.toggle("on", b.dataset.screen === screen));
  if (screen === "map" && map) setTimeout(() => map.invalidateSize(), 50);
}
$$(".nav button").forEach(b => b.addEventListener("click", () => show(b.dataset.screen)));

/* ---------- active route ---------- */
function loadActiveRoute() {
  const r = STORE.route;
  if (r && r.geometry && r.geometry.length > 1) {
    GEO.build(r.geometry, { factor: r.approx ? 1.10 : 1.0, distanceMi: r.distance,
      durationHr: r.duration, legs: r.legs, named: r.approx ? r.waypoints : null, landmarkThresholdMi: 75 });
  } else {
    GEO.build(ROUTE.map(p => [p.lat, p.lng]), { factor: 1.10, named: ROUTE, landmarkThresholdMi: 75 });
  }
}

/* ---------- map ---------- */
let map = null, meMarker = null, routeLine = null, mapMode = null;
const markerFor = {};
const customLayer = L.layerGroup();
const viaLayer = L.layerGroup();
const milestoneLayer = L.layerGroup();

const pinIcon = kind => L.divIcon({ className: "", html: '<div class="pin ' + kind + '"></div>', iconSize: [22, 22], iconAnchor: [11, 11] });
const milestoneIcon = m => pinIcon(STORE.favs.includes(m.id) ? "pin--fav" : "");

function initMap() {
  map = L.map("map", { zoomControl: false });
  L.control.zoom({ position: "topleft" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);
  milestoneLayer.addTo(map); customLayer.addTo(map); viaLayer.addTo(map);
  drawRoute();
  renderCustomPins(); renderViaPins();

  map.on("click", e => {
    if (!mapMode) return;
    if (mapMode === "pin") {
      const name = prompt("Name this stop (for example, the motel):", "");
      if (name && name.trim()) {
        STORE.custom.push({ id: "c" + Date.now(), name: name.trim(), lat: e.latlng.lat, lng: e.latlng.lng });
        STORE.save(); renderCustomPins(); renderStops();
      }
    } else if (mapMode === "via") {
      const name = prompt("Name this place to pass through:", "");
      if (name && name.trim()) {
        STORE.vias.push({ id: "v" + Date.now(), name: name.trim(), lat: e.latlng.lat, lng: e.latlng.lng, custom: true });
        STORE.save(); renderPlan(); renderViaPins(); show("plan");
      }
    }
    mapMode = null; $("#addStop").classList.remove("on"); $("#addVia").classList.remove("on"); $("#hint").classList.remove("on");
  });
}
function drawRoute() {
  if (routeLine) map.removeLayer(routeLine);
  routeLine = L.polyline(GEO.points(), { color: "#1E7A46", weight: 5, opacity: .9, lineJoin: "round" }).addTo(map);
  renderMilestoneMarkers();
  try { map.fitBounds(routeLine.getBounds(), { padding: [28, 28] }); } catch (e) {}
}
function renderMilestoneMarkers() {
  milestoneLayer.clearLayers();
  for (const k in markerFor) delete markerFor[k];
  GEO.milestones.forEach(m => {
    markerFor[m.id] = L.marker([m.lat, m.lng], { icon: milestoneIcon(m) })
      .addTo(milestoneLayer).bindPopup("<strong>" + m.name + "</strong><br>" + m.blurb);
  });
}
function renderCustomPins() {
  customLayer.clearLayers();
  STORE.custom.forEach(c => L.marker([c.lat, c.lng], { icon: pinIcon("pin--custom") })
    .addTo(customLayer).bindPopup("<strong>" + c.name + "</strong><br>your pinned stop"));
}
function renderViaPins() {
  viaLayer.clearLayers();
  STORE.vias.forEach(v => L.marker([v.lat, v.lng], { icon: pinIcon("pin--via") })
    .addTo(viaLayer).bindPopup("<strong>" + v.name + "</strong><br>detour"));
}
function flyTo(lat, lng) { show("map"); map.setView([lat, lng], 11, { animate: true }); }

/* status + progress */
function setProgress(along, label) {
  const pct = Math.max(0, Math.min(100, GEO.TOTAL ? along / GEO.TOTAL * 100 : 0));
  $("#progFill").style.width = pct + "%";
  $("#progCar").style.left = pct + "%";
  $("#progLabel").textContent = label || (GEO.fmtMi(along) + " of " + GEO.fmtMi(GEO.TOTAL));
}
function updateStatus(lat, lng) {
  const along = GEO.project(lat, lng).along;
  setProgress(along);
  const next = GEO.milestones.find(m => m.along > along + 1);
  if (next) {
    $("#statusKicker").textContent = "Next stop";
    $("#nextName").textContent = next.name;
    $("#nextDist").textContent = GEO.fmtMi(next.along - along) + " ahead";
  } else {
    $("#statusKicker").textContent = "Almost there";
    $("#nextName").textContent = "Wilmington - you made it";
    $("#nextDist").textContent = "End of the road";
  }
}
let watchId = null;
function startTracking() {
  show("map");
  if (!navigator.geolocation) {
    $("#statusKicker").textContent = "Location is off";
    $("#nextName").textContent = "This device can't share location";
    $("#nextDist").textContent = ""; return;
  }
  $("#statusCard").classList.remove("idle");
  $("#locate").classList.add("on");
  $("#statusKicker").textContent = "Starting";
  $("#nextName").textContent = "Finding your spot\u2026";
  $("#nextDist").textContent = "";
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(pos => {
    const lat = pos.coords.latitude, lng = pos.coords.longitude;
    if (!meMarker) meMarker = L.marker([lat, lng],
      { icon: L.divIcon({ className: "", html: '<div class="me"></div>', iconSize: [26, 26], iconAnchor: [13, 13] }), zIndexOffset: 1000 }).addTo(map);
    else meMarker.setLatLng([lat, lng]);
    map.setView([lat, lng], Math.max(map.getZoom(), 9));
    updateStatus(lat, lng);
  }, () => {
    $("#locate").classList.remove("on");
    $("#statusCard").classList.add("idle");
    $("#statusKicker").textContent = "Location is off";
    $("#nextName").textContent = "Turn on location";
    $("#nextDist").textContent = "Then press Start again";
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
}
$("#locate").addEventListener("click", startTracking);
$("#startBtn").addEventListener("click", startTracking);

/* ---------- generic row ---------- */
function row(o) {
  const r = document.createElement("div"); r.className = "row";
  r.innerHTML = '<button class="row__go"><span class="row__name">' + o.name +
    '</span><span class="row__meta">' + o.meta + '</span></button>' +
    '<button class="row__act" aria-label="' + o.actLabel + '">' + o.actIcon + '</button>';
  r.querySelector(".row__go").onclick = o.onGo;
  r.querySelector(".row__act").onclick = o.onAct;
  return r;
}

/* ---------- Stops ---------- */
function toggleFav(id) {
  const i = STORE.favs.indexOf(id);
  if (i >= 0) STORE.favs.splice(i, 1); else STORE.favs.push(id);
  STORE.save();
  const m = MILESTONES.find(x => x.id === id);
  if (markerFor[id]) markerFor[id].setIcon(milestoneIcon(m));
  renderStops(); renderPlanResults();
}
function renderStops() {
  const wrap = $("#list-stops"); wrap.innerHTML = "";
  GEO.milestones.forEach(m => {
    const fav = STORE.favs.includes(m.id);
    wrap.appendChild(row({
      name: (fav ? "\u2605 " : "") + m.name,
      meta: "Mile " + Math.round(m.along).toLocaleString() + " \u00b7 " + m.blurb,
      actIcon: fav ? "\u2605" : "\u2606", actLabel: fav ? "Remove favorite" : "Add favorite",
      onGo: () => flyTo(m.lat, m.lng), onAct: () => toggleFav(m.id)
    }));
  });
  STORE.custom.forEach(c => wrap.appendChild(row({
    name: "\uD83D\uDCCD " + c.name, meta: "Your pinned stop",
    actIcon: "\u2715", actLabel: "Delete pin",
    onGo: () => flyTo(c.lat, c.lng),
    onAct: () => { STORE.custom = STORE.custom.filter(x => x.id !== c.id); STORE.save(); renderCustomPins(); renderStops(); }
  })));
}
$("#addStop").addEventListener("click", () => {
  mapMode = mapMode === "pin" ? null : "pin";
  $("#addStop").classList.toggle("on", mapMode === "pin");
  if (mapMode === "pin") { show("map"); $("#hint").textContent = "Tap the map to pin this stop"; $("#hint").classList.add("on"); }
  else $("#hint").classList.remove("on");
});

/* ---------- Plan / route builder ---------- */
function renderPlan() {
  const chips = $("#detour-chips"); chips.innerHTML = "";
  DETOURS.forEach(d => {
    const on = STORE.vias.some(v => v.id === d.id);
    const b = document.createElement("button");
    b.className = "chip" + (on ? " on" : "");
    b.textContent = d.name + (on ? "  \u2713" : "");
    b.onclick = () => {
      const i = STORE.vias.findIndex(v => v.id === d.id);
      if (i >= 0) STORE.vias.splice(i, 1);
      else STORE.vias.push({ id: d.id, name: d.name, lat: d.lat, lng: d.lng });
      STORE.save(); renderPlan(); renderViaPins();
    };
    chips.appendChild(b);
  });

  const vl = $("#via-list"); vl.innerHTML = "";
  const ordered = STORE.vias.slice().sort((a, b) => a.lng - b.lng);
  if (ordered.length) {
    const label = document.createElement("p"); label.className = "lead";
    label.style.margin = "6px 0"; label.innerHTML = "<b>Your path:</b> Upland \u2192 " +
      ordered.map(v => v.name).join(" \u2192 ") + " \u2192 Wilmington";
    vl.appendChild(label);
  }
  renderPlanResults();
}
function renderPlanResults() {
  const box = $("#route-summary"); box.innerHTML = "";
  const r = STORE.route;
  if (r && r.geometry) {
    const gas = GEO.fuelStops(STORE.fuel.refuelEveryMi).length;
    const nights = GEO.overnightStops(450).length;
    box.innerHTML =
      (r.approx ? '<div class="notice">This is a straight-line estimate \u2014 connect to WiFi and build again for real roads.</div>' : '') +
      '<div class="summaryBox">' +
      '<div><div class="k">Distance</div><div class="v">' + GEO.fmtMi(GEO.TOTAL) + '</div></div>' +
      '<div><div class="k">Driving time</div><div class="v">\u2248 ' + Math.round(GEO.drivingHours()) + ' h</div></div>' +
      '<div><div class="k">Gas stops</div><div class="v">' + gas + '</div></div>' +
      '<div><div class="k">Overnights</div><div class="v">~' + nights + '</div></div></div>';
  }

  // landmarks near route
  const near = GEO.milestones;
  $("#lm-head").style.display = (r && near.length) ? "" : "none";
  const lm = $("#lm-list"); lm.innerHTML = "";
  if (r) near.forEach(m => {
    const fav = STORE.favs.includes(m.id);
    lm.appendChild(row({
      name: (fav ? "\u2605 " : "") + m.name, meta: "Mile " + Math.round(m.along).toLocaleString() + " \u00b7 " + m.blurb,
      actIcon: fav ? "\u2605" : "\u2606", actLabel: fav ? "Remove favorite" : "Add favorite",
      onGo: () => flyTo(m.lat, m.lng), onAct: () => toggleFav(m.id)
    }));
  });

  // suggested stops (gas + overnight)
  $("#sug-head").style.display = (r) ? "" : "none";
  const sg = $("#sug-list"); sg.innerHTML = "";
  if (r) {
    const gas = GEO.fuelStops(STORE.fuel.refuelEveryMi);
    const nights = GEO.overnightStops(450);
    const savePin = (name, lat, lng) => {
      if (!STORE.custom.some(c => c.name === name)) {
        STORE.custom.push({ id: "c" + Date.now(), name, lat, lng }); STORE.save(); renderCustomPins(); renderStops(); renderPlanResults();
      }
    };
    nights.forEach(s => sg.appendChild(row({
      name: "\uD83C\uDF19 Overnight near " + s.town, meta: "Around mile " + s.mile.toLocaleString(),
      actIcon: "\uD83D\uDCCD", actLabel: "Pin this stop",
      onGo: () => flyTo(s.lat, s.lng), onAct: () => savePin("Overnight \u2014 " + s.town, s.lat, s.lng)
    })));
    gas.forEach(s => sg.appendChild(row({
      name: "\u26FD Gas near " + s.town, meta: "Around mile " + s.mile.toLocaleString(),
      actIcon: "\uD83D\uDCCD", actLabel: "Pin this stop",
      onGo: () => flyTo(s.lat, s.lng), onAct: () => savePin("Gas \u2014 " + s.town, s.lat, s.lng)
    })));
  }
}
$("#addVia").addEventListener("click", () => {
  mapMode = mapMode === "via" ? null : "via";
  $("#addVia").classList.toggle("on", mapMode === "via");
  if (mapMode === "via") { show("map"); $("#hint").textContent = "Tap the map to add a place to pass through"; $("#hint").classList.add("on"); }
  else $("#hint").classList.remove("on");
});
$("#resetRoute").addEventListener("click", () => {
  STORE.route = null; STORE.vias = []; STORE.save();
  loadActiveRoute(); drawRoute(); renderViaPins();
  setProgress(0, "Home \u00b7 start of the trip");
  renderStops(); renderFuel(); renderPlan();
  $("#build-status").textContent = "Back to the plain I-40 route.";
});
function collapseSteps(osrmRoute) {
  const legs = []; let cur = null, cum = 0;
  osrmRoute.legs.forEach(lg => (lg.steps || []).forEach(st => {
    const road = st.name || (st.ref ? "(" + st.ref + ")" : "");
    const miles = (st.distance || 0) * 0.000621371; cum += miles;
    if (cur && road && road === cur.road) { cur.seg += miles; cur.cum = cum; }
    else if (road) { cur = { road, seg: miles, cum }; legs.push(cur); }
    else if (cur) { cur.seg += miles; cur.cum = cum; }
  }));
  return legs.filter(l => l.seg >= 1).map(l => ({ road: l.road, to: null, seg: Math.round(l.seg), cum: Math.round(l.cum), stops: [] }));
}
async function buildRoute() {
  const ordered = STORE.vias.slice().sort((a, b) => a.lng - b.lng);
  const pts = [BASE, ...ordered, DESTINATION];
  const coords = pts.map(p => p.lng + "," + p.lat).join(";");
  const url = "https://router.project-osrm.org/route/v1/driving/" + coords +
    "?overview=simplified&geometries=geojson&steps=true";
  $("#build-status").textContent = "Building your route\u2026 (needs internet)";
  $("#buildRoute").classList.add("building");
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timer);
    const data = await res.json();
    if (data.code !== "Ok" || !data.routes || !data.routes.length) throw new Error("no route");
    const rt = data.routes[0];
    STORE.route = {
      geometry: rt.geometry.coordinates.map(c => [c[1], c[0]]),
      distance: rt.distance * 0.000621371,
      duration: rt.duration / 3600,
      legs: collapseSteps(rt),
      waypoints: pts.map(p => ({ name: p.name.replace(/^Home.*/, "Upland, CA"), lat: p.lat, lng: p.lng })),
      approx: false, builtAt: Date.now()
    };
    STORE.save(); loadActiveRoute(); drawRoute();
    setProgress(0, "Home \u00b7 start of the trip");
    renderStops(); renderFuel(); renderPlan();
    $("#build-status").textContent = "Route built and saved. It'll work offline from here on.";
  } catch (err) {
    // offline fallback: straight lines through the chosen points
    STORE.route = {
      geometry: pts.map(p => [p.lat, p.lng]),
      distance: null, duration: null, legs: null,
      waypoints: pts.map(p => ({ name: p.name.replace(/^Home.*/, "Upland, CA"), lat: p.lat, lng: p.lng })),
      approx: true, builtAt: Date.now()
    };
    STORE.save(); loadActiveRoute(); drawRoute();
    setProgress(0, "Home \u00b7 start of the trip");
    renderStops(); renderFuel(); renderPlan();
    $("#build-status").textContent = "Couldn't reach the router (no internet?). Showing a straight-line estimate \u2014 connect to WiFi and build again for real roads.";
  }
  $("#buildRoute").classList.remove("building");
}
$("#buildRoute").addEventListener("click", buildRoute);

/* ---------- Fuel ---------- */
function renderFuel() {
  const f = STORE.fuel;
  $("#f-mpg").value = f.mpgHwy; $("#f-tank").value = f.tankGal;
  $("#f-price").value = f.gasPrice; $("#f-int").value = f.refuelEveryMi;
  const gal = GEO.TOTAL / (f.mpgHwy || 30);
  const days = Math.ceil(GEO.TOTAL / 450);
  $("#f-dist").textContent = GEO.fmtMi(GEO.TOTAL);
  $("#f-time").textContent = "\u2248 " + Math.round(GEO.drivingHours()) + " h";
  $("#f-gal").textContent = Math.round(gal) + " gal";
  $("#f-cost").textContent = money(gal * (f.gasPrice || 0));
  const stops = GEO.fuelStops(f.refuelEveryMi);
  $("#f-count").innerHTML = "About <b>" + stops.length + "</b> fill-ups if you refuel every " +
    f.refuelEveryMi + " miles \u2014 roughly " + days + " days at 450 mi/day.";
  const wrap = $("#list-fuel"); wrap.innerHTML = "";
  stops.forEach((s, i) => wrap.appendChild(row({
    name: "Fill-up " + (i + 1) + ": " + s.town, meta: "Around mile " + s.mile.toLocaleString(),
    actIcon: "\u26FD", actLabel: "Fuel stop",
    onGo: () => flyTo(s.lat, s.lng), onAct: () => {}
  })));
}
["f-mpg", "f-tank", "f-price", "f-int"].forEach(id => {
  $("#" + id).addEventListener("change", () => {
    STORE.fuel.mpgHwy = parseFloat($("#f-mpg").value) || 30;
    STORE.fuel.tankGal = parseFloat($("#f-tank").value) || 14.9;
    STORE.fuel.gasPrice = parseFloat($("#f-price").value) || 0;
    STORE.fuel.refuelEveryMi = parseInt($("#f-int").value) || 300;
    STORE.save(); renderFuel(); renderPlanResults();
  });
});
$("#f-tobudget").addEventListener("click", () => {
  const gal = GEO.TOTAL / (STORE.fuel.mpgHwy || 30);
  STORE.budget.Gas = Math.round(gal * (STORE.fuel.gasPrice || 0));
  STORE.save(); renderBudget(); show("budget");
});

/* ---------- Budget ---------- */
function renderBudget() {
  const spent = STORE.spentByCat();
  $("#b-plan").textContent = money(STORE.totalBudget());
  $("#b-spent").textContent = money(STORE.totalSpent());
  const left = STORE.totalBudget() - STORE.totalSpent();
  $("#b-left").textContent = money(left);
  $("#b-left").style.color = left < 0 ? "var(--red)" : "var(--green-lite)";

  const pf = $("#b-plan-fields"); pf.innerHTML = "";
  CATEGORIES.forEach(c => {
    const f = document.createElement("div"); f.className = "field";
    f.innerHTML = '<label>' + c + '</label><input type="number" inputmode="decimal" value="' + (STORE.budget[c] || 0) + '">';
    f.querySelector("input").addEventListener("change", e => { STORE.budget[c] = parseFloat(e.target.value) || 0; STORE.save(); renderBudget(); });
    pf.appendChild(f);
  });
  const sel = $("#e-cat");
  if (!sel.options.length) CATEGORIES.forEach(c => sel.add(new Option(c, c)));

  const bars = $("#b-bars"); bars.innerHTML = "";
  CATEGORIES.forEach(c => {
    const plan = Number(STORE.budget[c] || 0), sp = Number(spent[c] || 0);
    const pct = plan > 0 ? Math.min(100, sp / plan * 100) : (sp > 0 ? 100 : 0);
    const cls = plan > 0 && sp > plan ? "over" : (plan > 0 && sp > plan * .85 ? "warn" : "");
    const d = document.createElement("div"); d.className = "budRow";
    d.innerHTML = '<div class="top"><span>' + c + '</span><span class="amt">' + money(sp) + ' of ' + money(plan) +
      '</span></div><div class="bar ' + cls + '"><span style="width:' + pct + '%"></span></div>';
    bars.appendChild(d);
  });

  const list = $("#b-list"); list.innerHTML = "";
  if (!STORE.expenses.length) list.innerHTML = '<p class="empty">No expenses logged yet.</p>';
  STORE.expenses.slice().reverse().forEach(e => {
    const d = document.createElement("div"); d.className = "row";
    const when = new Date(e.ts).toLocaleDateString([], { month: "short", day: "numeric" });
    d.innerHTML = '<button class="row__go"><span class="row__name">' + money(e.amount) + ' \u00b7 ' + e.cat +
      '</span><span class="row__meta">' + when + (e.note ? " \u00b7 " + e.note : "") + '</span></button>' +
      '<button class="row__act" aria-label="Delete">\u2715</button>';
    d.querySelector(".row__act").onclick = () => { STORE.expenses = STORE.expenses.filter(x => x.id !== e.id); STORE.save(); renderBudget(); };
    list.appendChild(d);
  });
}
$("#e-add").addEventListener("click", () => {
  const amt = parseFloat($("#e-amt").value);
  if (!amt || amt <= 0) { $("#e-amt").focus(); return; }
  STORE.expenses.push({ id: "e" + Date.now(), cat: $("#e-cat").value, amount: amt, note: $("#e-note").value.trim(), ts: Date.now() });
  STORE.save(); $("#e-amt").value = ""; $("#e-note").value = ""; renderBudget();
});

/* ---------- Journal ---------- */
function renderJournal() {
  const list = $("#j-list"); list.innerHTML = "";
  if (!STORE.journal.length) { list.innerHTML = '<p class="empty">No entries yet. Your first note will show up here.</p>'; return; }
  STORE.journal.slice().reverse().forEach(en => {
    const d = document.createElement("div"); d.className = "entry";
    const when = new Date(en.ts).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    d.innerHTML = '<button class="del" aria-label="Delete entry">\u2715</button><span class="when">' + when + '</span>' +
      (en.place ? '<span class="where">near ' + en.place + '</span>' : "") + '<p class="text"></p>';
    d.querySelector(".text").textContent = en.text;
    d.querySelector(".del").onclick = () => { STORE.journal = STORE.journal.filter(x => x.id !== en.id); STORE.save(); renderJournal(); };
    list.appendChild(d);
  });
}
$("#j-add").addEventListener("click", () => {
  const text = $("#j-text").value.trim();
  if (!text) { $("#j-text").focus(); return; }
  const finish = (lat, lng) => {
    const place = (lat != null) ? GEO.nearestPlace(lat, lng).name : null;
    STORE.journal.push({ id: "j" + Date.now(), ts: Date.now(), lat, lng, place, text });
    STORE.save(); $("#j-text").value = "";
    $("#j-loc").textContent = "Location will be added when you save (if allowed)."; renderJournal();
  };
  if (navigator.geolocation) {
    $("#j-loc").textContent = "Adding your location\u2026";
    navigator.geolocation.getCurrentPosition(p => finish(p.coords.latitude, p.coords.longitude), () => finish(null, null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  } else finish(null, null);
});

/* ---------- boot ---------- */
loadActiveRoute();
initMap();
setProgress(0, "Home \u00b7 start of the trip");
renderStops();
renderPlan();
renderFuel();
renderBudget();
renderJournal();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
