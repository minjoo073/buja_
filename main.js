// Load Pretendard at runtime so the portfolio stays lightweight in GitHub.
(function loadPretendard() {
  var font = document.createElement("link");
  font.rel = "stylesheet";
  font.href =
    "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css";
  document.head.appendChild(font);
})();

var params = new URLSearchParams(window.location.search);
var previewMode = params.get("preview") === "1";
var exportSection = params.get("export_section");
var PORTFOLIO_BASE_WIDTH = 1440;
var PORTFOLIO_MAX_SCALE = 1920 / 1440;

if (previewMode || exportSection) {
  document.body.classList.add("exporting");
}

function updatePortfolioScale() {
  var scale = Math.min(window.innerWidth / PORTFOLIO_BASE_WIDTH, PORTFOLIO_MAX_SCALE);
  scale = Math.max(scale, 1);

  if (previewMode || exportSection) {
    scale = 1;
  }

  document.documentElement.style.setProperty("--portfolio-scale", scale.toFixed(4));
}

window.addEventListener("resize", updatePortfolioScale, { passive: true });
updatePortfolioScale();

if (exportSection) {
  window.addEventListener("load", function () {
    var query = exportSection.toLowerCase();
    var sections = Array.from(document.querySelectorAll("header.hero, section"));
    var target = sections.find(function (section) {
      var label = (section.dataset.screenLabel || "").toLowerCase();
      var id = (section.id || "").toLowerCase();
      return label === query || id === query;
    });

    if (!target) {
      return;
    }

    Array.from(document.body.children).forEach(function (child) {
      if (child !== target) {
        child.style.display = "none";
      }
    });

    target.style.display = "block";
    target.style.minHeight = "auto";
    target.style.margin = "0";

    document.body.style.background = getComputedStyle(target).backgroundColor;
    document.documentElement.style.background = getComputedStyle(target).backgroundColor;

    Array.from(target.querySelectorAll(".reveal")).forEach(function (element) {
      element.classList.add("in");
      element.style.opacity = "1";
      element.style.transform = "none";
    });

    window.scrollTo(0, 0);
  });
}

var prog = document.getElementById("progress");

function onScroll() {
  var h = document.documentElement.scrollHeight - window.innerHeight;
  var st = window.scrollY || document.documentElement.scrollTop;
  prog.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
}

window.addEventListener("scroll", onScroll, { passive: true });
onScroll();

var io = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("in");
        io.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
);

var revealElements = Array.from(document.querySelectorAll(".reveal"));

revealElements.forEach(function (element) {
  io.observe(element);
});

var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

var figVals = Array.from(document.querySelectorAll(".figrow .fig .v"))
  .map(function (valueElement) {
    var node = valueElement.firstChild;
    var target = node ? parseInt(node.textContent, 10) : NaN;
    return { valueElement: valueElement, node: node, target: target };
  })
  .filter(function (item) {
    return item.node && !Number.isNaN(item.target);
  });

var bars = Array.from(document.querySelectorAll(".journey .st .bar i, .funnel .fb"));

bars.forEach(function (bar) {
  bar.dataset.w = bar.style.width || getComputedStyle(bar).width;
  if (!reduceMotion) {
    bar.style.transition = "width 1.1s cubic-bezier(.2,.7,.2,1)";
    bar.style.width = "0%";
  }
});

function fillBar(bar) {
  bar.style.width = bar.dataset.w;
}

function runCount(item) {
  if (reduceMotion) {
    return;
  }

  var duration = 1100;
  var start = performance.now();

  function tick(now) {
    var progress = Math.min(1, (now - start) / duration);
    var eased = 1 - Math.pow(1 - progress, 3);
    item.node.textContent = Math.round(item.target * eased);

    if (progress < 1) {
      requestAnimationFrame(tick);
    } else {
      item.node.textContent = item.target;
    }
  }

  requestAnimationFrame(tick);
}

var dataIO = new IntersectionObserver(
  function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) {
        return;
      }

      var target = entry.target;
      if (target.__fig) {
        runCount(target.__fig);
      }
      if (target.__bar) {
        fillBar(target.__bar);
      }

      dataIO.unobserve(target);
    });
  },
  { threshold: 0.4 }
);

figVals.forEach(function (item) {
  item.valueElement.__fig = item;
  dataIO.observe(item.valueElement);
});

bars.forEach(function (bar) {
  bar.__bar = bar;
  dataIO.observe(bar);
});

if (previewMode) {
  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      revealElements.forEach(function (element) {
        element.classList.add("in");
      });
      settleAll();
    });
  });
}

function settleAll() {
  figVals.forEach(function (item) {
    item.node.textContent = item.target;
  });

  bars.forEach(function (bar) {
    bar.style.transition = "none";
    bar.style.width = bar.dataset.w;
  });
}

window.addEventListener("beforeprint", settleAll);
