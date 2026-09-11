/* All trip state lives here, saved on the phone so nothing is lost between
   drives (or if the app is closed). Shared by the app and the print page. */

const STORE = (function () {
  const read = (k, dflt) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? dflt; }
    catch { return dflt; }
  };
  const budgetDefault = {};
  CATEGORIES.forEach(c => budgetDefault[c] = 0);

  const s = {
    favs:    read("i40_favs", []),
    custom:  read("i40_custom", []),
    fuel:    Object.assign({}, VEHICLE, read("i40_fuel", {})),
    budget:  Object.assign({}, budgetDefault, read("i40_budget", {})),
    expenses: read("i40_expenses", []), // {id, cat, amount, note, ts}
    journal:  read("i40_journal", []),  // {id, ts, lat, lng, place, text}

    save() {
      localStorage.setItem("i40_favs", JSON.stringify(this.favs));
      localStorage.setItem("i40_custom", JSON.stringify(this.custom));
      localStorage.setItem("i40_fuel", JSON.stringify(this.fuel));
      localStorage.setItem("i40_budget", JSON.stringify(this.budget));
      localStorage.setItem("i40_expenses", JSON.stringify(this.expenses));
      localStorage.setItem("i40_journal", JSON.stringify(this.journal));
    },

    spentByCat() {
      const t = {}; CATEGORIES.forEach(c => t[c] = 0);
      this.expenses.forEach(e => { t[e.cat] = (t[e.cat] || 0) + Number(e.amount || 0); });
      return t;
    },
    totalBudget() { return CATEGORIES.reduce((a, c) => a + Number(this.budget[c] || 0), 0); },
    totalSpent()  { return this.expenses.reduce((a, e) => a + Number(e.amount || 0), 0); }
  };
  return s;
})();
