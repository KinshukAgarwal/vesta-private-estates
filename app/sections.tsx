"use client";

import { useEffect, useRef, useState } from "react";
import Mark from "./mark";

/* ---------------------------------------------------------------- helpers */

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

/** Scroll progress of an element through the viewport, 0 → 1. */
function useProgress<T extends HTMLElement>(pad = 0) {
  const ref = useRef<T>(null);
  const [p, setP] = useState(0);
  useEffect(() => {
    let frame = 0;
    const tick = () => {
      const el = ref.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const span = r.height + window.innerHeight * (1 - pad);
        setP(clamp01((window.innerHeight - r.top) / span));
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [pad]);
  return [ref, p] as const;
}

/** Reveals once, on entry — for type and static blocks. */
function useSeen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => e.isIntersecting && setSeen(true),
      { rootMargin: "-12% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, seen] as const;
}

/** Full-bleed photo that drifts against its frame as the section passes. */
function Parallax({
  src,
  className = "",
  amount = 9,
  scale = 1.18,
}: {
  src: string;
  className?: string;
  amount?: number;
  scale?: number;
}) {
  const [ref, p] = useProgress<HTMLDivElement>();
  return (
    <div ref={ref} className={`px ${className}`}>
      <img
        src={src}
        alt=""
        style={{
          transform: `translate3d(0,${(0.5 - p) * amount}%,0) scale(${scale})`,
        }}
      />
    </div>
  );
}

/* ------------------------------------------------------------- 04  stats */

// Three COLUMNS of two, not two SETS of three. Each column swaps inside its
// own scroll window and they fire in sequence — the reference gives each one
// its own ~500px of runway rather than cross-fading all three at once.
const COLS: { n: string; t: string }[][] = [
  [
    { n: "35+", t: "specialists across sales, research and aftercare" },
    { n: "6", t: "working languages on the client-facing desk" },
  ],
  [
    { n: "71%", t: "of clients return for a second or third purchase" },
    { n: "3", t: "ranked among the region's independent agencies" },
  ],
  [
    { n: "160m", t: "average monthly transaction volume" },
    { n: "38k", t: "investors reached through the syndication network" },
  ],
];
// All three columns finish, then every final value HOLDS, and only then does
// Cases begin to rise. Windows sit inside the pinned range (p 0.20 - 0.80):
// outside it the section is still entering or already leaving, so nothing can
// be held there. Previously Cases started rising at p 0.44, which put it over
// 40% of the screen while the last column was still swapping.
const COL_W: [number, number][] = [
  [0.23, 0.31],
  [0.33, 0.41],
  [0.43, 0.51],
];
const HOLD_END = 0.63; // all six final values sit still until here
const CASES_IN = 0.74; // Cases lands here, then holds until the pin releases

export function Stats() {
  const [ref, p] = useProgress<HTMLElement>();
  // the photo behind changes once, with the last column
  const set = p < 0.43 ? 0 : 1;
  const cols = COL_W.map(([a, b]) => clamp01((p - a) / (b - a)));
  const noteT = clamp01((p - 0.30) / 0.16);
  // Cases is nested INSIDE this section, not a section after it. It waits
  // fully below the fold through the whole swap-and-hold, then rides up and
  // stays put until the pin releases and the section carries it away.
  const casesY = (1 - clamp01((p - HOLD_END) / (CASES_IN - HOLD_END))) * 110;
  return (
    <section ref={ref} className="stats">
      <div className="statsPin">
        {["/s/wide2.jpg", "/s/wide1.jpg"].map((src, k) => (
          <img
            key={src}
            src={src}
            alt=""
            style={{
              transform: `translate3d(0,${(0.5 - p) * 10}%,0) scale(1.2)`,
              opacity: set === k ? 1 : 0,
            }}
          />
        ))}
        <div className="statsRow">
          {COLS.map((cell, i) => (
            <div key={i} className="stat">
              {/* numeral and caption each ride their own mask, in step */}
              <div className="statSlot">
                {cell.map((c, k) => (
                  <div
                    key={k}
                    className="statN"
                    style={{ transform: `translateY(${k * 100 - cols[i] * 100}%)` }}
                  >
                    {c.n}
                  </div>
                ))}
              </div>
              <div className="statCap">
                {cell.map((c, k) => (
                  <p
                    key={k}
                    style={{ transform: `translateY(${k * 100 - cols[i] * 100}%)` }}
                  >
                    {c.t}
                  </p>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="casesLayer" style={{ transform: `translateY(${casesY}vh)` }}>
          <Cases />
        </div>
        <div className="statsNote">
          {[0, 1].map((k) => (
            <p key={k} style={{ transform: `translateY(${k * 100 - noteT * 100}%)` }}>
              Built on the partnership of two operators who set one rule in the
              first week — an individual approach, no templates, and full
              involvement in every mandate taken on.
            </p>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------- 05  cases */

const CASES = [
  ["001", "Alvora Court", "Damaco"],
  ["002", "Pier Nineteen", "Luxe Developments"],
  ["003", "The Halden", "Nakheeli"],
  ["004", "Selva Residences", "Sixbrooke"],
  ["005", "Quay House", "Ostra"],
  ["006", "Fielder Row", "Kestrel"],
  ["007", "North Meridian", "Lumen Works"],
  ["008", "Casa Pinheiro", "Meridian Capital"],
];

export function Cases() {
  const [ref, seen] = useSeen<HTMLElement>();
  // Two rows of four with the title between them. The captions face inward —
  // below the images on the top row, above them on the bottom — so the block
  // reads as one spread centred on the heading.
  const row = (from: number, flip: boolean) => (
    <div className={`caseRow${flip ? " flip" : ""}`}>
      {CASES.slice(from, from + 4).map(([n, name, dev], i) => (
        <figure key={n} style={{ transitionDelay: `${i * 70}ms` }}>
          <div className="caseImg">
            <img src={`/s/c${from + i + 1}.jpg`} alt="" />
          </div>
          <figcaption>
            <span className="caseN">{n}</span>
            <b>{name}</b>
            <span className="dev">{dev}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
  return (
    <section ref={ref} id="cases" className={`cases${seen ? " in" : ""}`}>
      {row(0, false)}
      <h2>Our cases</h2>
      {row(4, true)}
    </section>
  );
}

/* ---------------------------------------------------------- 06  services */

const SERVICES = [
  {
    k: "Market insights",
    accent: "& property selection",
    body: "Desk research on supply, absorption and rental spread, written for the specific buildings under consideration rather than the city average.",
    img: "/s/v1.jpg",
  },
  {
    k: "Residency",
    accent: "& paperwork",
    body: "Identity registration, banking introductions and title transfer handled end to end, coordinated with counsel so nothing waits on a signature.",
    img: "/s/v2.jpg",
  },
  {
    k: "Private",
    accent: "shopping",
    body: "Off-market sourcing for larger mandates, including approaches to owners who have not listed and have no intention of listing publicly.",
    img: "/s/v3.jpg",
  },
];

export function Services() {
  const [ref, seen] = useSeen<HTMLElement>();
  const [i, setI] = useState(0);
  const s = SERVICES[i];
  return (
    <section ref={ref} id="services" className={`services${seen ? " in" : ""}`}>
      <div className="bar">Our services</div>
      <div className="svcBody">
        <div className="svcText">
          <h2>
            {s.k} <em>{s.accent}</em>
          </h2>
          {/* counter sits above the caption, controls sit under it */}
          <span className="count">{String(i + 1).padStart(2, "0")} / 03</span>
          <p>{s.body}</p>
          <div className="svcNav">
            <button onClick={() => setI((i + 2) % 3)} aria-label="Previous">
              ←
            </button>
            <button onClick={() => setI((i + 1) % 3)} aria-label="Next">
              →
            </button>
            <a className="svcCta" href="#contact">
              Let&apos;s discuss
            </a>
          </div>
        </div>
        <div className="svcImg">
          {SERVICES.map((v, k) => (
            <img key={v.img} src={v.img} alt="" style={{ opacity: k === i ? 1 : 0 }} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- 07  promise */

export function Promise_() {
  const [ref, seen] = useSeen<HTMLElement>();
  return (
    <section ref={ref} className={`promise${seen ? " in" : ""}`}>
      <Parallax src="/s/wide4.jpg" className="promiseBg" amount={11} />
      <h2>
        No commissions, first access,
        <br />
        and support that does not stop
      </h2>
      <div className="promiseCols">
        <div>
          <b>No commissions</b>
          <p>Our fee is paid by the developer, so buyers are never billed.</p>
        </div>
        <div>
          <b>Named principal</b>
          <p>One advisor carries the mandate end to end, not a call queue.</p>
        </div>
        <div>
          <b>First access</b>
          <p>Allocation on new releases before they reach the open market.</p>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ 08  logos */

const LOGOS = [
  "NORTHGATE", "AZURE", "HALDEN", "MERIDIAN", "OSTRA",
  "VANTAGE", "KESTREL", "LUMEN",
];

export function Logos() {
  return (
    <section className="logos">
      <div className="logoRow">
        {LOGOS.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------- 09  partnership */

export function Partnership() {
  const [ref, seen] = useSeen<HTMLElement>();
  return (
    <section ref={ref} id="partnership" className={`partner${seen ? " in" : ""}`}>
      <div className="partnerGrid">
        <div className="pCell">
          <div className="pBig">0</div>
          <p>transactions cancelled for non-payment</p>
        </div>
        <div className="pCell">
          <div className="pBig">32%</div>
          <p>of monthly revenue comes through the partner network</p>
        </div>
        <div className="pCell wide">
          <h3>
            Partnership <em>[net]</em>
          </h3>
          <p>
            The network is one of the pillars the practice rests on. Banks,
            developers, legal and design offices, relocation and travel
            operators — every client arrives pre-vetted, which removes the risk
            and shortens the time to completion.
          </p>
        </div>
      </div>
      <div className="partnerImg">
        <Parallax src="/s/wide3.jpg" amount={8} />
      </div>
    </section>
  );
}



/* -------------------------------------------------------------- 10  team */

// Stand-in imagery: architectural and lighting details in near-mono rather
// than stock portraits, so no real person is presented as staff of a fictional
// agency. Same card/name layout as the reference otherwise.
const TEAM: [string, string, string][] = [
  ["Ana Vasquez", "Managing Partner", "/s/t1.jpg"],
  ["Marcus Okonjo", "Head of Research", "/s/t2.jpg"],
  ["Lena Ferrer", "Principal Advisor", "/s/t3.jpg"],
  ["Rina Tanaka", "Head of Transactions", "/s/t4.jpg"],
];

export function Team() {
  const [ref, seen] = useSeen<HTMLElement>();
  const [i, setI] = useState(0);
  return (
    <section ref={ref} id="team" className={`team${seen ? " in" : ""}`}>
      <img className="teamGround" src="/s/stone.jpg" alt="" />
      <div className="teamInner">
        <div className="teamName">
          <h2>
            {TEAM[i][0].split(" ").map((w) => (
              <span key={w}>{w}</span>
            ))}
          </h2>
          <div className="teamNav">
            {TEAM.map((t, k) => (
              <button
                key={t[0]}
                onClick={() => setI(k)}
                className={k === i ? "on" : ""}
                aria-label={t[0]}
              >
                {String(k + 1).padStart(2, "0")}
              </button>
            ))}
          </div>
        </div>
        <div className="teamCard">
          {TEAM.map((t, k) => (
            <img key={t[2]} src={t[2]} alt="" style={{ opacity: k === i ? 1 : 0 }} />
          ))}
          <div className="teamRole">{TEAM[i][1]}</div>
        </div>
      </div>
    </section>
  );
}

/* ----------------------------------------------------------- 11  contact */

export function Contact() {
  const [ref, seen] = useSeen<HTMLElement>();
  return (
    <section ref={ref} id="contact" className={`contact${seen ? " in" : ""}`}>
      <h2>
        Ready to find
        <br />
        your dream home?
      </h2>
      <p className="cSub">
        Leave your details and an advisor will come back to you within one
        working day.
      </p>
      <form onSubmit={(e) => e.preventDefault()}>
        <label>
          <input placeholder="Type your name" />
        </label>
        <label>
          <input placeholder="Type your phone number" />
        </label>
        <label>
          <input placeholder="Type your message" />
        </label>
        <button type="submit">Send</button>
      </form>
      <p className="cFine">
        By submitting you agree to the processing of your personal data in line
        with our privacy policy.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------ 12  office */

export function Office() {
  const [ref, seen] = useSeen<HTMLElement>();
  return (
    <section ref={ref} className={`office${seen ? " in" : ""}`}>
      <Parallax src="/s/wide5.jpg" className="officeBg" amount={10} scale={1.22} />
      <div className="officeTop">Dubai · Business Bay</div>
      <div className="officeMain">
        <h2>
          Agency office in
          <br />
          Marasi Tower
        </h2>
        <a className="mapBtn" href="#">
          Show on map
        </a>
      </div>
      <p className="officeNote">
        The office is not only our address but also our showroom — a place where
        world-class ideas are created and every element surrounds clients with
        comfort.
      </p>
      <div className="officeStrip">
        {["/s/o1.jpg", "/s/o2.jpg", "/s/o3.jpg", "/s/o4.jpg"].map((s) => (
          <img key={s} src={s} alt="" />
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------ 13  footer */

const NAV = [
  "Introduction", "About", "Cases", "Services",
  "Partnership", "Contact",
];

export function Footer() {
  return (
    <footer className="foot">
      <div className="footTop">
        <ul>
          {NAV.map((n, i) => (
            <li key={n}>
              <span>[{i + 1}]</span>
              {n}
            </li>
          ))}
        </ul>
        <div className="footAddr">
          <div>
            <b>Dubai</b>
            <p>Marasi Drive, Business Bay</p>
            <p>+971 4 000 0000</p>
          </div>
          <div>
            <b>Bangkok</b>
            <p>Sukhumvit Road, Khlong Toei</p>
            <p>+66 2 000 0000</p>
          </div>
        </div>
      </div>
      <div className="footMark">
        <Mark />
      </div>
      <div className="footBase">
        <span>© {new Date().getFullYear()} Vesta Private Estates</span>
        <span>Privacy policy</span>
      </div>
    </footer>
  );
}
