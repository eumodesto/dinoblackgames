const EXTRA_ICONS = {
  "chart-spline": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" overflow="visible" aria-hidden="true">
      <path data-part="axis" d="M3 3v16a2 2 0 0 0 2 2h16"/>
      <path data-part="spline" d="M7 16c.5-2 1.5-7 4-7 2 0 2 3 4 3 2.5 0 4.5-5 5-7"/>
    </svg>`,
  connect: `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" overflow="visible" aria-hidden="true">
      <path data-part="line-top" d="M19 5l3 -3"/>
      <path data-part="line-bottom" d="m2 22 3-3"/>
      <path data-part="socket" d="M6.3 20.3a2.4 2.4 0 0 0 3.4 0L12 18l-6-6-2.3 2.3a2.4 2.4 0 0 0 0 3.4Z"/>
      <path data-part="pin-a" d="M7.5 13.5l2.5 -2.5"/>
      <path data-part="pin-b" d="M10.5 16.5l2.5 -2.5"/>
      <path data-part="plug" d="m12 6 6 6 2.3-2.3a2.4 2.4 0 0 0 0-3.4l-2.6-2.6a2.4 2.4 0 0 0-3.4 0Z"/>
    </svg>`,
  "badge-percent": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" overflow="visible" aria-hidden="true">
      <path data-part="body" data-i="0" d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z"/>
      <path data-part="slash" data-i="2" d="m15 9-6 6"/>
      <path data-part="dot" data-i="0" d="M9 9h.01" style="transform-box:view-box;transform-origin:9px 9px"/>
      <path data-part="dot" data-i="1" d="M15 15h.01" style="transform-box:view-box;transform-origin:15px 15px"/>
    </svg>`,
  "hand-coins": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" overflow="visible" aria-hidden="true">
      <path data-part="hand" d="M11 15h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 17"/>
      <path data-part="hand" d="m7 21 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/>
      <path data-part="hand" d="m2 16 6 6"/>
      <circle data-part="coin" cx="16" cy="9" r="2.9"/>
      <circle data-part="coin" cx="6" cy="5" r="3"/>
    </svg>`,
  "shopping-bag": `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" overflow="visible" aria-hidden="true">
      <g data-part="bag" style="transform-box:view-box;transform-origin:12px 22px">
        <path data-part="handle" d="M16 10a4 4 0 0 1-8 0" style="transform-box:view-box;transform-origin:12px 11px"/>
        <path d="M3.103 6.034h17.794"/>
        <path d="M3.4 5.467a2 2 0 0 0-.4 1.2V20a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6.667a2 2 0 0 0-.4-1.2l-2-2.667A2 2 0 0 0 17 2H7a2 2 0 0 0-1.6.8z"/>
      </g>
    </svg>`
};

const SPRING = "cubic-bezier(0.22, 1.4, 0.36, 1)";
const EXPO = "cubic-bezier(0.16, 1, 0.3, 1)";
const POP = "cubic-bezier(0.34, 1.4, 0.64, 1)";
const SMOOTH = "cubic-bezier(0.22, 1, 0.36, 1)";

function pathLength(el) {
  try {
    return el.getTotalLength();
  } catch {
    return 48;
  }
}

function prepareStroke(el) {
  const length = pathLength(el);
  el.style.strokeDasharray = String(length);
  el.style.strokeDashoffset = "0";
  return length;
}

function animate(el, keyframes, options) {
  return el.animate(keyframes, { fill: "forwards", ...options });
}

function resetStroke(el) {
  const length = pathLength(el);
  el.style.strokeDasharray = String(length);
  el.style.strokeDashoffset = "0";
  el.style.opacity = "1";
}

const players = new WeakMap();

function stopAll(host) {
  const list = players.get(host) || [];
  list.forEach((player) => player.cancel());
  players.set(host, []);
}

function play(host, list) {
  stopAll(host);
  players.set(host, list.filter(Boolean));
}

function animateChartSpline(svg, host) {
  const axis = svg.querySelector('[data-part="axis"]');
  const spline = svg.querySelector('[data-part="spline"]');
  const axisLen = prepareStroke(axis);
  const splineLen = prepareStroke(spline);
  play(host, [
    animate(axis, [{ strokeDashoffset: axisLen }, { strokeDashoffset: 0 }], {
      duration: 400,
      easing: "ease-out"
    }),
    animate(
      spline,
      [
        { strokeDashoffset: splineLen, opacity: 0 },
        { strokeDashoffset: 0, opacity: 1 }
      ],
      { duration: 800, delay: 300, easing: EXPO }
    )
  ]);
}

function resetChartSpline(svg) {
  resetStroke(svg.querySelector('[data-part="axis"]'));
  resetStroke(svg.querySelector('[data-part="spline"]'));
}

function animateConnect(svg, host) {
  const lineTop = svg.querySelector('[data-part="line-top"]');
  const lineBottom = svg.querySelector('[data-part="line-bottom"]');
  const socket = svg.querySelector('[data-part="socket"]');
  const plug = svg.querySelector('[data-part="plug"]');
  const pinA = svg.querySelector('[data-part="pin-a"]');
  const pinB = svg.querySelector('[data-part="pin-b"]');
  const spring = { duration: 420, easing: SPRING };
  play(host, [
    animate(lineTop, [{ d: 'path("M19 5 L22 2")' }, { d: 'path("M17 7 L22 2")' }], spring),
    animate(lineBottom, [{ d: 'path("M2 22 L5 19")' }, { d: 'path("M2 22 L8 16")' }], spring),
    animate(socket, [{ transform: "translate(0px, 0px)" }, { transform: "translate(3px, -3px)" }], spring),
    animate(plug, [{ transform: "translate(0px, 0px)" }, { transform: "translate(-3px, 3px)" }], spring),
    animate(pinA, [{ d: 'path("M7.5 13.5 L10 11")' }, { d: 'path("M10.43 10.57 L10.53 10.47")' }], spring),
    animate(pinB, [{ d: 'path("M10.5 16.5 L13 14")' }, { d: 'path("M13.43 13.57 L13.53 13.47")' }], spring)
  ]);
}

function resetConnect(svg) {
  const lineTop = svg.querySelector('[data-part="line-top"]');
  const lineBottom = svg.querySelector('[data-part="line-bottom"]');
  const socket = svg.querySelector('[data-part="socket"]');
  const plug = svg.querySelector('[data-part="plug"]');
  const pinA = svg.querySelector('[data-part="pin-a"]');
  const pinB = svg.querySelector('[data-part="pin-b"]');
  lineTop.setAttribute("d", "M19 5l3 -3");
  lineBottom.setAttribute("d", "m2 22 3-3");
  pinA.setAttribute("d", "M7.5 13.5l2.5 -2.5");
  pinB.setAttribute("d", "M10.5 16.5l2.5 -2.5");
  [lineTop, lineBottom, socket, plug, pinA, pinB].forEach((el) => {
    el.style.transform = "none";
    el.style.d = "";
  });
}

function animateBadgePercent(svg, host) {
  const body = svg.querySelector('[data-part="body"]');
  const slash = svg.querySelector('[data-part="slash"]');
  const dots = [...svg.querySelectorAll('[data-part="dot"]')];
  const bodyLen = prepareStroke(body);
  const slashLen = prepareStroke(slash);
  const list = [
    animate(
      body,
      [
        { strokeDashoffset: bodyLen, opacity: 0 },
        { strokeDashoffset: 0, opacity: 1 }
      ],
      { duration: 500, delay: 0, easing: EXPO }
    ),
    animate(
      slash,
      [
        { strokeDashoffset: slashLen, opacity: 0 },
        { strokeDashoffset: 0, opacity: 1 }
      ],
      { duration: 500, delay: 160, easing: EXPO }
    )
  ];
  dots.forEach((dot, i) => {
    list.push(
      animate(
        dot,
        [
          { transform: "scale(0)", opacity: 0, offset: 0 },
          { transform: "scale(1.18)", opacity: 1, offset: 0.6 },
          { transform: "scale(1)", opacity: 1, offset: 1 }
        ],
        { duration: 400, delay: 450 + i * 80, easing: POP }
      )
    );
  });
  play(host, list);
}

function resetBadgePercent(svg) {
  resetStroke(svg.querySelector('[data-part="body"]'));
  resetStroke(svg.querySelector('[data-part="slash"]'));
  svg.querySelectorAll('[data-part="dot"]').forEach((dot) => {
    dot.style.opacity = "1";
    dot.style.transform = "none";
  });
}

function animateHandCoins(svg, host) {
  const hands = [...svg.querySelectorAll('[data-part="hand"]')];
  const coins = [...svg.querySelectorAll('[data-part="coin"]')];
  const list = [
    animate(
      svg,
      [
        { transform: "scale(1) rotate(0deg)" },
        { transform: "scale(1.06) rotate(-2deg)", offset: 0.33 },
        { transform: "scale(0.98) rotate(1deg)", offset: 0.66 },
        { transform: "scale(1) rotate(0deg)" }
      ],
      { duration: 900, easing: SMOOTH }
    )
  ];
  coins.forEach((coin) => {
    coin.style.transformBox = "fill-box";
    coin.style.transformOrigin = "center";
    list.push(
      animate(
        coin,
        [
          { transform: "translateY(-6px) scale(0.7)", opacity: 0 },
          { transform: "translateY(0px) scale(1.02)", opacity: 1, offset: 0.72 },
          { transform: "translateY(0px) scale(1)", opacity: 1 }
        ],
        { duration: 600, delay: 100, easing: "ease-out" }
      )
    );
  });
  hands.forEach((hand) => {
    const length = prepareStroke(hand);
    list.push(
      animate(
        hand,
        [
          { strokeDashoffset: length, opacity: 0.5, transform: "translateY(2px)" },
          { strokeDashoffset: 0, opacity: 1, transform: "translateY(0px)" }
        ],
        { duration: 900, delay: 200, easing: "ease-in-out" }
      )
    );
  });
  play(host, list);
}

function resetHandCoins(svg) {
  svg.style.transform = "none";
  svg.querySelectorAll('[data-part="hand"]').forEach(resetStroke);
  svg.querySelectorAll('[data-part="coin"]').forEach((coin) => {
    coin.style.opacity = "1";
    coin.style.transform = "none";
  });
}

function animateShoppingBag(svg, host) {
  const bag = svg.querySelector('[data-part="bag"]');
  const handle = svg.querySelector('[data-part="handle"]');
  play(host, [
    animate(
      bag,
      [
        { transform: "translateY(0px) scale(1, 1)", offset: 0 },
        { transform: "translateY(-6px) scale(1, 1)", offset: 0.4 },
        { transform: "translateY(0px) scale(1.12, 0.86)", offset: 0.55 },
        { transform: "translateY(0px) scale(0.97, 1.05)", offset: 0.78 },
        { transform: "translateY(0px) scale(1, 1)", offset: 1 }
      ],
      { duration: 700, easing: "ease-out" }
    ),
    animate(
      handle,
      [
        { transform: "scale(0.4)", opacity: 0, offset: 0 },
        { transform: "scale(1.2)", opacity: 1, offset: 0.6 },
        { transform: "scale(1)", opacity: 1, offset: 1 }
      ],
      { duration: 350, delay: 294, easing: "ease-out" }
    )
  ]);
}

function resetShoppingBag(svg) {
  const bag = svg.querySelector('[data-part="bag"]');
  const handle = svg.querySelector('[data-part="handle"]');
  bag.style.transform = "none";
  handle.style.transform = "none";
  handle.style.opacity = "1";
}

const ANIMATORS = {
  "chart-spline": { start: animateChartSpline, stop: resetChartSpline },
  connect: { start: animateConnect, stop: resetConnect },
  "badge-percent": { start: animateBadgePercent, stop: resetBadgePercent },
  "hand-coins": { start: animateHandCoins, stop: resetHandCoins },
  "shopping-bag": { start: animateShoppingBag, stop: resetShoppingBag }
};

function mount(host) {
  const name = host.dataset.animatedIcon || "";
  const markup = EXTRA_ICONS[name];
  const animator = ANIMATORS[name];
  if (!markup || !animator || host.dataset.extraIconReady === "true") return;

  host.innerHTML = `<span class="animated-icon">${markup.trim()}</span>`;
  const svg = host.querySelector("svg");
  const summary = host.closest("summary");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  host.dataset.extraIconReady = "true";

  if (!summary || !svg) return;

  const start = () => {
    if (reduced) return;
    stopAll(host);
    animator.start(svg, host);
  };
  const stop = () => {
    stopAll(host);
    animator.stop(svg);
  };
  const blur = (event) => {
    if (!summary.contains(event.relatedTarget)) stop();
  };

  summary.addEventListener("mouseenter", start);
  summary.addEventListener("mouseleave", stop);
  summary.addEventListener("focusin", start);
  summary.addEventListener("focusout", blur);

  host._extraCleanup = () => {
    stop();
    summary.removeEventListener("mouseenter", start);
    summary.removeEventListener("mouseleave", stop);
    summary.removeEventListener("focusin", start);
    summary.removeEventListener("focusout", blur);
    delete host.dataset.extraIconReady;
  };

  if (!reduced && (summary.matches(":hover") || summary.contains(document.activeElement))) {
    start();
  }
}

function sync() {
  const root = document.getElementById("navContainer");
  if (!root) return;
  root.querySelectorAll("[data-animated-icon]").forEach((host) => {
    if (!host.isConnected && host._extraCleanup) host._extraCleanup();
    mount(host);
  });
}

const nav = document.getElementById("navContainer");
if (nav) {
  sync();
  new MutationObserver(sync).observe(nav, { childList: true });
}
