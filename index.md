---
layout: default
---

## Personal Profile

<p class="bio-lead">Hi! I’m Xin Chen and my name in Chinese is 陈鑫. I’m currently a second-year master’s student in Computer Science and Technology at <strong>Anhui Normal University</strong>. My research focuses on the co-evolution and spread of information and epidemics, and higher-order networks.</p>

- **Name:** Xin Chen（陈鑫）
- **Affiliation:** School of Computer and Information, Anhui Normal University
- **Location:** Wuhu 241003, People’s Republic of China
- **Interests:** complex networks, higher-order networks, information spreading, epidemic spreading


## Publications & Writing

<div id="publications" data-src="{{ '/publications.md' | relative_url }}">
    <p class="publications-empty">Loading publications and writing…</p>
    <noscript>
        <p class="publications-empty">JavaScript is disabled. View the editable source list in <a href="{{ '/publications.md' | relative_url }}">publications.md</a>.</p>
    </noscript>
</div>


## Page views <span class="pageviews-total" id="busuanzi_container_site_pv">(total: <span id="busuanzi_value_site_pv">--</span>)</span>

<div class="visit-heatmap" aria-label="Homepage visit heatmap">
  <div class="visit-heatmap-grid" id="visit-heatmap-grid" aria-hidden="true"></div>
  <div class="visit-heatmap-legend">
    <span>Less</span>
    <span class="visit-day visit-level-1"></span>
    <span class="visit-day visit-level-2"></span>
    <span class="visit-day visit-level-3"></span>
    <span class="visit-day visit-level-4"></span>
    <span>More</span>
  </div>
</div>

<script async src="https://busuanzi.ibruce.info/busuanzi/2.3/busuanzi.pure.mini.js"></script>
<script>
(function () {
  var grid = document.getElementById("visit-heatmap-grid");
  var totalNode = document.getElementById("busuanzi_value_site_pv");
  var cellCount = 84;
  var attempts = 0;

  if (!grid || !totalNode) return;

  for (var i = 0; i < cellCount; i++) {
    var cell = document.createElement("span");
    cell.className = "visit-day visit-level-0";
    grid.appendChild(cell);
  }

  function parseCount(text) {
    return parseInt(String(text || "").replace(/[^0-9]/g, ""), 10) || 0;
  }

  function renderHeatmap(total) {
    var cells = grid.querySelectorAll(".visit-day");
    var step = Math.max(1, Math.ceil(total / (cellCount * 4)));

    for (var i = 0; i < cells.length; i++) {
      var remaining = total - i * 4 * step;
      var level = Math.max(0, Math.min(4, Math.ceil(remaining / step)));
      cells[i].className = "visit-day visit-level-" + level;
      cells[i].title = "Page views intensity: " + level;
    }
  }

  function syncCounter() {
    var total = parseCount(totalNode.textContent);
    if (total > 0) renderHeatmap(total);
    if (++attempts < 30) window.setTimeout(syncCounter, 500);
  }

  renderHeatmap(0);
  syncCounter();
})();
</script>
