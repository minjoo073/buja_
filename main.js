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
const PORTFOLIO_BASE_WIDTH = 1440;
const PORTFOLIO_MAX_SCALE = 1920 / 1440;

if (previewMode || exportSection) {
  document.body.classList.add("exporting");
}

function updatePortfolioScale() {
  const scale = Math.min(
    window.innerWidth / PORTFOLIO_BASE_WIDTH,
    PORTFOLIO_MAX_SCALE
  );

  if (previewMode || exportSection) {
    document.documentElement.style.setProperty("--portfolio-scale", "1");
    return;
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

// ============================================================
// Goal → navy scroll-driven chapter transition.
// The Goal/HMW banner is a tall, pinned stage (see #goal-transition CSS).
// As you scroll through it, the thin red "HMW?" outline turns navy and grows
// steadily thicker; the stage background resolves cream → deep navy; the
// overlaid question copy brightens (ink → white) so it stays readable; and the
// thick outline finally drops away into the navy redesign chapter below.
// Driven continuously off scroll progress, so nothing flickers.
// ============================================================
(function setupGoalTransition() {
  var goalSection = document.querySelector(".goal");
  if (!goalSection || exportSection) {
    return;
  }

  var goalStage = goalSection.querySelector(".goal-stage");
  var goalMark = goalSection.querySelector(".goal-mark");
  var goalQ = goalSection.querySelector(".goal-q");

  function clamp01(t) {
    return t < 0 ? 0 : t > 1 ? 1 : t;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }
  function easeIn(t) {
    return t * t;
  }
  function mix(c1, c2, t) {
    return (
      "rgba(" +
      Math.round(lerp(c1[0], c2[0], t)) + "," +
      Math.round(lerp(c1[1], c2[1], t)) + "," +
      Math.round(lerp(c1[2], c2[2], t)) + "," +
      lerp(c1[3], c2[3], t).toFixed(3) + ")"
    );
  }

  var RED = [214, 56, 42, 0.18]; // thin faint red outline
  var NAVY = [34, 55, 106, 0.95]; // bold navy outline (#22376A)
  var CREAM = [250, 248, 243, 1];
  var NAVY_DEEP = [34, 55, 106, 1]; // #22376A
  var INK = [29, 28, 26, 1]; // question copy at rest
  var WHITE = [255, 255, 255, 1]; // question copy brightened on navy

  // Reduced-motion / no-stage fallback: just flip the navy chapter, no anim.
  if (reduceMotion || !goalStage) {
    var flip = function () {
      var rect = goalSection.getBoundingClientRect();
      document.body.classList.toggle(
        "goal-navy",
        rect.top + rect.height * 0.5 <= window.innerHeight * 0.5
      );
    };
    window.addEventListener("scroll", flip, { passive: true });
    window.addEventListener("resize", flip, { passive: true });
    flip();
    return;
  }

  var ticking = false;

  function render() {
    ticking = false;

    var rect = goalSection.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    var p = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;

    var pColor = clamp01(p / 0.42); // outline colour: red → navy
    var pThick = clamp01(p / 0.58); // outline keeps thickening as you scroll
    var pBg = clamp01((p - 0.45) / 0.16); // stage background: cream → navy fast (by ~p .61)
    var pText = clamp01((p - 0.5) / 0.07); // overlaid copy: ink → white (by ~p .57, onto the now-dark bg)
    var pFall = clamp01((p - 0.5) / 0.5); // outline falls + fades into the navy

    // HMW outline turns navy and grows steadily thicker
    var stroke = lerp(1.5, 7, pThick);
    goalMark.style.webkitTextStroke =
      stroke.toFixed(2) + "px " + mix(RED, NAVY, pColor);

    // …then it drops away and fades as the navy takes over
    var fall = lerp(0, window.innerHeight * 0.92, easeIn(pFall));
    goalMark.style.transform = "translate(-50%, calc(-50% + " + fall.toFixed(1) + "px))";
    goalMark.style.opacity = (1 - clamp01(pFall * 1.25)).toFixed(3);

    // stage background resolves cream → deep navy
    goalStage.style.backgroundColor = mix(CREAM, NAVY_DEEP, pBg);

    // the overlaid copy goes ink → white as the navy arrives. A pure colour
    // crossfade would pass through a mid-grey that's invisible on the mid-slate
    // background, so we also dip the opacity across the swap (a cross-dissolve):
    // the text briefly fades, hiding the muddy midpoint, then re-emerges white.
    // NOTE: a `.goal-q{color:var(--ink)!important}` rule exists, so the inline
    // colour must also be `!important` to win the cascade.
    if (goalQ) {
      goalQ.style.setProperty("color", mix(INK, WHITE, pText), "important");
      var dip = 4 * pText * (1 - pText); // 0 at the ends, 1 at the swap midpoint
      goalQ.style.opacity = (1 - 0.82 * dip).toFixed(3);
    }

    // navy redesign chapter — flipped while still off-screen, so no flicker
    document.body.classList.toggle("goal-navy", p >= 0.5);
  }

  function onScrollGoal() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }

  window.addEventListener("scroll", onScrollGoal, { passive: true });
  window.addEventListener("resize", onScrollGoal, { passive: true });
  render();
})();

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

function setupDeliverablesTicker() {
  var groups = Array.from(document.querySelectorAll(".deliverables"));

  if (!groups.length || reduceMotion || previewMode || exportSection) {
    return;
  }

  groups.forEach(function (group) {
    var rows = Array.from(group.querySelectorAll(".row"));

    if (!rows.length) {
      return;
    }

    var activeIndex = 0;
    var timer = null;

    function paint(index) {
      rows.forEach(function (row, rowIndex) {
        row.classList.toggle("is-active", rowIndex === index);
      });
    }

    function start() {
      if (timer) {
        return;
      }

      group.classList.add("is-animated");
      paint(activeIndex);

      timer = window.setInterval(function () {
        activeIndex = (activeIndex + 1) % rows.length;
        paint(activeIndex);
      }, 1650);
    }

    function stop() {
      if (timer) {
        window.clearInterval(timer);
        timer = null;
      }
    }

    paint(activeIndex);
    group.classList.add("is-animated");

    var tickerIO = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            start();
          } else {
            stop();
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -12% 0px" }
    );

    tickerIO.observe(group);

    window.setTimeout(function () {
      start();
    }, 500);
  });
}

setupDeliverablesTicker();
