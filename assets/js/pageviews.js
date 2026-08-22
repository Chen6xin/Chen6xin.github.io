(function () {
  "use strict";

  var MONTH_LABELS = 13;
  var WEEKS = 54;
  var DAYS_PER_WEEK = 7;
  var DAY_MS = 24 * 60 * 60 * 1000;
  var DEFAULT_COUNTER_SRC = "https://chen6xin.goatcounter.com/counter/TOTAL.json";
  var LEGACY_LOCAL_VISIT_KEY = "pageviews-local-boost-v1";
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

  function render(data) {
    var wrapper = document.querySelector(".visit-heatmap");
    var grid = document.getElementById("visit-heatmap-grid");
    var months = document.getElementById("visit-months");
    var totalNode = document.getElementById("pageviews-total");
    var updatedNode = document.getElementById("pageviews-updated");
    if (!wrapper || !grid || !totalNode) return 0;

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
      cell.setAttribute("data-date", key);
      cell.setAttribute("data-count", String(count));
      cell.setAttribute("role", "img");
      cell.setAttribute("aria-label", future ? key + ": future date" : key + ": " + count + " page views");
      cell.title = future ? key + ": future date" : key + ": " + count + " page views";
      grid.appendChild(cell);
    });

    if (updatedNode && data && data.updated_at) {
      updatedNode.textContent = "Page view analytics are tracked by GoatCounter.";
    }
    wrapper.classList.add("is-loaded");
    return {
      total: total,
      todayKey: isoDate(range.today),
      todayCount: daily[isoDate(range.today)] || 0
    };
  }

  function renderEmpty() {
    return render({ total: 0, days: [] });
  }

  function parseCounterCount(payload) {
    if (!payload || payload.count == null) return "";
    return String(payload.count).trim();
  }

  function clearLegacyLocalVisitState() {
    try {
      window.localStorage.removeItem(LEGACY_LOCAL_VISIT_KEY);
    } catch (err) {
      // Ignore private-mode or storage errors.
    }
  }

  function parseCount(value) {
    var count = parseInt(String(value == null ? "" : value).replace(/,/g, ""), 10);
    return isNaN(count) ? null : count;
  }

  function updateDayCell(key, count) {
    var grid = document.getElementById("visit-heatmap-grid");
    if (!grid || !key) return;

    var cell = grid.querySelector('[data-date="' + key + '"]');
    if (!cell) return;

    cell.className = "visit-day visit-level-" + levelFor(count);
    cell.setAttribute("data-count", String(count));
    cell.setAttribute("aria-label", key + ": " + count + " page views");
    cell.title = key + ": " + count + " page views";
  }

  function updateTotalFromCounter(totalNode, counterSrc) {
    if (!totalNode || !counterSrc || typeof fetch !== "function") return Promise.resolve();

    return fetch(counterSrc, { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (payload) {
        var count = parseCounterCount(payload);
        if (count) totalNode.textContent = count;
      })
      .catch(function (err) {
        if (window.console) console.warn("pageviews counter:", err);
      });
  }

  function hitRealtimeCounter(totalNode, realtimeSrc, counterSrc, context) {
    if (!totalNode || !realtimeSrc || typeof fetch !== "function") {
      return updateTotalFromCounter(totalNode, counterSrc);
    }

    var body = {
      date: context && context.todayKey,
      base_total: context && context.total,
      base_today_count: context && context.todayCount
    };

    return fetch(realtimeSrc, {
      method: "POST",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (payload) {
        var total = parseCount(payload && payload.total);
        var todayCount = parseCount(payload && payload.today_count);
        var today = String(payload && payload.today || "");
        var updatedNode = document.getElementById("pageviews-updated");

        if (total != null) totalNode.textContent = formatNumber(total);
        if (today && todayCount != null) updateDayCell(today, todayCount);
        if (updatedNode) updatedNode.textContent = "Total updates in real time via Cloudflare Workers; analytics by GoatCounter.";
      })
      .catch(function (err) {
        var updatedNode = document.getElementById("pageviews-updated");
        totalNode.textContent = "--";
        if (updatedNode) updatedNode.textContent = "Realtime total is temporarily unavailable; analytics are tracked by GoatCounter.";
        if (window.console) console.warn("pageviews realtime counter:", err);
      });
  }

  function init() {
    clearLegacyLocalVisitState();

    var wrapper = document.querySelector(".visit-heatmap");
    if (!wrapper) return;
    var src = wrapper.getAttribute("data-src") || "/assets/data/pageviews.json";
    var counterSrc = wrapper.getAttribute("data-counter-src") || DEFAULT_COUNTER_SRC;
    var realtimeSrc = (wrapper.getAttribute("data-realtime-src") || "").trim();
    var sep = src.indexOf("?") === -1 ? "?" : "&";
    var totalNode = document.getElementById("pageviews-total");

    var emptyContext = renderEmpty();
    fetch(src + sep + "v=" + Date.now(), { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(function (data) {
        var context = render(data);
        hitRealtimeCounter(totalNode, realtimeSrc, counterSrc, context);
      })
      .catch(function (err) {
        hitRealtimeCounter(totalNode, realtimeSrc, counterSrc, emptyContext);
        var updatedNode = document.getElementById("pageviews-updated");
        if (updatedNode) updatedNode.textContent = "Page view analytics are tracked by GoatCounter.";
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
