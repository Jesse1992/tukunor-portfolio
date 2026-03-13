"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./sandro.module.css";

type Point = { x: number; y: number };
type Lang = "en" | "zh";

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
  lang,
}: {
  open: boolean;
  onClose: () => void;
  lang: Lang;
}) {
  const labels = lang === "zh" ? ["实验", "写作", "能力", "关于"] : ["Experiments", "Writing", "Capabilities", "About"];
  const closeLabel = lang === "zh" ? "关闭" : "Close";

  return (
    <div
      className={`${styles.navOverlay} ${open ? styles.navOverlayActive : ""}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className={styles.navContent}>
        {labels.map((label) => (
          <div key={label} className={styles.navItem}>
            {label}
          </div>
        ))}
        <div className={styles.navItem} onClick={onClose}>
          {closeLabel}
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

function AsciiCanvas({
  mouse,
  lang,
}: {
  mouse: React.MutableRefObject<Point>;
  lang: Lang;
}) {
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
        <ScrambleHeadline lang={lang} />
        <div className={styles.heroSubline}>
          {lang === "zh"
            ? "AI 产品架构与体验系统"
            : "AI Product Architecture & Experience System"}
        </div>
      </div>
    </div>
  );
}

function ScrambleHeadline({ lang }: { lang: Lang }) {
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
      {lang === "zh" ? (
        <>
          很高兴认识你，我是 Tukunor。
          <br />
          我用愉悦的设计，激发人们的灵感与行动。
        </>
      ) : (
        <>
          Nice to meet you, I&apos;m Tukunor.
          <br />
          I craft joyful designs that inspire people.
        </>
      )}
    </div>
  );
}

function ExperienceSection({ lang }: { lang: Lang }) {
  const experiences =
    lang === "zh"
      ? [
          {
            companyRole: "字节跳动 — Coze — 设计负责人",
            dateRange: "2024 年 9 月 – 至今",
            bullets: [
              "品牌视觉构建：主导 Coze 2.0 品牌升级，构建 “AI 原生、专业、富有动感” 的视觉语言，为 AI Bot 开发生态打造差异化品牌护城河。",
              "0→1 产品矩阵落地：负责 Coze Space、Coze Programming、Coze Compass 等核心模块的设计，搭建排期、分段交付、双日设计评审等敏捷机制，确保高复杂度 AI 业务的高保真落地与按期发布。",
              "设计团队建设：从 0 搭建设计团队，校准人力模型，搭建跨职能协作流程与设计系统规范，提升整体产出一致性。",
            ],
          },
          {
            companyRole: "字节跳动 — 豆包插件 — 产品设计师",
            dateRange: "2024 年 1 月 – 2024 年 9 月",
            bullets: [
              "多端一致体验：负责豆包插件在 PC / Mobile / iPad 的全端体验设计，确保不同物理场景间的无缝切换，为全球业务扩张提供一致体验支持。",
              "AI 交互创新：通过“预览卡片”“思维导图总结”等形态提升 AI 搜索体验，带来 30 日留存率提升 13.28%，AI 搜索预览卡渗透率达 60%。",
              "内容消费闭环：探索并落地“收藏”等能力，打通“搜索–沉淀”的长期价值链路，释放长期用户价值。",
            ],
          },
          {
            companyRole: "字节跳动 — 飞书 Base — 产品设计师",
            dateRange: "2022 年 2 月 – 2024 年 1 月",
            bullets: [
              "复杂架构重构：主导 Base 框架重设计，以模块化思维解决底层逻辑冗余，保障核心业务可扩展性，并获得高层认可。",
              "创意驱动增长：担任 “飞书玩家大会” 官网设计负责人，通过动态 Emoji 等交互形式，将首屏点击率提升至 32.21%，整体转化率提升 12.24%。",
              "组织效率提升：建立设计评审机制、OKR 模板与新人 Onboarding SOP，大幅缩短新人上手周期。",
            ],
          },
          {
            companyRole: "腾讯 — 交互设计师 / 增长设计",
            dateRange: "2017 年 2 月 – 2022 年 2 月",
            bullets: [
              "产品孵化：主导 NOKNOK、腾讯游戏社区、波动、QQ 动漫等多款社交 / 社群产品的 0→1 体验架构设计，以系统化玩法设计驱动用户粘性。",
              "跨部门协作：参与公司级设计协作工具 “Oteam” 的建设，推动多业务线资源共享与规范统一。",
              "增长设计负责人：组建包含产品负责人与数据专家在内的跨职能增长团队，缩短实验迭代周期，使设计更紧贴商业目标。",
              "团队发展：作为主面试官与导师，负责交互设计师的人才筛选与专业成长辅导。",
            ],
          },
        ]
      : [
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
              <div className={styles.experienceLabel}>
                {lang === "zh" ? "教育背景" : "Education"}
              </div>
              <div className={styles.companyRole}>
                {lang === "zh"
                  ? "南京师范大学（211）"
                  : "Nanjing Normal University (Project 211)"}
              </div>
              <div className={styles.dateRange}>
                {lang === "zh"
                  ? "2010 年 9 月 – 2014 年 6 月"
                  : "September 2010 – June 2014"}
              </div>
            </div>
            <div>
              <div className={styles.companyRole}>
                {lang === "zh"
                  ? "艺术设计学学士"
                  : "Bachelor of Arts in Art &amp; Design"}
              </div>
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
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("portfolio-lang");
    if (stored === "zh" || stored === "en") {
      setLang(stored);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("portfolio-lang", lang);
  }, [lang]);

  return (
    <div className={styles.page}>
      <div className={styles.langToggle}>
        <button
          type="button"
          className={`${styles.langButton} ${
            lang === "en" ? styles.langButtonActive : ""
          }`}
          onClick={() => setLang("en")}
        >
          EN
        </button>
        <button
          type="button"
          className={`${styles.langButton} ${
            lang === "zh" ? styles.langButtonActive : ""
          }`}
          onClick={() => setLang("zh")}
        >
          中
        </button>
      </div>
      <Cursor mouse={mouse} />
      <CornerTriggers onOpen={() => setOpen(true)} />
      <NavOverlay open={open} onClose={() => setOpen(false)} lang={lang} />

      <main>
        <section className={styles.firstScreen}>
          <AsciiCanvas mouse={mouse} lang={lang} />

          <div className={styles.panelZone}>
            <div className={styles.panelCol}>
              <div>
                <p
                  className={`${styles.bioText} ${bioHover ? styles.bioMonoHover : ""}`}
                  onMouseEnter={() => setBioHover(true)}
                  onMouseLeave={() => setBioHover(false)}
                >
                  {lang === "zh"
                    ? "聚焦 AI 原生平台的演进、复杂 SaaS 生态，以及高增长数字社群的构建。"
                    : "Focusing on the evolution of AI-native platforms, complex SaaS ecosystems, and high-growth digital communities."}
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
                  <span>
                    {lang === "zh"
                      ? "AI 原生设计与架构"
                      : "AI-Native Design & Architecture"}
                  </span>
                </li>
                <li>
                  <span>
                    {lang === "zh"
                      ? "端到端 B2C 体验"
                      : "End-to-End B2C Experience"}
                  </span>
                </li>
                <li>
                  <span>
                    {lang === "zh" ? "B2B 复杂系统" : "B2B Complex Systems"}
                  </span>
                </li>
                <li>
                  <span>
                    {lang === "zh"
                      ? "领导力与人才成长"
                      : "Leadership & Talent Growth"}
                  </span>
                </li>
                <li>
                  <span>{lang === "zh" ? "增长设计" : "Growth Design"}</span>
                </li>
              </ul>
              <div className={styles.colophon}>
                {lang === "zh"
                  ? "目前在字节跳动 Coze 定义 AI Bot 构建的未来；此前在飞书搭建多维系统，在腾讯构建社交生态。"
                  : "Currently defining the future of AI Bot building at Coze (ByteDance). Previously architecting multidimensional systems at Feishu and social ecosystems at Tencent."}
              </div>
            </div>
          </div>
        </section>

        <ExperienceSection lang={lang} />
      </main>
    </div>
  );
}

