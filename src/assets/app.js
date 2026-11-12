// 尺貫法換算 — クライアント側の即時換算
(function () {
  "use strict";
  var unitsEl = document.getElementById("unit-data");
  if (!unitsEl) return;
  var units = JSON.parse(unitsEl.textContent || "[]");
  var byId = {};
  units.forEach(function (u) { byId[u.id] = u; });

  function numStr(v) {
    if (!isFinite(v)) return "";
    return String(Number(v.toPrecision(6)));
  }
  function grouped(v) {
    if (!isFinite(v)) return "—";
    var p = Number(v.toPrecision(6));
    return p.toLocaleString("ja-JP", { maximumFractionDigits: 6 });
  }
  function val(el) {
    var v = parseFloat(el.value);
    return isFinite(v) ? v : NaN;
  }

  document.querySelectorAll('[data-tool="convert"]').forEach(function (root) {
    var inputs = Array.prototype.slice.call(root.querySelectorAll("input[data-unit]"));
    if (!inputs.length) return;
    inputs.forEach(function (src) {
      src.addEventListener("input", function () {
        var v = val(src);
        if (isNaN(v)) return;
        var f = byId[src.getAttribute("data-unit")];
        if (!f) return;
        var base = v * f.f;
        inputs.forEach(function (other) {
          if (other === src) return;
          var t = byId[other.getAttribute("data-unit")];
          if (!t) return;
          other.value = numStr(base / t.f);
        });
      });
    });
  });

  var CALCS = {
    sai: function (r) {
      var t = r("t"), w = r("w"), len = r("len");
      var m3 = (t * w * len) / 10000;
      return { m3: m3, sai: m3 / (100 / 35937), l: m3 * 1000 };
    },
    tsuboTanka: function (r, s) {
      var price = r("price"), area = r("area"), unit = s("unit");
      var m2 = unit === "m2" ? area : area * 3.305785;
      var tsubo = unit === "tsubo" ? area : area * 0.302493;
      return { tankaTsubo: price / tsubo, tankaM2: price / m2, m2: m2 };
    },
    tsuboPrice: function (r) {
      var tanka = r("tanka"), tsubo = r("tsubo");
      var total = tanka * tsubo;
      return { total: total, totalYen: total * 10000, m2: tsubo * 3.305785 };
    },
    wallpaper: function (r) {
      var wsum = r("wsum"), h = r("h"), repeat = r("repeat"), rollW = r("rollW"), rollL = r("rollL"), margin = r("margin");
      var cut = h + 0.1 + repeat / 100;
      var perRoll = cut > 0 ? Math.floor(rollL / cut) : 0;
      var strips = Math.ceil(wsum / (rollW / 100));
      var rolls = perRoll > 0 ? Math.ceil((strips * (1 + margin / 100)) / perRoll) : NaN;
      return { strips: strips, perRoll: perRoll, rolls: rolls };
    },
    paint: function (r) {
      var area = r("area"), coats = r("coats"), cov = r("coverage");
      var liters = cov > 0 ? (area * coats) / cov : NaN;
      return { liters: liters, cans: Math.ceil(liters / 4) };
    },
    gravel: function (r) {
      var area = r("area"), depth = r("depth"), density = r("density"), bag = r("bag");
      var m3 = (area * depth) / 100;
      var ton = m3 * density;
      return { m3: m3, ton: ton, bags: bag > 0 ? Math.ceil((ton * 1000) / bag) : NaN };
    },
    tatamiCount: function (r, s) {
      var height = r("height"), width = r("width"), spec = parseFloat(s("spec"));
      var m2 = height * width;
      return { m2: m2, jo: m2 / spec, tsubo: m2 / 3.305785 };
    },
    kenpei: function (r) {
      var site = r("site"), kp = r("kenpei"), ys = r("yoseki");
      var kenchiku = (site * kp) / 100;
      var yosekiArea = (site * ys) / 100;
      return {
        kenchiku: kenchiku,
        yosekiArea: yosekiArea,
        kenchikuTsubo: kenchiku * 0.302493,
        yosekiTsubo: yosekiArea * 0.302493
      };
    }
  };

  document.querySelectorAll('[data-tool="calc"]').forEach(function (root) {
    var id = root.getAttribute("data-calc");
    var fn = CALCS[id];
    if (!fn) return;
    var readNum = function (k) {
      var el = root.querySelector('[data-field="' + k + '"]');
      if (!el) return NaN;
      var v = parseFloat(el.value);
      return isFinite(v) ? v : NaN;
    };
    var readStr = function (k) {
      var el = root.querySelector('[data-field="' + k + '"]');
      return el ? el.value : "";
    };
    function run() {
      var out;
      try { out = fn(readNum, readStr); } catch (e) { return; }
      Object.keys(out).forEach(function (k) {
        var el = root.querySelector('[data-out="' + k + '"]');
        if (!el) return;
        var v = out[k];
        el.textContent = isFinite(v) ? grouped(v) : "—";
      });
    }
    root.querySelectorAll("input, select").forEach(function (el) {
      el.addEventListener("input", run);
      el.addEventListener("change", run);
    });
    run();
  });
})();
