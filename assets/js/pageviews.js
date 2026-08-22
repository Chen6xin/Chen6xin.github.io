(function () {
  "use strict";

  var MONTH_LABELS = 13;
  var WEEKS = 54;
  var DAYS_PER_WEEK = 7;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var LOCAL_VISIT_KEY = "pageviews-local-boost-v1";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function isoDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  function localDateFromIso(s) {
    var parts = String(s || "").split("-").map(function (x) { return parseInt(x, 10); });
    if (parts.length !== 3 || parts.some(isNaN)) return null;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function startOfDay(d) {
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }

  function formatNumber(n) {
    return String(n || 0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function normalizeDays(rawDays) {
    var map = {};
    if (!Array.isArray(rawDays)) return map;

    rawDays.forEach(function (item) {
      if (!item) return;
      var date = item.date || item.day;
      var count = item.count != null ? item.count : item.views;
      count = parseInt(count, 10) || 0;
      if (date) map[String(date)] = count;
    });
    return map;
  }

  function levelFor(count) {
    count = parseInt(count, 10) || 0;
    if (count <= 0) return 0;
    if (count <= 5) return 1;
    if (count <= 9) return 2;
    if (count <= 15) return 3;
    return 4;
  }

  function normalizeLocalVisitState(value) {
    var state = value && typeof value === "object" ? value : {};
    var days = {};
    Object.keys(state.days || {}).forEach(function (key) {
      var count = parseInt(state.days[key], 10) || 0;
      if (count > 0) days[key] = count;
    });
    return {
      updated_at: state.updated_at || "",
      total: parseInt(state.total, 10) || 0,
      days: days
    };
  }

  function readLocalVisitState() {
    try {
      return normalizeLocalVisitState(JSON.parse(window.localStorage.getItem(LOCAL_VISIT_KEY) || "{}"));
    } catch (err) {
      return normalizeLocalVisitState({});
    }
  }

  function writeLocalVisitState(state) {
    try {
      window.localStorage.setItem(LOCAL_VISIT_KEY, JSON.stringify(normalizeLocalVisitState(state)));
    } catch (err) {
      // Ignore private-mode or storage quota errors; the current page still renders.
    }
  }

  function recordLocalVisit(todayKey) {
    var state = readLocalVisitState();
    state.total += 1;
    state.days[todayKey] = (parseInt(state.days[todayKey], 10) || 0) + 1;
    writeLocalVisitState(state);
    return state;
  }

  function reconcileLocalVisit(updatedAt, todayKey, state) {
    state = normalizeLocalVisitState(state);
    if (!updatedAt) return state;

    if (state.updated_at && state.updated_at !== updatedAt) {
      state = { updated_at: updatedAt, total: 1, days: {} };
      state.days[todayKey] = 1;
    } else {
      state.updated_at = updatedAt;
    }

    writeLocalVisitState(state);
    return state;
  }

  function localBoostForDate(localVisit, key) {
    return parseInt(localVisit && localVisit.days && localVisit.days[key], 10) || 0;
  }

  function buildDateRange() {
    var today = startOfDay(new Date());
    var end = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS); // Saturday of current week.
    var start = new Date(end.getTime() - (WEEKS * DAYS_PER_WEEK - 1) * DAY_MS);
    var dates = [];

    for (var d = new Date(start); d <= end; d = new Date(d.getTime() + DAY_MS)) {
      dates.push(new Date(d));
    }
    return { today: today, start: start, end: end, dates: dates };
  }

  function renderMonths(container, today) {
    if (!container) return;
    container.innerHTML = "";

    var firstMonth = new Date(today.getFullYear(), today.getMonth() - (MONTH_LABELS - 1), 1);
    for (var i = 0; i < MONTH_LABELS; i++) {
      var d = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1);
      var span = document.createElement("span");
      span.textContent = MONTHS[d.getMonth()];
      container.appendChild(span);
    }
  }

  function render(data, localVisit) {
    var wrapper = document.querySelector(".visit-heatmap");
    var grid = document.getElementById("visit-heatmap-grid");
    var months = document.getElementById("visit-months");
    var totalNode = document.getElementById("pageviews-total");
    var updatedNode = document.getElementById("pageviews-updated");
    if (!wrapper || !grid || !totalNode) return;

    var daily = normalizeDays(data && data.days);
    var localTotal = parseInt(localVisit && localVisit.total, 10) || 0;
    var range = buildDateRange();
    var counts = range.dates.map(function (d) {
      var key = isoDate(d);
      return (daily[key] || 0) + localBoostForDate(localVisit, key);
    });
    var baseTotal = data && data.total != null
      ? parseInt(data.total, 10) || 0
      : range.dates.reduce(function (sum, d) { return sum + (daily[isoDate(d)] || 0); }, 0);
    var total = baseTotal + localTotal;

    totalNode.textContent = formatNumber(total);
    renderMonths(months, range.today);
    grid.innerHTML = "";

    range.dates.forEach(function (d, i) {
      var key = isoDate(d);
      var count = counts[i];
      var cell = document.createElement("span");
      var future = d > range.today;
      cell.className = "visit-day visit-level-" + (future ? 0 : levelFor(count));
      if (future) cell.className += " is-future";
      cell.setAttribute("role", "img");
      cell.setAttribute("aria-label", future ? key + ": future date" : key + ": " + count + " page views");
      cell.title = future ? key + ": future date" : key + ": " + count + " page views";
      grid.appendChild(cell);
    });

    if (updatedNode && data && data.updated_at) {
      updatedNode.textContent = "Page view statistics are updated in real time by GoatCounter.";
    }
    wrapper.classList.add("is-loaded");
  }

  function renderEmpty(localVisit) {
    render({ total: 0, days: [] }, localVisit);
  }

  function init() {
    var wrapper = document.querySelector(".visit-heatmap");
    if (!wrapper) return;
    var src = wrapper.getAttribute("data-src") || "/assets/data/pageviews.json";
    var sep = src.indexOf("?") === -1 ? "?" : "&";
    var todayKey = isoDate(startOfDay(new Date()));
    var localVisit = recordLocalVisit(todayKey);

    renderEmpty(localVisit);
    fetch(src + sep + "v=" + Date.now(), { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        localVisit = reconcileLocalVisit(data && data.updated_at, todayKey, localVisit);
        render(data, localVisit);
      })
      .catch(function (err) {
        var updatedNode = document.getElementById("pageviews-updated");
        if (updatedNode) updatedNode.textContent = "Page view statistics are updated in real time by GoatCounter.";
        if (window.console) console.warn("pageviews.js:", err);
      });
  }

  if (typeof document !== "undefined") {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", init);
    } else {
      init();
    }
  }
})();
