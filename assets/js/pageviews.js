(function () {
  "use strict";

  var MONTH_LABELS = 13;
  var WEEKS = 54;
  var DAYS_PER_WEEK = 7;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var DEFAULT_COUNTER_SRC = "https://chen6xin.goatcounter.com/counter/TOTAL.json";
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function isoDate(d) {
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
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

  function buildDateRange() {
    var today = new Date();
    today = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    var end = new Date(today.getTime() + (6 - today.getDay()) * DAY_MS);
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
    var total = data && data.total != null
      ? parseInt(data.total, 10) || 0
      : range.dates.reduce(function (sum, d) { return sum + (daily[isoDate(d)] || 0); }, 0);

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
      updatedNode.textContent = "Updated " + data.updated_at.replace("T", " ").replace(/Z$/, " UTC") + ".";
    }
    wrapper.classList.add("is-loaded");
  }

  function renderEmpty() {
    render({ total: 0, days: [] });
  }

  function updateTotalFromCounter(totalNode, counterSrc) {
    if (!totalNode || !counterSrc || typeof fetch !== "function") return;

    fetch(counterSrc, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (payload) {
        if (!payload || payload.count == null) return;
        totalNode.textContent = String(payload.count).trim();
      })
      .catch(function (err) {
        if (window.console) console.warn("pageviews counter:", err);
      });
  }

  function init() {
    var wrapper = document.querySelector(".visit-heatmap");
    if (!wrapper) return;
    var src = wrapper.getAttribute("data-src") || "/assets/data/pageviews.json";
    var counterSrc = wrapper.getAttribute("data-counter-src") || DEFAULT_COUNTER_SRC;
    var sep = src.indexOf("?") === -1 ? "?" : "&";
    var totalNode = document.getElementById("pageviews-total");

    renderEmpty();
    fetch(src + sep + "v=" + Date.now(), { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        render(data);
        updateTotalFromCounter(totalNode, counterSrc);
      })
      .catch(function (err) {
        updateTotalFromCounter(totalNode, counterSrc);
        var updatedNode = document.getElementById("pageviews-updated");
        if (updatedNode) updatedNode.textContent = "Page view statistics are updated by GoatCounter.";
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
