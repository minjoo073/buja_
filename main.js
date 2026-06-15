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

  // Responsive mode: no global zoom — CSS handles all widths natively.
  void scale;
  document.documentElement.style.setProperty("--portfolio-scale", "1");
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

// ============================================================
// Beyond → "From Design to Proposal" chapter transition.
// Direct mirror of setupGoalTransition: same 200vh sticky stage,
// same outline thickens-then-falls behaviour, same text crossfade.
// The only differences are the two colour pivots that get flipped:
//   stage bg : navy → cream  (Goal does cream → navy)
//   copy     : white → ink   (Goal does ink → white)
// We also keep beyondSection's bg in lockstep with the stage so
// any narrow gap left by body's zoom-scaled width is invisible.
// ============================================================
(function setupBeyondTransition() {
  var beyondSection = document.querySelector(".beyond");
  if (!beyondSection || exportSection) {
    return;
  }

  var beyondStage = beyondSection.querySelector(".beyond-stage");
  var beyondMark = beyondSection.querySelector(".beyond-mark");
  var beyondQ = beyondSection.querySelector(".goal-q");

  function clamp01(t) { return t < 0 ? 0 : t > 1 ? 1 : t; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeIn(t) { return t * t; }
  function mix(c1, c2, t) {
    return (
      "rgba(" +
      Math.round(lerp(c1[0], c2[0], t)) + "," +
      Math.round(lerp(c1[1], c2[1], t)) + "," +
      Math.round(lerp(c1[2], c2[2], t)) + "," +
      lerp(c1[3], c2[3], t).toFixed(3) + ")"
    );
  }

  var RED = [214, 56, 42, 0.45];        // faint red outline (start) — bumped vs Goal's 0.18 so it's visible on navy
  var NAVY = [34, 55, 106, 0.95];       // bold navy outline (#22376A)
  var NAVY_DEEP = [12, 24, 48, 1];      // stage start (#0c1830)
  var CREAM = [250, 248, 243, 1];       // stage end (matches Sales Proposal cream)
  var WHITE = [255, 255, 255, 1];       // copy on navy
  var INK = [29, 28, 26, 1];            // copy on cream

  if (reduceMotion || !beyondStage) {
    return;
  }

  var ticking = false;
  var body = document.body;

  function render() {
    ticking = false;

    var rect = beyondSection.getBoundingClientRect();
    var scrollable = rect.height - window.innerHeight;
    var p = scrollable > 0 ? clamp01(-rect.top / scrollable) : 0;

    // Exact same curves as setupGoalTransition.
    var pColor = clamp01(p / 0.42); // outline colour: red → navy
    var pThick = clamp01(p / 0.58); // outline keeps thickening
    var pBg = clamp01((p - 0.45) / 0.16); // stage bg: navy → cream
    var pText = clamp01((p - 0.5) / 0.07); // copy: white → ink
    var pFall = clamp01((p - 0.5) / 0.5); // outline falls + fades

    var stroke = lerp(1.5, 7, pThick);
    beyondMark.style.webkitTextStroke =
      stroke.toFixed(2) + "px " + mix(RED, NAVY, pColor);

    var fall = lerp(0, window.innerHeight * 0.92, easeIn(pFall));
    beyondMark.style.transform =
      "translate(-50%, calc(-50% + " + fall.toFixed(1) + "px))";
    beyondMark.style.opacity = (1 - clamp01(pFall * 1.25)).toFixed(3);

    // Stage and section share the same interpolated bg colour so no
    // frame leaks out even when the body's zoom-scaled width prevents
    // the stage from painting edge-to-edge.
    var bg = mix(NAVY_DEEP, CREAM, pBg);
    beyondStage.style.backgroundColor = bg;
    beyondSection.style.backgroundColor = bg;

    if (beyondQ) {
      // copy goes white → ink — flipped from Goal's ink → white
      beyondQ.style.setProperty("color", mix(WHITE, INK, pText), "important");
      var dip = 4 * pText * (1 - pText);
      beyondQ.style.opacity = (1 - 0.82 * dip).toFixed(3);
    }

    // Flip the proposal chapter to cream once past the bg midpoint so
    // it matches the stage end colour as the sticky pin releases.
    body.classList.toggle("beyond-cream", p >= 0.5);
  }

  function onScrollBeyond() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }

  window.addEventListener("scroll", onScrollBeyond, { passive: true });
  window.addEventListener("resize", onScrollBeyond, { passive: true });
  render();
})();

// ============================================================
// Behind the Process — scroll-driven timeline.
//   Anchored at 42% from the viewport top: as the user scrolls,
//   the red fill of the vertical line grows to that point, the
//   phase whose node is nearest the anchor goes .is-active
//   (dot enlarges + halo), and any phase whose dot is above the
//   anchor goes .is-past (red filled dot, no halo).
// ============================================================
(function setupBehindTimeline() {
  var timeline = document.querySelector(
    '[data-screen-label="Behind the Process"] .timeline'
  );
  if (!timeline || exportSection) {
    return;
  }
  var phases = Array.prototype.slice.call(
    timeline.querySelectorAll(".tphase")
  );
  if (!phases.length) {
    return;
  }
  var lesson = document.querySelector(
    '[data-screen-label="Behind the Process"] .lesson'
  );

  // Where on the line does a phase's dot sit, relative to the .tphase top?
  function dotOffset(phaseEl) {
    return phaseEl === phases[0] ? 22 : 78; // matches the CSS top values
  }

  var ticking = false;

  function render() {
    ticking = false;
    var tRect = timeline.getBoundingClientRect();
    var anchor = window.innerHeight * 0.6;

    // Filled height from the very top of the line down to the anchor,
    // clamped to the line's actual length so it doesn't overshoot.
    var filled = Math.max(0, Math.min(tRect.height, anchor - tRect.top));
    timeline.style.setProperty("--timeline-progress", filled + "px");

    phases.forEach(function (phase, i) {
      var pRect = phase.getBoundingClientRect();
      var dotY = pRect.top + dotOffset(phase);
      var nextPhase = phases[i + 1];
      var nextDotY = nextPhase
        ? nextPhase.getBoundingClientRect().top + dotOffset(nextPhase)
        : Infinity;

      // .is-past: this phase's dot is above the anchor AND the next
      // phase's dot has also reached the anchor (so it stays "past"
      // even when the next is now active).
      var past = dotY < anchor && nextDotY <= anchor;
      // .is-active: this phase's dot is the current/most-recent above
      // anchor (or just touched it).
      var active = !past && dotY <= anchor + 1;

      phase.classList.toggle("is-past", past);
      phase.classList.toggle("is-active", active);
    });

    // Reveal the "What I Took Away" lesson box when ITS OWN dot
    // reaches the anchor — not when the last phase's dot does. This
    // way the lesson appears AFTER PHASE 03 (the user has to scroll
    // further past PHASE 03 before the takeaway pops in). Once
    // visible, also force the timeline's red fill to its full height
    // so it meets the lesson's bridge line cleanly.
    if (lesson) {
      var lessonRect = lesson.getBoundingClientRect();
      var lessonDotY = lessonRect.top + 10; // matches .lesson::after top
      var lessonVisible = lessonDotY <= anchor;
      lesson.classList.toggle("is-visible", lessonVisible);
      if (lessonVisible) {
        timeline.style.setProperty("--timeline-progress", tRect.height + "px");
      }
    }
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }

  if (!reduceMotion) {
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
  }
  render();

  // Phase text reveal is driven by the SAME scroll anchor as the dot
  // fill (.is-active / .is-past). With anchor at 60% the dots light
  // up early enough that PHASE 01 turns red — and its text appears
  // — the moment the section header is at the top of the viewport.
  if (reduceMotion) {
    phases.forEach(function (phase) { phase.classList.add("is-revealed"); });
    if (lesson) lesson.classList.add("is-visible");
  }
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

// ============================================================
// Section 07 — Redesign Home annotation lines draw-in.
// Adds .is-drawn to .rh-stage when 20% of it enters viewport;
// the dashed connectors scale from right to left with a stagger
// driven by CSS transition-delay.
// ============================================================
(function setupRhDrawIn() {
  var stage = document.querySelector("#redesign-home .rh-stage");
  if (!stage || exportSection) {
    return;
  }
  var annos = stage.querySelectorAll(".rh-a");
  if (!annos.length) {
    return;
  }
  if (reduceMotion) {
    Array.prototype.forEach.call(annos, function (a) {
      a.classList.add("is-shown");
    });
    return;
  }
  // Each annotation reveals its text + dashed line together, the
  // moment it enters the viewport — so all four (incl. the lower
  // ones) get the same draw-in motion as the user scrolls past.
  var annoIO = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-shown");
        annoIO.unobserve(entry.target);
      }
    });
  }, { threshold: 0.45 });
  Array.prototype.forEach.call(annos, function (anno) {
    annoIO.observe(anno);
  });
})();

// ============================================================
// Section 13.5 — Mockup full-bleed parallax.
// The img is scaled up 1.12x via CSS; here we translate it on
// scroll so it drifts at ~30% of the page scroll speed,
// giving the full-bleed mockup a cinematic depth.
// ============================================================
(function setupMockupParallax() {
  var section = document.querySelector(".mockup-full");
  if (!section || exportSection || reduceMotion) {
    return;
  }
  var img = section.querySelector("img");
  if (!img) {
    return;
  }

  var ticking = false;

  function render() {
    ticking = false;
    var rect = section.getBoundingClientRect();
    var vh = window.innerHeight;
    // progress: -1 when section is below viewport, +1 when above.
    var sectionMid = rect.top + rect.height / 2;
    var viewportMid = vh / 2;
    var distance = sectionMid - viewportMid;
    var maxDistance = (rect.height + vh) / 2;
    var progress = Math.max(-1, Math.min(1, distance / maxDistance));
    // 8% of section height of vertical drift either way (scale 1.12
    // gives us 12% of overscan to work with on each axis).
    var offset = progress * rect.height * 0.08;
    img.style.transform =
      "translate3d(0," + (-offset).toFixed(2) + "px,0) scale(1.12)";
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(render);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  render();
})();

// ============================================================
// GSAP + Lenis enhancement layer
// ============================================================
window.addEventListener("load", function () {
  if (typeof gsap === "undefined" || exportSection) {
    return;
  }
  if (typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }

  // ---------- 1. Lenis smooth scroll + ticker sync ----------
  var lenis = null;
  if (typeof Lenis !== "undefined" && !reduceMotion) {
    lenis = new Lenis({
      duration: 1.15,
      easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
      smoothWheel: true,
      smoothTouch: false,
      wheelMultiplier: 1,
      touchMultiplier: 1.2,
    });
    if (typeof ScrollTrigger !== "undefined") {
      lenis.on("scroll", ScrollTrigger.update);
    }
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);
  }

  // ---------- 2. Top progress bar ----------
  var progressEl = document.getElementById("progress");
  if (progressEl) {
    function updateProgress() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var st = window.scrollY || document.documentElement.scrollTop;
      progressEl.style.width = (h > 0 ? (st / h) * 100 : 0) + "%";
    }
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    updateProgress();
  }

  // ---------- helper: split element into char spans ----------
  function splitChars(el) {
    if (!el) return [];
    var nodes = Array.prototype.slice.call(el.childNodes);
    var chars = [];
    el.innerHTML = "";
    nodes.forEach(function (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        var text = node.textContent;
        for (var i = 0; i < text.length; i++) {
          var ch = text[i];
          if (ch === " ") {
            el.appendChild(document.createTextNode(" "));
          } else {
            var span = document.createElement("span");
            span.className = "gsap-char";
            span.textContent = ch;
            el.appendChild(span);
            chars.push(span);
          }
        }
      } else {
        el.appendChild(node);
        // also push existing inline children for animation
        if (node.nodeType === Node.ELEMENT_NODE) {
          chars.push(node);
        }
      }
    });
    return chars;
  }

  // ---------- 3. Hero intro reveal + image tilt ----------
  (function setupHeroIntro() {
    if (!reduceMotion) {
      var heroEls = document.querySelectorAll(
        ".hero-v2-brand, .hero-v2-title, .hero-v2-desc, .hero-v2-rule, .hero-v2-meta, .hero-v2-right"
      );
      if (heroEls.length) {
        gsap.from(heroEls, {
          y: 36,
          opacity: 0,
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.12,
          delay: 0.1,
        });
      }
    }
    // Mousemove tilt on hero shots
    if (!reduceMotion) {
      var shots = document.querySelectorAll(".hero-v2-shot");
      shots.forEach(function (shot) {
        shot.addEventListener("mousemove", function (e) {
          var rect = shot.getBoundingClientRect();
          var x = (e.clientX - rect.left) / rect.width - 0.5;
          var y = (e.clientY - rect.top) / rect.height - 0.5;
          gsap.to(shot, {
            rotateY: x * 6,
            rotateX: -y * 6,
            scale: 1.02,
            duration: 0.4,
            ease: "power2.out",
            transformPerspective: 800,
          });
        });
        shot.addEventListener("mouseleave", function () {
          gsap.to(shot, {
            rotateY: 0,
            rotateX: 0,
            scale: 1,
            duration: 0.5,
            ease: "power2.out",
          });
        });
      });
    }
  })();

  if (typeof ScrollTrigger === "undefined") {
    return;
  }

  // ---------- 4. Diagnosis callouts sequential pulse ----------
  (function setupDiagCallouts() {
    var callouts = document.querySelectorAll(".diag-callout");
    if (!callouts.length || reduceMotion) return;
    ScrollTrigger.create({
      trigger: ".diag-shot-wrap",
      start: "top 70%",
      once: true,
      onEnter: function () {
        Array.prototype.forEach.call(callouts, function (c, i) {
          setTimeout(function () { c.classList.add("is-pulsed"); }, i * 220);
        });
      },
    });
  })();

  // ---------- 5. Strategy AS-IS → TO-BE staggered reveal ----------
  (function setupStrategy() {
    var cols = document.querySelectorAll(".sf-col");
    if (!cols.length || reduceMotion) return;
    cols.forEach(function (col, i) {
      var asPill = col.querySelector(".sf-as");
      var arrow = col.querySelector(".sf-arrow");
      var toPill = col.querySelector(".sf-to");
      if (!asPill || !toPill) return;
      gsap.set([asPill, arrow, toPill], { opacity: 0 });
      gsap.set(asPill, { y: 24 });
      gsap.set(toPill, { y: -24 });
      gsap.set(arrow, { scale: 0.4, rotate: -90 });
      var tl = gsap.timeline({
        scrollTrigger: {
          trigger: col,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
        defaults: { ease: "power3.out" },
      });
      tl.to(asPill, { y: 0, opacity: 1, duration: 0.55 })
        .to(arrow, { scale: 1, rotate: 0, opacity: 1, duration: 0.45 }, "-=0.2")
        .to(toPill, { y: 0, opacity: 1, duration: 0.55 }, "-=0.15");
    });
  })();

  // ---------- 6. Style Guide swatches + type stagger ----------
  (function setupStyleGuide() {
    if (reduceMotion) return;
    var sg = document.querySelector('[data-screen-label="Style Guide"]');
    if (!sg) return;
    var swatches = sg.querySelectorAll(".sg2-sw");
    var typeRows = sg.querySelectorAll(".sg2-trow");
    if (swatches.length) {
      gsap.from(swatches, {
        y: 30,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.08,
        scrollTrigger: { trigger: sg, start: "top 75%", once: true },
      });
    }
    if (typeRows.length) {
      gsap.from(typeRows, {
        x: -20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        stagger: 0.1,
        scrollTrigger: { trigger: sg, start: "top 70%", once: true },
      });
    }
  })();

  // ---------- 7. Pages — native sticky horizontal pan ----------
  //   .pages-pan-wrap is 260vh tall; .pages-pan-stage is
  //   position:sticky;top:0;height:100vh inside it. As the user
  //   scrolls through wrap, the stage stays glued to the top and we
  //   translate the strip horizontally based on sticky progress.
  //   The first 85% of scroll pans through the cards, the last 15%
  //   holds the final card so the user has a beat to take it in.
  //   No GSAP pin → no scroll hijacking, plays clean with Lenis.
  (function setupPagesPan() {
    var wrap = document.querySelector(".pages-pan-wrap");
    var stage = document.querySelector(".pages-pan-stage");
    var strip = document.querySelector(".pages-pan-stage .pagestrip");
    if (!wrap || !stage || !strip) return;
    if (window.innerWidth < 980 || reduceMotion) {
      strip.style.transform = "none";
      return;
    }
    function distance() {
      return Math.max(0, strip.scrollWidth - window.innerWidth + 60);
    }
    var ticking = false;
    function render() {
      ticking = false;
      var rect = wrap.getBoundingClientRect();
      var vh = window.innerHeight;
      var scrollable = rect.height - vh;
      if (scrollable <= 0) {
        strip.style.transform = "translate3d(0,0,0)";
        return;
      }
      var scrolled = Math.max(0, -rect.top);
      var rawP = Math.min(1, scrolled / scrollable);
      // Pan over first 85% of scroll, hold the last 15%.
      var p = Math.min(1, rawP / 0.85);
      var x = -distance() * p;
      strip.style.transform = "translate3d(" + x.toFixed(2) + "px,0,0)";
    }
    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(render);
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    render();
  })();

  // ---------- 8. Outcome reflect items staggered reveal ----------
  (function setupOutcome() {
    if (reduceMotion) return;
    var items = document.querySelectorAll('[data-screen-label="Outcome"] .ritem');
    if (!items.length) return;
    gsap.from(items, {
      y: 50,
      opacity: 0,
      rotateX: 8,
      duration: 0.75,
      ease: "power3.out",
      stagger: 0.12,
      transformPerspective: 800,
      scrollTrigger: {
        trigger: '[data-screen-label="Outcome"] .reflect',
        start: "top 75%",
        once: true,
      },
    });
  })();

  // ---------- 9. Closing THANK YOU split-text finale ----------
  (function setupClosingFinale() {
    if (reduceMotion) return;
    var kicker = document.querySelector(".closing .kicker");
    var big = document.querySelector(".closing .big");
    if (kicker) {
      var kcChars = splitChars(kicker);
      gsap.set(kcChars, { y: 18, opacity: 0 });
      ScrollTrigger.create({
        trigger: kicker,
        start: "top 80%",
        once: true,
        onEnter: function () {
          gsap.to(kcChars, {
            y: 0,
            opacity: 1,
            duration: 0.6,
            ease: "power3.out",
            stagger: 0.04,
          });
        },
      });
    }
    if (big) {
      var bigChars = splitChars(big);
      gsap.set(bigChars, { y: 40, opacity: 0 });
      ScrollTrigger.create({
        trigger: big,
        start: "top 80%",
        once: true,
        onEnter: function () {
          gsap.to(bigChars, {
            y: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power3.out",
            stagger: 0.025,
            delay: 0.15,
          });
        },
      });
    }
  })();

  // ---------- 10. Skill chips bouncy stagger on phase reveal ----------
  (function setupSkillChips() {
    if (reduceMotion) return;
    var phases = document.querySelectorAll(
      '[data-screen-label="Behind the Process"] .tphase'
    );
    phases.forEach(function (phase) {
      var chips = phase.querySelectorAll(".sk-chips .chip");
      if (!chips.length) return;
      gsap.set(chips, { scale: 0.7, opacity: 0 });
      ScrollTrigger.create({
        trigger: phase,
        start: "top 65%",
        once: true,
        onEnter: function () {
          gsap.to(chips, {
            scale: 1,
            opacity: 1,
            duration: 0.55,
            ease: "back.out(2)",
            stagger: 0.07,
          });
        },
      });
    });
  })();

  // ---------- 12. Magnetic cursor ----------
  (function setupMagneticCursor() {
    if (reduceMotion) return;
    if (window.matchMedia("(hover:none)").matches) return;
    var cursor = document.createElement("div");
    cursor.className = "mag-cursor";
    document.body.appendChild(cursor);
    var cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    var tx = cx, ty = cy;
    window.addEventListener("mousemove", function (e) {
      tx = e.clientX;
      ty = e.clientY;
    });
    gsap.ticker.add(function () {
      cx += (tx - cx) * 0.18;
      cy += (ty - cy) * 0.18;
      cursor.style.transform = "translate(" + (cx - 6) + "px," + (cy - 6) + "px)";
    });
    var hoverables = "a, button, .pull, .goal-q, .h-xl, .hero-v2-shot, .chip, .diag-quote, .red-ink, .hl, .competitive-finding, .lesson .pull";
    document.addEventListener("mouseover", function (e) {
      if (e.target.closest(hoverables)) cursor.classList.add("is-active");
    });
    document.addEventListener("mouseout", function (e) {
      if (e.target.closest(hoverables)) cursor.classList.remove("is-active");
    });
  })();

  // Final refresh once everything's been registered
  ScrollTrigger.refresh();
});

