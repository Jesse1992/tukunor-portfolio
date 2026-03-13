"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./view.module.css";

const IMAGE_IDS = [
  "1493246507139-91e8fad9978e",
  "1516035069371-29a1b244cc32",
  "1507643179173-39db30be83d3",
  "1519750783826-e2420f4d687f",
  "1494438639946-1ebd1d20bf85",
  "1500462918059-b1a0cb512f1d",
  "1486718448742-1643916ef44d",
  "1493514789931-5f7514745154",
  "1530099486328-e021101a494a",
  "1496747611176-843222e1e57c",
  "1491895200230-24e84424a737",
  "1520698115663-8a9d060f606e",
  "1449247709948-96350937c885",
  "1462331940187-285b04fb854f",
  "1464822759023-fed622ff2c3b",
] as const;

function getUnsplashUrl(id: string) {
  return `https://images.unsplash.com/photo-${id}?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80`;
}

export default function GalleryWaitlistView() {
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stripRef = useRef<HTMLDivElement | null>(null);
  const rafIdRef = useRef<number | null>(null);

  const draggingRef = useRef(false);
  const lastXRef = useRef(0);
  const currentScrollRef = useRef(0);
  const targetScrollRef = useRef(0);
  const velocityRef = useRef(0);

  const [overlayHidden, setOverlayHidden] = useState(false);

  const cards = useMemo(
    () =>
      IMAGE_IDS.map((id, index) => ({
        id,
        index,
        src: getUnsplashUrl(id),
      })),
    [],
  );

  useEffect(() => {
    const viewport = viewportRef.current;
    const strip = stripRef.current;
    if (!viewport || !strip) return;

    const cardWidth = 220;
    const autoScrollSpeed = 0.5;
    const totalSetWidth = IMAGE_IDS.length * cardWidth;

    const getCardEls = () =>
      Array.from(strip.querySelectorAll<HTMLElement>(`[data-card="1"]`));

    let cardEls = getCardEls();

    const animate = () => {
      if (!draggingRef.current) {
        targetScrollRef.current += velocityRef.current;
        velocityRef.current *= 0.95;
        targetScrollRef.current += autoScrollSpeed;
      }

      currentScrollRef.current +=
        (targetScrollRef.current - currentScrollRef.current) * 0.1;

      const w = window.innerWidth;

      for (const el of cardEls) {
        const index = Number(el.dataset.index || "0");

        let virtualIndex = index * cardWidth - currentScrollRef.current;
        while (virtualIndex < -totalSetWidth / 2) virtualIndex += totalSetWidth;
        while (virtualIndex > totalSetWidth / 2) virtualIndex -= totalSetWidth;

        if (Math.abs(virtualIndex) < w) {
          el.style.display = "block";

          const progress = virtualIndex / (w / 1.5);
          const x = virtualIndex;
          const z = -Math.pow(Math.abs(progress), 2) * 500;
          const rotateY = progress * 45;

          el.style.transform = `translateX(${x}px) translateZ(${z}px) rotateY(${rotateY}deg)`;
          el.style.opacity = String(1 - Math.pow(Math.abs(progress), 3));
        } else {
          el.style.display = "none";
        }
      }

      rafIdRef.current = window.requestAnimationFrame(animate);
    };

    const start = window.setTimeout(() => {
      setOverlayHidden(true);
      cardEls = getCardEls();
      rafIdRef.current = window.requestAnimationFrame(animate);
    }, 1000);

    const onPointerDown = (e: PointerEvent) => {
      draggingRef.current = true;
      lastXRef.current = e.clientX;
      velocityRef.current = 0;
      try {
        viewport.setPointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!draggingRef.current) return;
      const delta = e.clientX - lastXRef.current;
      lastXRef.current = e.clientX;
      targetScrollRef.current -= delta * 1.5;
      velocityRef.current = -delta * 0.5;
    };

    const onPointerUp = (e: PointerEvent) => {
      draggingRef.current = false;
      try {
        viewport.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    viewport.addEventListener("pointerdown", onPointerDown);
    viewport.addEventListener("pointermove", onPointerMove);
    viewport.addEventListener("pointerup", onPointerUp);
    viewport.addEventListener("pointercancel", onPointerUp);
    viewport.addEventListener("pointerleave", () => {
      draggingRef.current = false;
    });

    return () => {
      window.clearTimeout(start);
      viewport.removeEventListener("pointerdown", onPointerDown);
      viewport.removeEventListener("pointermove", onPointerMove);
      viewport.removeEventListener("pointerup", onPointerUp);
      viewport.removeEventListener("pointercancel", onPointerUp);
      if (rafIdRef.current != null) window.cancelAnimationFrame(rafIdRef.current);
    };
  }, []);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.brand}>LUMIÈRE ARCHIVE</div>
        <div className={styles.meta}>
          ISSUE 01
          <br />
          CURATED SELECTION
        </div>
      </header>

      <div className={styles.galleryViewport} ref={viewportRef}>
        <div className={styles.stripContainer} ref={stripRef}>
          {cards.map((c) => (
            <div
              key={c.id}
              className={styles.card}
              data-card="1"
              data-index={c.index}
            >
              <img src={c.src} alt="" draggable={false} />
            </div>
          ))}
        </div>
      </div>

      <div className={styles.waitlistContainer}>
        <span className={styles.waitlistLabel}>Request Access</span>
        <form
          className={styles.inputGroup}
          onSubmit={(e) => {
            e.preventDefault();
            alert("You have been added to the queue.");
          }}
        >
          <input type="email" placeholder="email address" required />
          <button type="submit" className={styles.submitBtn}>
            Join
          </button>
        </form>
      </div>

      <div
        className={styles.overlay}
        style={{ opacity: overlayHidden ? 0 : 1 }}
      >
        <div className={styles.loaderText}>INITIALIZING GALLERY...</div>
      </div>
    </div>
  );
}

