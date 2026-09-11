/* ============================================================
   I-40 trip companion — app logic
   Vanilla JS + Leaflet. All state persists in localStorage so
   the app remembers favorites and pinned stops between drives.
   ============================================================ */

// ---- distance + route projection (miles, equirectangular approx) ----
const REF_LAT = 35.5;
const KX = Math.cos(REF_LAT * Math.PI / 180) * 69.172; // miles per degree lng
const KY = 69.0;                                        // miles per degree lat
const toXY = (lat, lng) => ({ x: lng * KX, y: lat * KY });
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

const ROUTE_XY = ROUTE.map(p => toXY(p.lat, p.lng));
const SEG_LEN = [];
const CUM = [0];
for (let i = 0; i < ROUTE_XY.length - 1; i++) {
  const d = dist(ROUTE_XY[i], ROUTE_XY[i + 1]);
  SEG_LEN.push(d);
  CUM.push(CUM[i] + d);
}
const TOTAL_MI = CUM[CUM.length - 1];

// Find the nearest point on the route to (lat,lng); return miles-along + offset.
function projectOntoRoute(lat, lng) {
  const p = toXY(lat, lng);
  let best = { off: Infinity, along: 0 };
  for (let i = 0; i < ROUTE_XY.length - 1; i++) {
    const a = ROUTE_XY[i], b = ROUTE_XY[i + 1];
    const abx = b.x - a.x, aby = b.y - a.y;
    const len2 = abx * abx + aby * aby || 1e-9;
    let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / len2;
    t = Math.max(0, Math.min(1, t));
    const proj = { x: a.x + t * abx, y: a.y + t * aby };
    const off = dist(p, proj);
    if (off < best.off) best = { off, along: CUM[i] + t * SEG_LEN[i] };
  }
  return best;
}

// Precompute how far along the route each milestone sits.
MILESTONES.forEach(m => { m.along = projectOntoRoute(m.lat, m.lng).along; });
const MILES_SORTED = [...MILESTONES].sort((a, b) => a.along - b.along);

const fmtMi = n => Math.round(n).toLocaleString() + " mi";

// ---- persistent state ----
const store = {
  favs: JSON.parse(localStorage.getItem("i40_favs") || "[]"),
  custom: JSON.parse(localStorage.getItem("i40_custom") || "[]"),
  save() {
    localStorage.setItem("i40_favs", JSON.stringify(this.favs));
    localStorage.setItem("i40_custom", JSON.stringify(this.custom));
  }
};

// ---- map ----
const map = L.map("map", { zoomControl: false, attributionControl: true })
  .fitBounds(ROUTE.map(p => [p.lat, p.lng]), { padding: [30, 30] });
L.control.zoom({ position: "topleft" }).addTo(map);
L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

// the route itself
L.polyline(ROUTE.map(p => [p.lat, p.lng]), {
  color: "#1E7A46", weight: 5, opacity: 0.9, lineJoin: "round"
}).addTo(map);

// milestone markers
const markerFor = {};
function milestoneIcon(m) {
  const fav = store.favs.includes(m.id);
  return L.divIcon({
    className: "",
    html: `<div class="pin ${fav ? "pin--fav" : ""}" title="${m.name}"></div>`,
    iconSize: [22, 22], iconAnchor: [11, 11]
  });
}
MILESTONES.forEach(m => {
  const mk = L.marker([m.lat, m.lng], { icon: milestoneIcon(m) })
    .addTo(map)
    .bindPopup(`<strong>${m.name}</strong><br>${m.blurb}`);
  markerFor[m.id] = mk;
});

// custom pinned stops
const customLayer = L.layerGroup().addTo(map);
function renderCustomPins() {
  customLayer.clearLayers();
  store.custom.forEach(c => {
    L.marker([c.lat, c.lng], {
      icon: L.divIcon({ className: "", html: `<div class="pin pin--custom"></div>`,
        iconSize: [22, 22], iconAnchor: [11, 11] })
    }).addTo(customLayer).bindPopup(`<strong>${c.name}</strong><br>your pinned stop`);
  });
}
renderCustomPins();

// "you are here"
let meMarker = null;
function showMe(lat, lng) {
  if (!meMarker) {
    meMarker = L.marker([lat, lng], {
      icon: L.divIcon({ className: "", html: `<div class="me"></div>`,
        iconSize: [26, 26], iconAnchor: [13, 13] }), zIndexOffset: 1000
    }).addTo(map);
  } else {
    meMarker.setLatLng([lat, lng]);
  }
}

// ---- status + progress ----
const el = id => document.getElementById(id);
function setProgress(along) {
  const pct = Math.max(0, Math.min(100, (along / TOTAL_MI) * 100));
  el("progFill").style.width = pct + "%";
  el("progCar").style.left = pct + "%";
  el("progLabel").textContent = `${fmtMi(along)} of ${fmtMi(TOTAL_MI)}`;
}
function updateStatus(lat, lng) {
  const { along } = projectOntoRoute(lat, lng);
  setProgress(along);
  const next = MILES_SORTED.find(m => m.along > along + 1);
  if (next) {
    el("nextName").textContent = next.name;
    el("nextDist").textContent = fmtMi(next.along - along) + " ahead";
    el("statusKicker").textContent = "Next stop";
  } else {
    el("nextName").textContent = "Wilmington — you made it";
    el("nextDist").textContent = "End of I-40";
    el("statusKicker").textContent = "Almost there";
  }
}

// ---- geolocation ----
let watchId = null;
el("locate").addEventListener("click", () => {
  if (!navigator.geolocation) {
    el("nextName").textContent = "Location isn't available on this device";
    return;
  }
  el("locate").classList.add("locate--active");
  if (watchId !== null) navigator.geolocation.clearWatch(watchId);
  watchId = navigator.geolocation.watchPosition(
    pos => {
      const { latitude, longitude } = pos.coords;
      showMe(latitude, longitude);
      map.setView([latitude, longitude], Math.max(map.getZoom(), 9));
      updateStatus(latitude, longitude);
    },
    () => {
      el("locate").classList.remove("locate--active");
      el("statusKicker").textContent = "Couldn't get a fix";
      el("nextName").textContent = "Check that location is allowed";
      el("nextDist").textContent = "then tap the target again";
    },
    { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 }
  );
});

// ---- bottom sheet: collapse / expand + tabs ----
const sheet = el("sheet");
el("handle").addEventListener("click", () => sheet.classList.toggle("sheet--open"));
document.querySelectorAll(".tab").forEach(tab => {
  tab.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(t => t.classList.remove("tab--on"));
    document.querySelectorAll(".panel").forEach(p => p.classList.remove("panel--on"));
    tab.classList.add("tab--on");
    el("panel-" + tab.dataset.panel).classList.add("panel--on");
    sheet.classList.add("sheet--open");
  });
});

// ---- lists ----
function flyTo(lat, lng) {
  map.setView([lat, lng], 11, { animate: true });
  sheet.classList.remove("sheet--open");
}
function toggleFav(id) {
  const i = store.favs.indexOf(id);
  if (i >= 0) store.favs.splice(i, 1); else store.favs.push(id);
  store.save();
  const m = MILESTONES.find(x => x.id === id);
  if (m && markerFor[id]) markerFor[id].setIcon(milestoneIcon(m));
  renderStops(); renderFavs();
}
function row(opts) {
  const r = document.createElement("div");
  r.className = "row";
  r.innerHTML = `
    <button class="row__go" aria-label="Show ${opts.name} on the map">
      <span class="row__name">${opts.name}</span>
      <span class="row__meta">${opts.meta}</span>
    </button>
    <button class="row__act" aria-label="${opts.actLabel}">${opts.actIcon}</button>`;
  r.querySelector(".row__go").addEventListener("click", opts.onGo);
  r.querySelector(".row__act").addEventListener("click", opts.onAct);
  return r;
}
function renderStops() {
  const wrap = el("panel-stops"); wrap.innerHTML = "";
  MILES_SORTED.forEach(m => {
    const fav = store.favs.includes(m.id);
    wrap.appendChild(row({
      name: m.name,
      meta: `mile ${Math.round(m.along).toLocaleString()} · ${m.blurb}`,
      actIcon: fav ? "★" : "☆",
      actLabel: fav ? "Remove from favorites" : "Add to favorites",
      onGo: () => flyTo(m.lat, m.lng),
      onAct: () => toggleFav(m.id)
    }));
  });
}
function renderFavs() {
  const wrap = el("panel-favs"); wrap.innerHTML = "";
  const favMs = MILES_SORTED.filter(m => store.favs.includes(m.id));
  if (!favMs.length && !store.custom.length) {
    wrap.innerHTML = `<p class="empty">No favorites yet. Star a stop, or pin a motel with <b>Add a stop</b> below.</p>`;
  }
  favMs.forEach(m => wrap.appendChild(row({
    name: m.name, meta: m.blurb, actIcon: "★", actLabel: "Remove from favorites",
    onGo: () => flyTo(m.lat, m.lng), onAct: () => toggleFav(m.id)
  })));
  store.custom.forEach(c => wrap.appendChild(row({
    name: c.name, meta: "your pinned stop",
    actIcon: "✕", actLabel: "Delete this pin",
    onGo: () => flyTo(c.lat, c.lng),
    onAct: () => {
      store.custom = store.custom.filter(x => x.id !== c.id);
      store.save(); renderCustomPins(); renderFavs();
    }
  })));
}

// ---- add a custom stop: tap the map to place it ----
let placing = false;
el("addStop").addEventListener("click", () => {
  placing = !placing;
  el("addStop").classList.toggle("addStop--on", placing);
  el("hint").classList.toggle("hint--on", placing);
});
map.on("click", e => {
  if (!placing) return;
  const name = prompt("Name this stop (e.g. the motel):", "");
  if (name && name.trim()) {
    store.custom.push({ id: "c" + Date.now(), name: name.trim(), lat: e.latlng.lat, lng: e.latlng.lng });
    store.save(); renderCustomPins(); renderFavs();
  }
  placing = false;
  el("addStop").classList.remove("addStop--on");
  el("hint").classList.remove("hint--on");
});

// ---- boot ----
setProgress(0);
renderStops();
renderFavs();

if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("service-worker.js").catch(() => {});
}
