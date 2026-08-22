(function () {
  "use strict";

  var MONTH_BLOCKS = 13;
  var WEEKS_PER_MONTH = 4;
  var WEEKS = MONTH_BLOCKS * WEEKS_PER_MONTH;
  var DAYS_PER_WEEK = 7;
  var DAY_MS = 24 * 60 * 60 * 1000;
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

  function levelFor(count, max) {
    if (!count || count <= 0 || !max) return 0;
    var ratio = count / max;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
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

    var firstMonth = new Date(today.getFullYear(), today.getMonth() - (MONTH_BLOCKS - 1), 1);
    for (var i = 0; i < MONTH_BLOCKS; i++) {
      var d = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + i, 1);
      var span = document.createElement("span");
      span.textContent = MONTHS[d.getMonth()];
      container.appendChild(span);
    }
  }

  function render(data) {
    var wrapper = document.querySelector(".visit-heatmap");
    var grid = document.getElementById("visit-heatmap-grid");
    var months = document.getElementById("visit-months");
    var totalNode = document.getElementById("pageviews-total");
    var updatedNode = document.getElementById("pageviews-updated");
    if (!wrapper || !grid || !totalNode) return;

    var daily = normalizeDays(data && data.days);
    var range = buildDateRange();
    var counts = range.dates.map(function (d) { return daily[isoDate(d)] || 0; });
    var max = counts.reduce(function (m, n) { return Math.max(m, n); }, 0);
    var total = data && data.total != null
      ? parseInt(data.total, 10) || 0
      : counts.reduce(function (s, n) { return s + n; }, 0);

    totalNode.textContent = formatNumber(total);
    renderMonths(months, range.today);
    grid.innerHTML = "";

    range.dates.forEach(function (d, i) {
      var key = isoDate(d);
      var count = counts[i];
      var cell = document.createElement("span");
      var future = d > range.today;
      cell.className = "visit-day visit-level-" + (future ? 0 : levelFor(count, max));
      if (future) cell.className += " is-future";
      cell.setAttribute("role", "img");
      cell.setAttribute("aria-label", future ? key + ": future date" : key + ": " + count + " page views");
      cell.title = future ? key + ": future date" : key + ": " + count + " page views";
      grid.appendChild(cell);
    });

    if (updatedNode && data && data.updated_at) {
      updatedNode.textContent = "Updated " + data.updated_at.replace("T", " ").replace(/Z$/, " UTC") + ".";
    }
    wrapper.classList.add("is-loaded");
  }

  function renderEmpty() {
    render({ total: 0, days: [] });
  }

  function init() {
    var wrapper = document.querySelector(".visit-heatmap");
    if (!wrapper) return;
    var src = wrapper.getAttribute("data-src") || "/assets/data/pageviews.json";
    var sep = src.indexOf("?") === -1 ? "?" : "&";

    renderEmpty();
    fetch(src + sep + "v=" + Date.now(), { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(render)
      .catch(function (err) {
        var updatedNode = document.getElementById("pageviews-updated");
        if (updatedNode) updatedNode.textContent = "Page view data will appear after the first GoatCounter update.";
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
