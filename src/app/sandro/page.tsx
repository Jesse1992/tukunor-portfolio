"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./sandro.module.css";

type Point = { x: number; y: number };

function useRafLoop(callback: (t: number) => void, enabled = true) {
  const cbRef = useRef(callback);
  cbRef.current = callback;

  useEffect(() => {
    if (!enabled) return;
    let raf = 0;
    const loop = (t: number) => {
      cbRef.current(t);
      raf = window.requestAnimationFrame(loop);
    };
    raf = window.requestAnimationFrame(loop);
    return () => window.cancelAnimationFrame(raf);
  }, [enabled]);
}

class TextScramble {
  private el: HTMLElement;
  private chars = "!<>-_\\/[]{}—=+*^?#________";
  private frameRequest: number | null = null;
  private frame = 0;
  private queue: Array<{
    from: string;
    to: string;
    start: number;
    end: number;
    char?: string;
  }> = [];
  private resolve: (() => void) | null = null;

  constructor(el: HTMLElement) {
    this.el = el;
  }

  setText(newText: string) {
    const oldText = this.el.innerText;
    const length = Math.max(oldText.length, newText.length);
    const promise = new Promise<void>((resolve) => (this.resolve = resolve));

    this.queue = [];
    for (let i = 0; i < length; i++) {
      const from = oldText[i] || "";
      const to = newText[i] || "";
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      this.queue.push({ from, to, start, end });
    }

    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
    this.frame = 0;
    this.update();
    return promise;
  }

  private update = () => {
    let output = "";
    let complete = 0;
    for (let i = 0, n = this.queue.length; i < n; i++) {
      const item = this.queue[i];
      if (this.frame >= item.end) {
        complete++;
        output += item.to;
      } else if (this.frame >= item.start) {
        if (!item.char || Math.random() < 0.28) {
          item.char = this.randomChar();
        }
        output += `<span style="font-family: monospace; opacity: 0.5;">${item.char}</span>`;
      } else {
        output += item.from;
      }
    }
    this.el.innerHTML = output;
    if (complete === this.queue.length) {
      this.resolve?.();
    } else {
      this.frameRequest = requestAnimationFrame(this.update);
      this.frame++;
    }
  };

  private randomChar() {
    return this.chars[Math.floor(Math.random() * this.chars.length)];
  }

  destroy() {
    if (this.frameRequest) cancelAnimationFrame(this.frameRequest);
  }
}

function Cursor({ mouse }: { mouse: React.MutableRefObject<Point> }) {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const outlineRef = useRef<HTMLDivElement | null>(null);
  const outlinePos = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = e.clientX;
      mouse.current.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.left = `${e.clientX}px`;
        dotRef.current.style.top = `${e.clientY}px`;
      }
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mouse]);

  useRafLoop(() => {
    const dx = mouse.current.x - outlinePos.current.x;
    const dy = mouse.current.y - outlinePos.current.y;
    outlinePos.current.x += dx * 0.15;
    outlinePos.current.y += dy * 0.15;
    if (outlineRef.current) {
      outlineRef.current.style.left = `${outlinePos.current.x}px`;
      outlineRef.current.style.top = `${outlinePos.current.y}px`;
    }
  });

  return (
    <>
      <div ref={dotRef} className={styles.cursorDot} />
      <div ref={outlineRef} className={styles.cursorOutline} />
    </>
  );
}

function NavOverlay({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  return (
    <div
      className={`${styles.navOverlay} ${open ? styles.navOverlayActive : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.navContent}>
        {["Experiments", "Writing", "Capabilities", "About"].map((label) => (
          <div key={label} className={styles.navItem}>
            {label}
          </div>
        ))}
        <div className={styles.navItem} onClick={onClose}>
          Close
        </div>
      </div>
    </div>
  );
}

function CornerTriggers({ onOpen }: { onOpen: () => void }) {
  return (
    null
  );
}

function AsciiCanvas({ mouse }: { mouse: React.MutableRefObject<Point> }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const zoneRef = useRef<HTMLDivElement | null>(null);
  const sizeRef = useRef({ width: 0, height: 0, dpr: 1 });
  const timeRef = useRef(0);

  const densityChars = useMemo(
    () =>
      " .'`^,:;Il!i><~+_-?][}{1)(|\\/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const zone = zoneRef.current;
    if (!canvas || !zone) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const width = zone.clientWidth;
      const height = zone.clientHeight;
      const dpr = window.devicePixelRatio || 1;
      sizeRef.current = { width, height, dpr };
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const ro = new ResizeObserver(resize);
    ro.observe(zone);
    resize();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const zone = zoneRef.current;
    if (!canvas || !zone) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const charSize = 12;
    const simpleNoise = (x: number, y: number, t: number) =>
      Math.sin(x * 0.05 + t) * Math.cos(y * 0.05 + t) +
      Math.sin(x * 0.01 - t) * Math.cos(y * 0.12) * 0.5;

    let raf = 0;
    const render = () => {
      const { width, height } = sizeRef.current;
      if (width <= 0 || height <= 0) {
        raf = requestAnimationFrame(render);
        return;
      }

      ctx.clearRect(0, 0, width, height);
      ctx.font = `${charSize}px monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      const colsCount = Math.ceil(width / charSize);
      const rowsCount = Math.ceil(height / charSize);
      const rect = canvas.getBoundingClientRect();

      for (let y = 0; y < rowsCount; y++) {
        if (y < rowsCount * 0.4) continue;
        for (let x = 0; x < colsCount; x++) {
          const posX = x * charSize;
          const posY = y * charSize;

          const localMouseY = mouse.current.y - rect.top;
          const dx = posX - mouse.current.x;
          const dy = posY - localMouseY;
          const dist = Math.sqrt(dx * dx + dy * dy);

          const normalizedY = (rowsCount - y) / rowsCount;
          const noiseVal = simpleNoise(x, y, timeRef.current * 0.5);
          const mountainHeight =
            0.3 +
            Math.sin(x * 0.05 + timeRef.current * 0.1) * 0.1 +
            Math.cos(x * 0.2) * 0.05;

          let char = "";
          let alpha = 0;

          if (normalizedY < mountainHeight + noiseVal * 0.1) {
            const index = Math.floor(Math.abs(noiseVal) * densityChars.length);
            char = densityChars[index % densityChars.length] || "";
            alpha = 1 - normalizedY * 2;
          }

          if (dist < 150) {
            const lensStrength = 1 - dist / 150;
            if (Math.random() > 0.5) {
              char = Math.random() > 0.5 ? "0" : "1";
              ctx.fillStyle = `rgba(0, 0, 0, ${lensStrength})`;
            } else {
              ctx.fillStyle = `rgba(100, 100, 100, ${alpha})`;
            }

            const safeDist = dist || 1;
            const shiftX = (dx / safeDist) * 10 * lensStrength;
            const shiftY = (dy / safeDist) * 10 * lensStrength;
            ctx.fillText(
              char,
              posX + charSize / 2 - shiftX,
              posY + charSize / 2 - shiftY,
            );
          } else if (char) {
            ctx.fillStyle = `rgba(100, 100, 100, ${alpha})`;
            ctx.fillText(char, posX + charSize / 2, posY + charSize / 2);
          }
        }
      }

      timeRef.current += 0.01;
      raf = requestAnimationFrame(render);
    };

    raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [densityChars, mouse]);

  return (
    <div ref={zoneRef} className={styles.canvasZone}>
      <canvas ref={canvasRef} className={styles.asciiCanvas} />
      <div className={styles.heroText}>
        <ScrambleHeadline />
        <div className={styles.heroSubline}>
          AI Product Architecture &amp; Experience System
        </div>
      </div>
    </div>
  );
}

function ScrambleHeadline() {
  const elRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;
    const scrambler = new TextScramble(el);

    const original = el.innerText;
    const onEnter = () => void scrambler.setText(original);
    const onLeave = () => {
      window.setTimeout(() => void scrambler.setText(original), 200);
    };

    el.addEventListener("mouseenter", onEnter);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("mouseleave", onLeave);
      scrambler.destroy();
    };
  }, []);

  return (
    <div ref={elRef} className={`${styles.heroHeadline} ${styles.scrambleHover}`}>
      Nice to meet you, I&apos;m Tukunor.
      <br />
      I craft joyful designs that inspire people.
    </div>
  );
}

function ExperienceSection() {
  const experiences = [
    {
      companyRole: "ByteDance — Coze — Design Lead",
      dateRange: "September 2024 – Present",
      bullets: [
        'Brand Identity Construction: Spearheaded the Coze 2.0 brand upgrade, defining a visual language characterized as "AI-native, professional, and dynamic" to build a competitive barrier for the AI Bot development platform.',
        "0→1 Product Matrix Launch: Managed core modules including Coze Space, Coze Programming, and Coze Compass. Established agile iteration mechanisms (scheduling, segmented delivery, and bi-daily design reviews) to ensure high-fidelity execution and on-time launches for high-complexity AI businesses.",
        "Design Team Leadership: Built the design team from the ground up, calibrated manpower models, and established cross-functional collaboration workflows and design system standards to improve output consistency.",
      ],
    },
    {
      companyRole: "ByteDance — Doubao Extension — Product Designer",
      dateRange: "January 2024 – September 2024",
      bullets: [
        "Multi-Terminal Consistent Experience: Led the full-terminal design for the Doubao extension across PC, Mobile, and iPad, ensuring seamless transitions across physical scenarios and supporting global business expansion.",
        'AI Interaction Innovation: Enhanced AI search scenarios through "preview cards" and "mind map summaries," contributing to a 13.28% increase in 30-day retention and achieving a 60% penetration rate for AI search preview cards.',
        'Content Consumption Loop: Explored and implemented "Favorites" functionality to bridge the gap between "searching" and "saving," unlocking long-term user value.',
      ],
    },
    {
      companyRole: "ByteDance — Lark (Feishu) Base — Product Designer",
      dateRange: "February 2022 – January 2024",
      bullets: [
        "Complex Architecture Refactoring: Led the redesign of the Base framework, using modular thinking to solve underlying logical redundancies, which received high praise from senior leadership for ensuring core business scalability.",
        'Creativity-Driven Growth: Served as the Design Lead for the "Lark Player Conference" official website; achieved a 32.21% first-screen click-through rate and increased user conversion by 12.24% through innovative interactions like dynamic Emojis.',
        "Organizational Efficiency: Established design review flows, OKR management templates, and newcomer onboarding SOPs, significantly shortening the ramp-up period for new hires.",
      ],
    },
    {
      companyRole: "Tencent — UX Designer / Growth Design",
      dateRange: "February 2017 – February 2022",
      bullets: [
        "Product Incubation: Led the 0-to-1 experience architecture for multiple social and community products, including NOKNOK, Tencent Games Community, Bodong, and QQ Animation, driving user stickiness through systematic social gameplay.",
        'Cross-Departmental Collaboration: Participated in the construction of "Oteam," a company-wide design collaboration tool, to promote resource sharing and standard unification across business groups.',
        "Growth Design Lead: Formed a cross-functional growth team including product leads and data experts, reducing experimental iteration cycles and aligning design closely with commercial goals.",
        "Team Development: Acted as a primary interviewer and mentor, responsible for talent selection and professional growth guidance for interaction designers.",
      ],
    },
  ] as const;

  return (
    <section className={styles.experienceSection}>
      <div className={styles.experienceGrid}>
        <div className={styles.experienceList}>
          {experiences.map((exp) => (
            <div key={exp.companyRole} className={styles.experienceItemRow}>
              <div className={styles.roleBlock}>
                <div className={styles.companyRole}>{exp.companyRole}</div>
                <div className={styles.dateRange}>{exp.dateRange}</div>
              </div>
              <div className={styles.detailList}>
                {exp.bullets.map((b) => (
                  <div key={b} className={styles.detailItem}>
                    {b}
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className={styles.educationItem}>
            <div className={styles.roleBlock}>
              <div className={styles.experienceLabel}>Education</div>
              <div className={styles.companyRole}>
                Nanjing Normal University (Project 211)
              </div>
              <div className={styles.dateRange}>September 2010 – June 2014</div>
            </div>
            <div>
              <div className={styles.companyRole}>Bachelor of Arts in Art &amp; Design</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function SandroPage() {
  const mouse = useRef<Point>({ x: 0, y: 0 });
  const [open, setOpen] = useState(false);
  const [bioHover, setBioHover] = useState(false);

  return (
    <div className={styles.page}>
      <Cursor mouse={mouse} />
      <CornerTriggers onOpen={() => setOpen(true)} />
      <NavOverlay open={open} onClose={() => setOpen(false)} />

      <main>
        <section className={styles.firstScreen}>
          <AsciiCanvas mouse={mouse} />

          <div className={styles.panelZone}>
            <div className={styles.panelCol}>
              <div>
                <p
                  className={`${styles.bioText} ${bioHover ? styles.bioMonoHover : ""}`}
                  onMouseEnter={() => setBioHover(true)}
                  onMouseLeave={() => setBioHover(false)}
                >
                  Focusing on the evolution of AI-native platforms, complex SaaS
                  ecosystems, and high-growth digital communities.
                </p>
                <div className={styles.contact}>
                  <div>512574761@qq.com</div>
                  <div>13058018200</div>
                </div>
              </div>
            </div>

            <div className={styles.panelCol}>
              <ul className={styles.linkList}>
                <li>
                  <span>AI-Native Design &amp; Architecture</span>
                </li>
                <li>
                  <span>End-to-End B2C Experience</span>
                </li>
                <li>
                  <span>B2B Complex Systems</span>
                </li>
                <li>
                  <span>Leadership &amp; Talent Growth</span>
                </li>
                <li>
                  <span>Growth Design</span>
                </li>
              </ul>
              <div className={styles.colophon}>
                Currently defining the future of AI Bot building at Coze
                (ByteDance). Previously architecting multidimensional systems at
                Feishu and social ecosystems at Tencent.
              </div>
            </div>
          </div>
        </section>

        <ExperienceSection />
      </main>
    </div>
  );
}

