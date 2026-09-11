/* I-40 trip companion — app wiring.
   Screens: Map, Stops, Gas, Budget, Journal. State lives in STORE (localStorage),
   route math in GEO. Keeps things large, plain, and forgiving for an older driver. */

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

/* ---------- map ---------- */
let map = null, meMarker = null, placing = false;
const markerFor = {};
const customLayer = L.layerGroup();

function pinIcon(kind) {
  return L.divIcon({ className: "", html: '<div class="pin ' + kind + '"></div>',
    iconSize: [22, 22], iconAnchor: [11, 11] });
}
function milestoneIcon(m) {
  return pinIcon(STORE.favs.includes(m.id) ? "pin--fav" : "");
}

function initMap() {
  map = L.map("map", { zoomControl: false })
    .fitBounds(ROUTE.map(p => [p.lat, p.lng]), { padding: [28, 28] });
  L.control.zoom({ position: "topleft" }).addTo(map);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 18, attribution: "&copy; OpenStreetMap contributors" }).addTo(map);

  L.polyline(ROUTE.map(p => [p.lat, p.lng]),
    { color: "#1E7A46", weight: 5, opacity: .9, lineJoin: "round" }).addTo(map);

  MILESTONES.forEach(m => {
    markerFor[m.id] = L.marker([m.lat, m.lng], { icon: milestoneIcon(m) })
      .addTo(map).bindPopup("<strong>" + m.name + "</strong><br>" + m.blurb);
  });
  customLayer.addTo(map);
  renderCustomPins();

  map.on("click", e => {
    if (!placing) return;
    const name = prompt("Name this stop (for example, the motel):", "");
    if (name && name.trim()) {
      STORE.custom.push({ id: "c" + Date.now(), name: name.trim(), lat: e.latlng.lat, lng: e.latlng.lng });
      STORE.save(); renderCustomPins(); renderStops();
    }
    placing = false; $("#addStop").classList.remove("on"); $("#hint").classList.remove("on");
  });
}
function renderCustomPins() {
  customLayer.clearLayers();
  STORE.custom.forEach(c => L.marker([c.lat, c.lng], { icon: pinIcon("pin--custom") })
    .addTo(customLayer).bindPopup("<strong>" + c.name + "</strong><br>your pinned stop"));
}
function flyTo(lat, lng) { show("map"); map.setView([lat, lng], 11, { animate: true }); }

/* status + progress */
function setProgress(along, label) {
  const pct = Math.max(0, Math.min(100, along / GEO.TOTAL * 100));
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
    $("#nextDist").textContent = "End of I-40";
  }
}
let watchId = null;
$("#locate").addEventListener("click", () => {
  if (!navigator.geolocation) { $("#nextName").textContent = "Location isn't available here"; return; }
  $("#locate").classList.add("on");
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
    $("#statusKicker").textContent = "Couldn't get a fix";
    $("#nextName").textContent = "Allow location, then tap again";
    $("#nextDist").textContent = "";
  }, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
});

/* add-stop toggle (lives on the Stops screen, pins on the map) */
$("#addStop").addEventListener("click", () => {
  placing = !placing;
  $("#addStop").classList.toggle("on", placing);
  if (placing) { show("map"); $("#hint").classList.add("on"); }
  else $("#hint").classList.remove("on");
});

/* ---------- Stops list ---------- */
function row(o) {
  const r = document.createElement("div"); r.className = "row";
  r.innerHTML = '<button class="row__go"><span class="row__name">' + o.name +
    '</span><span class="row__meta">' + o.meta + '</span></button>' +
    '<button class="row__act" aria-label="' + o.actLabel + '">' + o.actIcon + '</button>';
  r.querySelector(".row__go").onclick = o.onGo;
  r.querySelector(".row__act").onclick = o.onAct;
  return r;
}
function toggleFav(id) {
  const i = STORE.favs.indexOf(id);
  if (i >= 0) STORE.favs.splice(i, 1); else STORE.favs.push(id);
  STORE.save();
  const m = MILESTONES.find(x => x.id === id);
  if (markerFor[id]) markerFor[id].setIcon(milestoneIcon(m));
  renderStops();
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

/* ---------- Fuel ---------- */
function renderFuel() {
  const f = STORE.fuel;
  $("#f-mpg").value = f.mpgHwy; $("#f-tank").value = f.tankGal;
  $("#f-price").value = f.gasPrice; $("#f-int").value = f.refuelEveryMi;

  const gal = GEO.TOTAL / (f.mpgHwy || 30);
  const cost = gal * (f.gasPrice || 0);
  const hrs = GEO.drivingHours();
  const days = Math.ceil(GEO.TOTAL / 450);
  $("#f-dist").textContent = GEO.fmtMi(GEO.TOTAL);
  $("#f-time").textContent = "\u2248 " + Math.round(hrs) + " h";
  $("#f-gal").textContent = Math.round(gal) + " gal";
  $("#f-cost").textContent = money(cost);

  const stops = GEO.fuelStops(Math.max(120, f.refuelEveryMi || 300));
  $("#f-count").innerHTML = "About <b>" + stops.length + "</b> fill-ups if you refuel every " +
    f.refuelEveryMi + " miles \u2014 roughly " + days + " days of driving at 450 mi/day.";
  const wrap = $("#list-fuel"); wrap.innerHTML = "";
  stops.forEach((s, i) => wrap.appendChild(row({
    name: "Fill-up " + (i + 1) + ": " + s.town,
    meta: "Around mile " + s.mile.toLocaleString(),
    actIcon: "\u26FD", actLabel: "Fuel stop",
    onGo: () => {
      const p = ROUTE.find(r => r.name.replace(/ \(home\)/, "") === s.town);
      if (p) flyTo(p.lat, p.lng);
    },
    onAct: () => {}
  })));
}
["f-mpg", "f-tank", "f-price", "f-int"].forEach(id => {
  $("#" + id).addEventListener("change", () => {
    STORE.fuel.mpgHwy = parseFloat($("#f-mpg").value) || 30;
    STORE.fuel.tankGal = parseFloat($("#f-tank").value) || 14.9;
    STORE.fuel.gasPrice = parseFloat($("#f-price").value) || 0;
    STORE.fuel.refuelEveryMi = parseInt($("#f-int").value) || 300;
    STORE.save(); renderFuel();
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
    f.querySelector("input").addEventListener("change", e => {
      STORE.budget[c] = parseFloat(e.target.value) || 0; STORE.save(); renderBudget();
    });
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
    d.querySelector(".row__act").onclick = () => {
      STORE.expenses = STORE.expenses.filter(x => x.id !== e.id); STORE.save(); renderBudget();
    };
    list.appendChild(d);
  });
}
$("#e-add").addEventListener("click", () => {
  const amt = parseFloat($("#e-amt").value);
  if (!amt || amt <= 0) { $("#e-amt").focus(); return; }
  STORE.expenses.push({ id: "e" + Date.now(), cat: $("#e-cat").value,
    amount: amt, note: $("#e-note").value.trim(), ts: Date.now() });
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
    d.querySelector(".del").onclick = () => {
      STORE.journal = STORE.journal.filter(x => x.id !== en.id); STORE.save(); renderJournal();
    };
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
    navigator.geolocation.getCurrentPosition(
      p => finish(p.coords.latitude, p.coords.longitude),
      () => finish(null, null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 });
  } else finish(null, null);
});

/* ---------- boot ---------- */
initMap();
setProgress(0, "Home \u00b7 start of the trip");
renderStops();
renderFuel();
renderBudget();
renderJournal();
if ("serviceWorker" in navigator) navigator.serviceWorker.register("service-worker.js").catch(() => {});
