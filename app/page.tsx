"use client";

import { useEffect, useRef, useState } from "react";
import Lenis from "lenis";
import Mark from "./mark";
import {
  Stats,
  Services,
  Promise_,
  Logos,
  Partnership,
  Team,
  Contact,
  Office,
  Footer,
} from "./sections";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const seg = (p: number, a: number, b: number) => clamp01((p - a) / (b - a));

// Each plate is screen-sized and climbs into frame from entirely below the
// fold, tilted. The tilt unwinds as it rises, so it lands square and centred,
// covering the frame exactly — then the GRADED version of the same shot wipes
// upward over it, so the reveal reads as the room being relit rather than as a
// visual effect. One plate finishes as the next starts climbing.
const CARDS = [
  { src: "/l0.jpg", graded: "/l0_enhanced.jpg", rot: 12 },
  { src: "/l1.jpg", graded: "/l1_enhanced.png", rot: -9 },
  { src: "/l2.jpg", graded: "/l2_enhanced.png", rot: 14 },
];
// each card's own window, in normalised zoom units. Near-sequential: the gap
// between one card's mask finishing and the next tilting in is deliberate.
const WIN: [number, number][] = [
  [0.0, 0.34],
  [0.3, 0.64],
  [0.6, 0.94],
];
const TILT_TO = 0.46; // local t at which the plate lands square and centred
const MASK_FROM = 0.54; // 0.46 → 0.54 is the hold between the two stages
const MASK_TO = 0.94;

const CLAIM_FROM = 0.86; // the claim panel climbs once the plates are done
const CLAIM_ROT = -10; // it leans the other way to the plate before it

// How far below the fold a plate must start to be COMPLETELY out of frame.
// translateY(100%) is not enough: tilted by θ, a screen-sized plate has a
// vertical half-extent of (W/2)·sinθ + (H/2)·cosθ, which is greater than H/2 —
// so its lower corner still reaches back up into the viewport. That corner is
// what appeared out of nowhere the moment visibility flipped on. Returned as a
// % of plate height, with a 1.5% margin against rounding.
const startY = (rot: number, w: number, h: number) => {
  const r = (Math.abs(rot) * Math.PI) / 180;
  const halfExtent = (w / 2) * Math.sin(r) + (h / 2) * Math.cos(r);
  return ((h / 2 + halfExtent) / h) * 100 + 1.5;
};

// Where the content sits during each hold, and how it travels between them.
// ease-in-out-cubic. Expo-out — the curve Lenis uses for scroll damping — is
// far too front-loaded here: it burns half the rotation in the first 1% of the
// window, so the card is already near-square before you notice it was tilted,
// and then crawls through a long sub-1° tail. This spreads the motion evenly
// across the window, which is what makes the tilt readable.
const settleEase = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

// Cards start only once the curtain has fully parted (it lands at 0.20). The
// old full-bleed plates grew from a speck at the centre, so they stayed inside
// the red band while it opened; a fixed-size card doesn't, and overhangs onto
// the hero photo either side.
const ZOOM_FROM = 0.17;
const ZOOM_TO = 0.65; // leaves room after the zoom to hold, then split

const HOLD_TO = 0.72; // claim panel sits full-screen and still until here
const SPLIT_TO = 0.87; // then parts from the centre

// The intro owns a FIXED 800vh of scroll. The about passage is appended after
// it in raw pixels rather than carved out of it as a fraction, so the passage
// can run at exactly 1:1 without the two trading budget.
const INTRO_SPAN_VH = 8;

// Our own credentials — short serif label over an uppercase caption.
const CREDS: [string, string][] = [
  ["1 : 1", "One named contact from first viewing through to handover"],
  ["48 hrs", "Median time from enquiry to a shortlist built around your brief"],
  ["AED 1B", "Placed across residential and commercial mandates to date"],
];

export default function Page() {
  const [p, setP] = useState(0);
  const target = useRef(0);
  const current = useRef(0);
  const runway = useRef<HTMLDivElement>(null);
  // startY depends on the viewport, so the clearance is right on any aspect
  // ratio — a 21:9 screen needs ~123%, a phone in portrait only ~104%.
  const [vp, setVp] = useState({ w: 1440, h: 900 });
  const aboutInner = useRef<HTMLDivElement>(null);
  const [aboutTravel, setAboutTravel] = useState(0);
  const [scrolled, setScrolled] = useState(0);

  useEffect(() => {
    const onResize = () =>
      setVp({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // How far the content must rise for its last line to reach the top.
  // ResizeObserver rather than a one-off measure — the height isn't final until
  // the images have loaded, and it changes again on resize.
  useEffect(() => {
    const el = aboutInner.current;
    if (!el) return;
    const ro = new ResizeObserver(() =>
      setAboutTravel(Math.max(0, el.offsetHeight - window.innerHeight)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    // Lenis eases the actual scroll position. The lerp below only smoothed the
    // animation value, so the page itself still moved in raw wheel steps and
    // the whole sequence inherited that stutter.
    const lenis = new Lenis({
      duration: 1.35,
      // expo-out: takes the wheel impulse quickly, then settles for a long time
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      wheelMultiplier: 0.9,
      touchMultiplier: 1.6,
    });

    let frame = 0;
    const tick = (time: number) => {
      lenis.raf(time);
      // p is the RUNWAY's own progress, not the document's. Reading document
      // scroll stretched the sequence across the whole page, so everything past
      // p≈0.46 played after the sticky stage had already unstuck and scrolled
      // out of view — the section appeared to end mid-animation.
      const el = runway.current;
      if (el) {
        const y = Math.max(0, -el.getBoundingClientRect().top);
        // raw and unsmoothed — the about passage reads this directly
        setScrolled(y);
        // the intro keeps the lerp, normalised over its own fixed budget
        target.current = clamp01(y / (INTRO_SPAN_VH * window.innerHeight));
      }
      // a light lerp on top of Lenis: enough to round off the last of the
      // stepping without adding lag you can feel
      current.current += (target.current - current.current) * 0.14;
      if (Math.abs(target.current - current.current) < 0.00005)
        current.current = target.current;
      setP(current.current);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  const heroScale = 1.1 - 0.1 * seg(p, 0, 0.12);
  const curtain = seg(p, 0.07, 0.2);

  const z = seg(p, ZOOM_FROM, ZOOM_TO);

  const cards = CARDS.map((c, i) => {
    const t = seg(z, WIN[i][0], WIN[i][1]);
    const e = settleEase(clamp01(t / TILT_TO));
    return {
      // stage 1: tilt and rise resolve together, then hold at zero
      rot: c.rot * (1 - e),
      ty: startY(c.rot, vp.w, vp.h) * (1 - e),
      // stage 2: the inverted copy wipes up over the now-settled card
      mask: seg(t, MASK_FROM, MASK_TO),
      // the photo drifts inside its frame so the card reads as a window
      drift: (0.5 - clamp01(t)) * 5,
      // a card stays once started; the next covers it, then the claim panel does
      shown: z > WIN[i][0],
    };
  });

  // The claim panel climbs in exactly like the plates — same tilt, same rise,
  // no inverted pass — and then splits open from the centre as before.
  const claimE = settleEase(seg(z, CLAIM_FROM, 1));
  const claimRot = CLAIM_ROT * (1 - claimE);
  const claimTy = startY(CLAIM_ROT, vp.w, vp.h) * (1 - claimE);
  // The claim panel holds full-screen and dead still through HOLD_TO, then the
  // page parts from the centre — the same gesture as the opening curtain.
  const reveal = seg(p, HOLD_TO, SPLIT_TO);
  // Text trails the opening slightly so it emerges as the gap widens rather
  // than being there the instant the first sliver of white appears.
  const revealText = seg(p, HOLD_TO + 0.03, SPLIT_TO);
  const heroUi = 1 - seg(p, 0.05, 0.11);
  // The reference's about just scrolls: its content moves exactly 1px per 1px
  // of wheel, continuously, with no easing and no resting positions. Holding
  // the content still through a beat and then easing it to the next stop is
  // what read as snappy. Raw pixels, clamped, 1:1 — nothing else.
  const aboutY = Math.min(
    Math.max(0, scrolled - INTRO_SPAN_VH * vp.h),
    aboutTravel,
  );

  return (
    <>
    <div
      className="runway"
      ref={runway}
      // 900vh of intro + exactly as far as the about content has to travel
      style={{ height: `calc(${(INTRO_SPAN_VH + 1) * 100}vh + ${aboutTravel}px)` }}
    >
      <div className="stage">
        {/* hero */}
        <div className="layer" style={{ transform: `scale(${heroScale})` }}>
          <img src="/hero.jpg" alt="" />
        </div>
        <div className="layer" style={{ opacity: heroUi }}>
          <h1 className="heroTitle">
            Vesta — where lifestyle becomes legacy
          </h1>
          <div className="card">
            <p>Full-cycle real estate services</p>
            <ul>
              {["Buy", "Sell", "Rent", "Invest", "Relocate"].map((s) => (
                <li key={s}>
                  <span>{s}</span>
                  <span>↗</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* red curtain wipes open from the centre */}
        <div
          className="layer"
          style={{
            background: "var(--red)",
            transform: `scaleX(${curtain})`,
            transformOrigin: "50% 50%",
          }}
        />

        {/* each card tilts in, locks square, then its negative wipes up */}
        {CARDS.map((c, i) => (
          <div
            key={c.src}
            className="layer"
            style={{ visibility: cards[i].shown ? "visible" : "hidden" }}
          >
            <div
              className="plate"
              style={{
                // translate BEFORE rotate — the other order sends it up along
                // the rotated axis, so it drifts sideways as it climbs
                transform: `translateY(${cards[i].ty}%) rotate(${cards[i].rot}deg)`,
              }}
            >
              <img
                src={c.src}
                alt=""
                style={{
                  transform: `translate3d(0, ${cards[i].drift}%, 0) scale(1.16)`,
                }}
              />
              {/* the graded pass, uncovered from the bottom edge up */}
              <img
                src={c.graded}
                alt=""
                className="graded"
                style={{
                  transform: `translate3d(0, ${cards[i].drift}%, 0) scale(1.16)`,
                  clipPath: `inset(${100 - cards[i].mask * 100}% 0 0 0)`,
                }}
              />
            </div>
          </div>
        ))}

        {/* the claim panel closes the sequence */}
        <div
          className="layer"
          style={{
            transform: `translateY(${claimTy}%) rotate(${claimRot}deg)`,
            visibility: z > CLAIM_FROM ? "visible" : "hidden",
          }}
        >
          <div className="statement">
            <h2>
              We sell real estate that evokes emotions. We give a new sense of
              self
            </h2>
            <p className="fine">
              Vesta — full-cycle agency for buying, selling, renting
              and investing in premium residential and commercial property.
            </p>
          </div>
        </div>

        {/* about wipes open from the centre, same gesture as the curtain */}
        <div
          className="about layer"
          style={{ transform: `scaleX(${reveal})` }}
        >
          <div
            ref={aboutInner}
            className="aboutInner"
            style={{
              // counter-scale keeps the type undistorted while the panel opens;
              // .about clips it, so the content is uncovered from the centre
              // out. scaleX leaves the Y translation alone, so the two compose
              // safely in one transform.
              transform: `scaleX(${reveal ? 1 / reveal : 1}) translateY(${-aboutY}px)`,
              opacity: revealText,
            }}
          >
            <div className="aboutPara">
              <p>
                <sup>About</sup>
                Exclusive real estate agency specializing in luxury residential
                and commercial properties. seamlessly connecting buyers and
                sellers with premier investments tailored to <em>elegance</em>,
                comfort, and success.
              </p>
            </div>
            <div className="aboutGrid">
              {["/a1.jpg", "/a2.jpg"].map((src) => (
                <figure key={src}>
                  <img src={src} alt="" />
                </figure>
              ))}
            </div>
            <ul className="creds">
              {CREDS.map(([label, copy]) => (
                <li key={label}>
                  <span className="credLabel">{label}</span>
                  <p>{copy}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* chrome sits above everything and never moves */}
        <div className={`chrome${reveal > 0.5 ? " dark" : ""}`}>
          <span className="dot" />
          <div className="left">
            <span>(•) Navigation</span>
            <span>Ru</span>
          </div>
          <div className="right">Let&apos;s discuss ↗</div>
          <ul className="menu" style={{ opacity: heroUi }}>
            {[
              "Introduction",
              "About",
              "Cases",
              "Services",
              "Partnership",
              "Contact",
            ].map((item, i) => (
              <li key={item}>
                <span>[{i + 1}]</span>
                {item}
              </li>
            ))}
          </ul>
          <div className="tick">◦</div>
          <div className="markSm">
            <Mark />
          </div>
          <div className="markLg">
            <Mark />
          </div>
        </div>
      </div>
    </div>

    {/* everything past the pinned intro scrolls normally */}
    <main className="rest">
      <Stats />
      <Services />
      <Promise_ />
      <Logos />
      <Partnership />
      <Team />
      <Contact />
      <Office />
      <Footer />
    </main>
    </>
  );
}
