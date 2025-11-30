// src/App.jsx
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import gsap from "gsap";
import profileImg from "./assets/me.png";

/* ============== INTRO OVERLAY (Three.js) ============== */

function Intro({ onDone }) {
  const containerRef = useRef(null);
  const [isHiding, setIsHiding] = useState(false);

  useEffect(() => {
    const mountEl = containerRef.current;
    if (!mountEl) return;

    let scene, camera, renderer, particles;
    const COUNT = 12000;
    let currentState = "sphere";
    let introActive = true;

    let isTextParticle = new Array(COUNT).fill(false);
    let textBasePositions = new Float32Array(COUNT * 3);
    let extraBasePositions = new Float32Array(COUNT * 3);
    let textMotionReady = false;
    let frameId;

    function initThree() {
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
      );
      camera.position.z = 25;

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(window.devicePixelRatio || 1);
      renderer.setClearColor(0x000000);
      mountEl.appendChild(renderer.domElement);

      createParticles();
      window.addEventListener("resize", onResize);

      setTimeout(() => {
        if (introActive) morphToText("VKR");
      }, 5000);

      animate();
    }

    function onResize() {
      if (!camera || !renderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function createParticles() {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(COUNT * 3);
      const colors = new Float32Array(COUNT * 3);

      const spherePoint = (i) => {
        const phi = Math.acos(-1 + (2 * i) / COUNT);
        const theta = Math.sqrt(COUNT * Math.PI) * phi;

        return {
          x: 8 * Math.cos(theta) * Math.sin(phi),
          y: 8 * Math.sin(theta) * Math.sin(phi),
          z: 8 * Math.cos(phi),
        };
      };

      for (let i = 0; i < COUNT; i++) {
        const p = spherePoint(i);

        positions[i * 3] = p.x + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 1] = p.y + (Math.random() - 0.5) * 0.5;
        positions[i * 3 + 2] = p.z + (Math.random() - 0.5) * 0.5;

        const color = new THREE.Color();
        const depth = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z) / 8;
        color.setHSL(0.64 + depth * 0.15, 0.7, 0.45 + depth * 0.25);

        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
      }

      geometry.setAttribute(
        "position",
        new THREE.BufferAttribute(positions, 3)
      );
      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

      const material = new THREE.PointsMaterial({
        size: 0.08,
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        opacity: 0.9,
        sizeAttenuation: true,
      });

      particles = new THREE.Points(geometry, material);
      scene.add(particles);
    }

    function createTextPoints(text) {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const fontSize = 120;
      const padding = 30;

      ctx.font = `bold ${fontSize}px Inter`;
      const m = ctx.measureText(text);
      const textWidth = m.width;
      const textHeight = fontSize;

      canvas.width = textWidth + padding * 2;
      canvas.height = textHeight + padding * 2;

      ctx.fillStyle = "white";
      ctx.font = `bold ${fontSize}px Inter`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(text, canvas.width / 2, canvas.height / 2);

      const img = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const points = [];
      const threshold = 150;

      for (let i = 0; i < img.length; i += 4) {
        if (img[i + 3] > threshold && Math.random() < 0.55) {
          const x = (i / 4) % canvas.width;
          const y = Math.floor(i / 4 / canvas.width);
          points.push({
            x: (x - canvas.width / 2) / (fontSize / 10),
            y: -(y - canvas.height / 2) / (fontSize / 10),
          });
        }
      }
      return points;
    }

    function morphToText(text) {
      currentState = "text";
      textMotionReady = false;

      const textPoints = createTextPoints(text);
      const positions = particles.geometry.attributes.position.array;
      const target = new Float32Array(COUNT * 3);

      isTextParticle.fill(false);

      gsap.to(particles.rotation, {
        x: 0,
        y: 0,
        z: 0,
        duration: 0.8,
        ease: "power2.out",
      });

      for (let i = 0; i < COUNT; i++) {
        if (i < textPoints.length) {
          const p = textPoints[i];
          target[i * 3] = p.x;
          target[i * 3 + 1] = p.y;
          target[i * 3 + 2] = 0;
          isTextParticle[i] = true;
        } else {
          const base = textPoints[i % textPoints.length];
          const spread = 12;
          target[i * 3] = base.x + (Math.random() - 0.5) * spread;
          target[i * 3 + 1] = base.y + (Math.random() - 0.5) * spread;
          target[i * 3 + 2] = (Math.random() - 0.5) * 8;
          isTextParticle[i] = false;
        }
      }

      for (let i = 0; i < positions.length; i += 3) {
        gsap.to(positions, {
          [i]: target[i],
          [i + 1]: target[i + 1],
          [i + 2]: target[i + 2],
          duration: 2,
          ease: "power2.inOut",
          onUpdate: () => {
            particles.geometry.attributes.position.needsUpdate = true;
          },
        });
      }

      setTimeout(() => {
        const pos = particles.geometry.attributes.position.array;
        for (let i = 0; i < COUNT; i++) {
          const idx = i * 3;
          if (isTextParticle[i]) {
            textBasePositions[idx] = pos[idx];
            textBasePositions[idx + 1] = pos[idx + 1];
            textBasePositions[idx + 2] = pos[idx + 2];
          } else {
            extraBasePositions[idx] = pos[idx];
            extraBasePositions[idx + 1] = pos[idx + 1];
            extraBasePositions[idx + 2] = pos[idx + 2];
          }
        }
        textMotionReady = true;
      }, 2100);
    }

    function animate() {
      frameId = requestAnimationFrame(animate);

      if (currentState === "sphere" && particles) {
        particles.rotation.y += 0.002;
        particles.rotation.x += 0.001;
      }

      if (currentState === "text" && textMotionReady && particles) {
        const posAttr = particles.geometry.attributes.position;
        const positions = posAttr.array;
        const t = performance.now() * 0.001;
        const wobble = 0.4;

        for (let i = 0; i < COUNT; i++) {
          const idx = i * 3;

          if (isTextParticle[i]) {
            positions[idx] = textBasePositions[idx];
            positions[idx + 1] = textBasePositions[idx + 1];
            positions[idx + 2] = textBasePositions[idx + 2];
          } else {
            const bx = extraBasePositions[idx];
            const by = extraBasePositions[idx + 1];
            const bz = extraBasePositions[idx + 2];

            const angle = t * 0.6 + i * 0.15;

            positions[idx] =
              bx * Math.cos(0.08 * t) + Math.sin(angle) * wobble;
            positions[idx + 1] =
              by * Math.cos(0.08 * t) + Math.cos(angle) * wobble;
            positions[idx + 2] = bz * Math.cos(0.04 * t);
          }
        }
        posAttr.needsUpdate = true;
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
    }

    initThree();

    return () => {
      introActive = false;
      window.removeEventListener("resize", onResize);
      if (frameId) cancelAnimationFrame(frameId);
      if (renderer) {
        renderer.dispose();
        if (mountEl.contains(renderer.domElement)) {
          mountEl.removeChild(renderer.domElement);
        }
      }
    };
  }, []);

  const handleExit = () => {
    if (isHiding) return;
    setIsHiding(true);
    setTimeout(() => {
      onDone?.();
    }, 700);
  };

  return (
    <div
      className={`fixed inset-0 z-50 bg-gradient-to-b from-slate-900 via-slate-950 to-black transition-opacity duration-700 ${
        isHiding ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      onClick={handleExit}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") handleExit();
      }}
      tabIndex={0}
    >
      <div ref={containerRef} className="w-full h-full" />
      <div className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 text-center text-xs md:text-sm tracking-[0.18em] text-slate-300 uppercase">
        Click to enter
      </div>
    </div>
  );
}

/* ============== NAVBAR + THEME TOGGLE ============== */

function ThemeToggle({ isLight, onToggle }) {
  const sliderStyle = {
    width: "calc(50% - 3px)",
    transform: isLight ? "translateX(100%)" : "translateX(0)",
    background: isLight
      ? "radial-gradient(circle at 30% 20%, #fef9c3, #fbbf24)"
      : "radial-gradient(circle at 30% 20%, #0f172a, #020617)",
    boxShadow: isLight
      ? "0 0 12px rgba(250, 204, 21, 0.8)"
      : "0 0 10px rgba(15, 23, 42, 0.9)",
  };

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label="Toggle theme"
      className={`relative inline-flex items-center justify-between w-[60px] h-[26px] rounded-full border text-[13px] leading-none select-none overflow-hidden transition-colors duration-300 ${
        isLight
          ? "border-slate-400 bg-gradient-to-br from-sky-100 to-slate-50 shadow-[0_0_0_1px_rgba(148,163,184,0.25)]"
          : "border-slate-500/80 bg-gradient-to-br from-slate-900 to-slate-950"
      }`}
    >
      <div
        className="absolute inset-[2px] rounded-full transition-transform duration-300 ease-out"
        style={sliderStyle}
      />
      <span
        className={`relative flex-1 text-center transition-opacity duration-200 ${
          isLight ? "opacity-50" : "opacity-100"
        }`}
      >
        🌙
      </span>
      <span
        className={`relative flex-1 text-center transition-opacity duration-200 ${
          isLight ? "opacity-100" : "opacity-60"
        }`}
      >
        ☀️
      </span>
    </button>
  );
}

function Navbar({ isLight, onToggleTheme }) {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const links = [
    { id: "about", label: "About" },
    { id: "experience", label: "Experience" },
    { id: "services", label: "Services" },
    { id: "projects", label: "Projects" },
    { id: "skills", label: "Skills" },
    { id: "contact", label: "Contact" },
  ];

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY - 80;
    window.scrollTo({ top: y, behavior: "smooth" });
  };

  const scrolledClass = isLight
    ? "bg-white/90 backdrop-blur border-b border-slate-200"
    : "bg-slate-900/90 backdrop-blur border-b border-slate-800";
  const topClass = isLight ? "bg-white/80" : "bg-transparent";

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all ${
        isScrolled ? scrolledClass : topClass
      }`}
    >
      <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-2 sm:px-3 lg:px-4 py-3">
        <div className="text-lg font-semibold tracking-tight">
          Vamshi<span className="text-sky-400">.dev</span>
        </div>

        <div className="flex items-center gap-4">
          <ul className="hidden gap-6 text-sm font-medium text-slate-300 md:flex">
            {links.map((link) => (
              <li key={link.id}>
                <button
                  onClick={() => scrollTo(link.id)}
                  className={`hover:text-sky-400 transition-colors ${
                    isLight ? "text-slate-700" : "text-slate-300"
                  }`}
                >
                  {link.label}
                </button>
              </li>
            ))}
          </ul>

          <ThemeToggle isLight={isLight} onToggle={onToggleTheme} />
        </div>
      </nav>
    </header>
  );
}

/* ============== GENERIC SECTION (fade in) ============== */

function Section({ id, title, children }) {
  const ref = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.15,
        rootMargin: "0px 0px -10% 0px",
      }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const animBase =
    "transition-all duration-700 ease-out transform flex flex-col gap-4";
  const animState = isVisible
    ? "opacity-100 translate-y-0"
    : "opacity-0 translate-y-6";

  return (
    <section
      id={id}
      ref={ref}
      className="mx-auto w-full max-w-7xl px-2 sm:px-3 lg:px-4 py-20 md:py-24"
    >
      <div className={`${animBase} ${animState}`}>
        <h2 className="text-3xl font-bold tracking-tight text-slate-50">
          {title}
        </h2>
        <div className="h-1 w-16 rounded-full bg-sky-500" />
        <div className="text-slate-300 text-sm md:text-base">{children}</div>
      </div>
    </section>
  );
}

/* ============== SMALL REUSABLE PIECES ============== */

function SkillIcon({ label, className = "", style }) {
  return (
    <div
      className={
        "flex items-center justify-center h-10 w-10 md:h-11 md:w-11 rounded-full " +
        "bg-slate-900/90 border border-cyan-400/70 shadow-[0_0_18px_rgba(34,211,238,0.8)] " +
        "text-[10px] md:text-xs font-semibold text-cyan-50 backdrop-blur-sm " +
        className
      }
      style={style}
    >
      {label}
    </div>
  );
}

function SkillCard({ name, level }) {
  const baseCard =
    "relative flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-xs md:text-sm transition duration-200 ease-out transform hover:-translate-y-0.5 hover:border-sky-400/80 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)]";

  let dotClass = "bg-sky-400";
  let levelLabel = "Beginner";
  let levelTextClass = "text-sky-300";

  if (level === "expert") {
    dotClass = "bg-emerald-400";
    levelLabel = "Expert";
    levelTextClass = "text-emerald-300";
  } else if (level === "intermediate") {
    dotClass = "bg-amber-400";
    levelLabel = "Intermediate";
    levelTextClass = "text-amber-300";
  }

  return (
    <div className={baseCard}>
      <span
        className={`absolute right-3 top-3 h-2 w-2 rounded-full ${dotClass}`}
      />
      <div>
        <div className="font-medium text-slate-100">{name}</div>
      </div>
      <div className={`mt-2 text-[11px] font-semibold ${levelTextClass}`}>
        {levelLabel}
      </div>
    </div>
  );
}

/* soft skills rotating carousel */
function SoftSkillsCarousel({ skills }) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    if (!skills || skills.length === 0) return;
    const id = setInterval(() => {
      setOffset((prev) => (prev + 1) % skills.length);
    }, 2000);
    return () => clearInterval(id);
  }, [skills]);

  const visibleCount = Math.min(5, skills.length);
  const rotated = Array.from({ length: visibleCount }, (_, idx) => {
    const index = (idx + offset) % skills.length;
    return skills[index];
  });

  return (
    <div className="mt-10 border-t border-slate-800 pt-6">
      <h3 className="text-center text-base md:text-lg font-semibold text-slate-100">
        Soft skills
      </h3>

      <div
        key={offset}
        className="mt-4 flex flex-wrap justify-center gap-8 animate-soft-rotate"
      >
        {rotated.map((skill, idx) => (
          <div
            key={skill.label + idx}
            className="inline-flex items-center gap-2 text-sm md:text-base text-slate-100"
          >
            <span className="text-lg md:text-xl">{skill.icon}</span>
            <span className="font-medium">{skill.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ============== HERO WITH SKILLS ORBIT ============== */

function SkillsOrbit() {
  const innerRef = useRef(null);
  const outerRef = useRef(null);

  useEffect(() => {
    const innerSkillsData = [
      { src: "/icons/react.svg", alt: "React" },
      { src: "/icons/docker.svg", alt: "Docker" },
      { src: "/icons/javascript.svg", alt: "JavaScript" },
      { src: "/icons/node.svg", alt: "Node.js" },
      { src: "/icons/spring.svg", alt: "Spring" },
      { src: "/icons/mysql.svg", alt: "MySQL" },
    ];

    const outerSkillsData = [
      { src: "/icons/aws.svg", alt: "AWS" },
      { src: "/icons/kubernets.svg", alt: "Kubernets" },
      { src: "/icons/mongodb.svg", alt: "MongoDB" },
      { src: "/icons/linux.svg", alt: "Linux" },
      { src: "/icons/github.svg", alt: "GitHub" },
      { src: "/icons/snowflake.svg", alt: "SnowFlake" },
      { src: "/icons/java.svg", alt: "Java" },
      { src: "/icons/python.svg", alt: "Python" },
      { src: "/icons/postgresql.svg", alt: "PostgreSQL" },
      { src: "/icons/powerbi.svg", alt: "PowerBi" },
    ];

    const createDots = (skills, circleEl, extraClass) => {
      if (!circleEl) return;

      circleEl.innerHTML = "";

      const radius = circleEl.offsetWidth / 2;
      const center = radius;
      const step = 360 / skills.length;

      skills.forEach((skill, index) => {
        const angle = step * index;
        const rad = (angle * Math.PI) / 180;

        const x = center + radius * Math.cos(rad);
        const y = center + radius * Math.sin(rad);

        const dot = document.createElement("div");
        dot.className = `skills-dot ${extraClass}`;
        dot.style.left = `${x}px`;
        dot.style.top = `${y}px`;

        const img = document.createElement("img");
        img.src = skill.src;
        img.alt = skill.alt;

        dot.appendChild(img);
        circleEl.appendChild(dot);
      });
    };

    const innerEl = innerRef.current;
    const outerEl = outerRef.current;
    if (!innerEl || !outerEl) return;

    createDots(innerSkillsData, innerEl, "skills-dot-inner");
    createDots(outerSkillsData, outerEl, "skills-dot-outer");
  }, []);

  return (
    <div className="skills-container">
      <div ref={innerRef} className="skills-circle skills-circle-inner" />
      <div ref={outerRef} className="skills-circle skills-circle-outer" />
      <div className="skills-center-text">SKILLS</div>
    </div>
  );
}

function Hero() {
  const [show, setShow] = useState(false);
  const [subtitle, setSubtitle] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setShow(true), 80);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
  const hand = document.querySelector(".wave-hand");
  if (!hand) return;

    hand.addEventListener("animationend", () => {
      hand.classList.remove("wave");
    });

    // Optional: wave once on first load
    setTimeout(() => hand.classList.add("wave"), 400);

    return () => {
      hand.removeEventListener("animationend", () => {});
    };
  }, []);


  useEffect(() => {
    if (!show) return;
    const full = "Exploring Data Engineering & AI";
    let i = 0;
    const id = setInterval(() => {
      i += 1;
      setSubtitle(full.slice(0, i));
      if (i >= full.length) clearInterval(id);
    }, 70);
    return () => clearInterval(id);
  }, [show]);

  return (
    <section className="relative overflow-hidden">
      <div className="hero-bg pointer-events-none absolute inset-0 -z-10" />

      <div
        className={`mx-auto w-full max-w-7xl px-2 sm:px-3 lg:px-4 pt-28 pb-16 md:pt-36 md:pb-24 transition-all duration-700 ease-out transform ${
          show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
        }`}
      >
        <div className="grid gap-10 md:grid-cols-2 items-center">
            <div>
              <div
                className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-4 py-1 text-xs font-medium text-slate-200 border border-slate-700/70 shadow-md mb-5 hover:cursor-pointer"
                onMouseEnter={() => {
                  const hand = document.querySelector(".wave-hand");
                  hand?.classList.add("wave");
                }}
              >
                <span className="wave-hand text-lg">👋</span>
                <span>Hey there!</span>
              </div>
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight">
              <span className="block text-slate-100">I&apos;m</span>
              <span className="block bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
                Vamshi Krishna
              </span>
            </h1>

            <p className="mt-4 text-xl md:text-2xl font-semibold text-sky-300">
              {subtitle}
              <span className="inline-block w-[10px] bg-sky-300/80 animate-pulse h-[1.1em] align-middle ml-0.5" />
            </p>

            <p className="mt-4 text-sm md:text-base text-slate-300 leading-relaxed max-w-xl">
              I love exploring the space where data engineering, analytics, and AI collide — building pipelines, models, and interfaces that turn noisy data into clear stories. Here you’ll find experiments, end-to-end projects, and a few wild ideas that made it into production. Buckle up, we’re going on a data ride. ✨
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-4">
              <a
                href="#projects"
                className="rounded-full bg-sky-500 px-6 py-2 text-sm font-semibold text-slate-950 shadow-[0_18px_40px_rgba(56,189,248,0.45)] hover:bg-sky-400 transition"
              >
                View Projects
              </a>
              <a
                href="#contact"
                className="rounded-full border border-slate-600 px-6 py-2 text-sm font-semibold text-slate-200 hover:border-sky-400 hover:text-sky-300 transition"
              >
                Contact Me
              </a>
            </div>
          </div>

          <div className="flex justify-center md:justify-end">
            <SkillsOrbit />
          </div>
        </div>
      </div>
    </section>
  );
}

/* ============== PROJECT ROW ============== */

function ProjectRow({
  company,
  role,
  period,
  bullets,
  demoUrl = "#",
  codeUrl = "#",
}) {
  const [first, ...rest] = bullets || [];

  return (
    <article className="group rounded-xl px-3 py-6 md:py-7 transition hover:bg-slate-900/70 hover:shadow-[0_0_35px_rgba(56,189,248,0.25)]">
      <div className="flex flex-col gap-3 md:flex-row md:gap-8">
        <div className="text-xs md:text-sm text-slate-400 md:w-40">
          {period}
        </div>

        <div className="flex-1">
          <h3 className="text-base md:text-lg font-semibold text-slate-50 group-hover:text-sky-400 transition">
            {company}
          </h3>

          <div className="mt-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-lime-300">
            {role}
          </div>

          {first && (
            <p className="mt-3 text-sm md:text-[15px] leading-relaxed text-slate-300">
              {first}
            </p>
          )}

          {rest.length > 0 && (
            <ul className="mt-2 space-y-1.5 text-xs md:text-sm text-slate-400">
              {rest.map((line, i) => (
                <li key={i} className="flex gap-2">
                  <span className="mt-1 h-1 w-1 rounded-full bg-sky-400/80 flex-shrink-0" />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <a
              href={demoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-sky-500/80 bg-sky-500/10 px-4 py-1.5 text-xs md:text-sm font-medium text-sky-200 transition hover:bg-sky-500 hover:text-slate-950 hover:shadow-[0_0_20px_rgba(56,189,248,0.8)]"
            >
              Demo
            </a>

            <a
              href={codeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-600 bg-slate-900/80 px-4 py-1.5 text-xs md:text-sm font-medium text-slate-200 transition hover:border-sky-400 hover:text-sky-100 hover:bg-slate-900 hover:shadow-[0_0_20px_rgba(56,189,248,0.6)]"
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 20 20"
                className="h-4 w-4"
                fill="none"
              >
                <path
                  d="M6 4.5a1.5 1.5 0 1 1-1 0V3a1 1 0 0 1 1-1h4.5a1 1 0 0 1 0 2H7v2.1a2.5 2.5 0 0 1 0 4.8V14h2.5a1 1 0 1 1 0 2H7a1 1 0 0 1-1-1v-2.1a1.5 1.5 0 1 1 1-2.6V7.1a1.5 1.5 0 1 1 0-2.6Z"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <span>Code</span>
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ============== DATA ARRAYS ============== */

const projects = [
  {
    company: "AI Chess Coach & Tactics Board",
    role: "Frontend / GenAI",
    period: "Nov 2025",
    bullets: [
      "Built a browser-based chess trainer where players battle an adaptive AI, get real-time hints, and review full game history on any device.",
      "Engineered a React + chess.js game loop with legal-move generation, check/checkmate detection, adaptive AI move selection, and per-move evaluation surfaced through an AI Coach panel.",
      "Designed an immersive UX with themed boards (wood, glass, neon), light/dark modes, click-sound feedback, mobile action menu, side-selection flow, animated result overlays, and a live scoresheet for easy game review.",
    ],
    demoUrl: "https://github.com/vamshikrishna55/chess-world",
    codeUrl: "https://github.com/vamshikrishna55/chess-world",
  },
  {
    company: "MathsBrain Galaxy",
    role: "Frontend Developer",
    period: "Oct – Nov 2025",
    bullets: [
      "Designed a galaxy-themed math learning app with playful UI for kids to practice arithmetic and problem-solving.",
      "Built interactive quiz flows in React with score tracking and progressive difficulty.",
      "Implemented responsive layouts so the experience works smoothly on desktop and mobile.",
    ],
    demoUrl: "https://github.com/vamshikrishna55/mathsbrain-galaxy",
    codeUrl: "https://github.com/vamshikrishna55/mathsbrain-galaxy",
  },
  {
    company: "Pokédex VK",
    role: "Frontend Developer",
    period: "Sep – Oct 2025",
    bullets: [
      "Created a Pokédex web app in React that lets users search and filter Pokémon with a clean, responsive UI.",
      "Integrated with the public Pokémon API to fetch stats, sprites, and type information in real time.",
      "Deployed the app to Vercel for fast, production-ready hosting with automatic builds from GitHub.",
    ],
    demoUrl: "https://pokedex-vk.vercel.app/",
    codeUrl: "https://github.com/vamshikrishna55/pokedex-vk",
  },
  {
    company: "Retail Sales Forecasting & Analytics",
    role: "Data Scientist / Data Engineer",
    period: "Aug – Sep 2025",
    bullets: [
      "Cleaned and transformed multi-store retail sales data to build robust time-series forecasting datasets.",
      "Experimented with forecasting models to predict future demand and identify seasonal patterns.",
      "Summarized insights that help stakeholders plan inventory and promotions more effectively.",
    ],
    demoUrl: "https://github.com/vamshikrishna55/retail-sales-forecasting",
    codeUrl: "https://github.com/vamshikrishna55/retail-sales-forecasting",
  },
  {
    company: "HIPAA-Ready Dental Claims Risk Lakehouse",
    role: "Data Engineer (Project)",
    period: "July – Aug 2025",
    bullets: [
      "Built streaming + batch ingestion for EHR, claims, and imaging data into a bronze / silver / gold lakehouse using dbt and modern ELT patterns.",
      "Implemented data contracts and Great Expectations / dbt tests to cut data-quality incidents and reduce time-to-fix from hours to minutes.",
      "Engineered denial-risk features and optimized Snowflake + S3 layout, improving model performance and trimming warehouse/storage costs.",
    ],
    demoUrl: "#",
    codeUrl: "#",
  },
  {
    company: "Real-Time Marketplace Recommendations Platform",
    role: "Data Engineer (Project)",
    period: "May – June 2025",
    bullets: [
      "Designed Kafka-based event schemas and Spark Structured Streaming pipelines to deliver online features with low-latency SLAs.",
      "Computed rolling behavioral features (CTR, dwell time, recency) that improved add-to-cart and overall marketplace GMV in A/B tests.",
      "Synced online/offline feature stores via Snowflake + dbt and Datafold checks, reducing metric drift and enabling reproducible experiments.",
    ],
    demoUrl: "#",
    codeUrl: "#",
  },
  {
    company: "Analytics Platform Observability & Governance",
    role: "Data Platform Engineer (Project)",
    period: "Mar – Apr 2025",
    bullets: [
      "Codified infra with Terraform, Kubernetes, and Snowflake roles/warehouses, cutting platform setup time significantly.",
      "Centralized SLIs/SLOs for freshness, completeness, and late-arriving data using Prometheus / Grafana to reduce alert noise and MTTA.",
      "Standardized data-quality libraries (GE + dbt tests) and CI gates to decrease incident frequency and improve on-time SLAs.",
    ],
    demoUrl: "#",
    codeUrl: "#",
  },
  {
    company: "GenAI Data Quality & SQL Copilot",
    role: "Data / ML Engineer (Project)",
    period: "Jan – Feb 2025",
    bullets: [
      "Built an LLM-powered triage bot that reads failed data-quality checks and runbooks, reducing investigation time and MTTR.",
      "Implemented a RAG layer over data contracts, lineage graphs, and documentation to help analysts self-serve platform issues.",
      "Shipped guarded SQL generation and optimization workflows plus PII-safe logging and offline evals to improve suggestion precision.",
    ],
    demoUrl: "#",
    codeUrl: "#",
  },
];

const vrrcPoints = [
  "Led data discovery and classification across rail operations datasets; mapped systems (Snowflake, M365/SharePoint, file shares) and tagged PII/schedule fields for access and retention.",
  "Established RBAC and fine-grained controls in Snowflake and Power BI workspaces to protect operational and passenger data.",
  "Implemented data masking/tokenization for PII in non-prod and introduced synthetic test datasets to de-risk development.",
  "Built data-quality and misuse detection (missing/duplicate timestamps, unusual edits/exports) and automated health/integrity alerts in Python/SQL.",
  "Authored incident playbooks and runbooks for triage, escalation, and rollback; added lineage views and visuals to speed root-cause analysis.",
  "Hardened Snowflake posture with warehouse/network policies, service accounts, and least-privilege roles, validated through controlled change tests.",
  "Delivered executive dashboards on data quality, access activity, and sharing trends, supplying audit-ready evidence for governance reviews.",
  "Defined and embedded data-handling standards (naming, sensitivity tags, retention windows) within ETL pipelines with Ops, IT, and Analytics.",
  "Implemented backups and Snowflake Time Travel and executed recovery drills to confirm RTO/RPO targets.",
  "Drove adoption with concise guides and office hours, reducing ad-hoc pulls and improving policy compliance.",
];

const skillCategories = [
  {
    name: "Programming & Scripting",
    skills: [
      { name: "Python", level: "expert" },
      { name: "SQL", level: "expert" },
      { name: "JavaScript", level: "intermediate" },
      { name: "Java", level: "intermediate" },
      { name: "Bash", level: "beginner" },
    ],
  },
  {
    name: "Web Development",
    skills: [
      { name: "Html", level: "expert" },
      { name: "CSS", level: "expert" },
      { name: "React", level: "expert" },
      { name: "Tailwind", level: "expert" },
      { name: "JavaScript", level: "intermediate" },
      { name: "Ui/Ux", level: "beginner" },
    ],
  },
  {
    name: "Data Engineering",
    skills: [
      { name: "ETL / ELT", level: "expert" },
      { name: "Data Modelling (Star / Snowflake)", level: "expert" },
      { name: "Data Contracts", level: "expert" },
      { name: "Streaming (Kafka / Kinesis)", level: "expert" },
      { name: "Airflow", level: "intermediate" },
      { name: "Dagster", level: "beginner" },
    ],
  },
  {
    name: "Data Quality & Observability",
    skills: [
      { name: "Great Expectations", level: "expert" },
      { name: "dbt tests", level: "expert" },
      { name: "Anomaly Detection", level: "expert" },
      { name: "Monitoring & Alerting", level: "intermediate" },
      { name: "A/B Test Design", level: "intermediate" },
      { name: "Data Lineage & Governance", level: "intermediate" },
    ],
  },
  {
    name: "Analytics & BI",
    skills: [
      { name: "Power BI (DAX, Power Query)", level: "expert" },
      { name: "Tableau", level: "expert" },
      { name: "Tableau Prep", level: "intermediate" },
      { name: "Looker", level: "intermediate" },
      { name: "Alteryx", level: "beginner" },
      { name: "Semantic Modelling", level: "expert" },
    ],
  },
  {
    name: "Data Platforms & Databases",
    skills: [
      { name: "Snowflake", level: "expert" },
      { name: "PostgreSQL", level: "expert" },
      { name: "MySQL", level: "expert" },
      { name: "MS SQL Server", level: "intermediate" },
      { name: "MongoDB", level: "beginner" },
      { name: "DynamoDB", level: "expert" },
    ],
  },
  {
    name: "Cloud & DevOps",
    skills: [
      {
        name: "AWS (S3, Redshift, EMR, Lambda, RDS, Glue, IAM)",
        level: "expert",
      },
      { name: "GCP (BigQuery)", level: "intermediate" },
      { name: "Git", level: "expert" },
      { name: "Docker", level: "expert" },
      { name: "Terraform", level: "intermediate" },
      { name: "Kubernetes", level: "intermediate" },
      { name: "Jenkins", level: "beginner" },
    ],
  },
];

const services = [
  {
    title: "Front-End Development",
    icon: "🎨",
    description:
      "Craft intuitive and responsive user interfaces using modern frameworks to deliver a seamless experience across all devices.",
  },
  {
    title: "Database Management",
    icon: "🗄️",
    description:
      "Design and manage efficient databases to ensure fast, reliable data storage, retrieval, and reporting.",
  },
  {
    title: "Performance Optimization",
    icon: "⚡",
    description:
      "Improve application speed and reliability with strategic code enhancements, caching, and query optimization.",
  },
  {
    title: "Full-Stack Development",
    icon: "<>",
    description:
      "Deliver end-to-end solutions by integrating frontend and backend systems into a cohesive and scalable application.",
  },
  {
    title: "AI Integration",
    icon: "🤖",
    description:
      "Integrate AI models and automation into your workflows to enhance decision-making and user experience.",
  },
  {
    title: "Deployment & Maintenance",
    icon: "🚀",
    description:
      "Ensure smooth deployment and ongoing maintenance with regular updates, monitoring, and performance checks.",
  },
];

const softSkills = [
  { icon: "🧩", label: "Problem-Solving" },
  { icon: "⏱️", label: "Time Management" },
  { icon: "🧠", label: "Critical Thinking" },
  { icon: "⚖️", label: "Decision Making" },
  { icon: "💬", label: "Communication" },
  { icon: "👥", label: "Teamwork · SCRUM" },
  { icon: "🔄", label: "Adaptability" },
  { icon: "💡", label: "Creativity" },
];

/* ============== EXPERIENCE SECTION ============== */

function ExperienceSection() {
  const [showAllExperience, setShowAllExperience] = useState(false);
  const [currentYear, setCurrentYear] = useState("2023");

  const topMarkerRef = useRef(null);
  const bottomMarkerRef = useRef(null);

  const visibleExpPoints = showAllExperience
    ? vrrcPoints
    : vrrcPoints.slice(0, 3);

  useEffect(() => {
    const topEl = topMarkerRef.current;
    const bottomEl = bottomMarkerRef.current;
    if (!topEl || !bottomEl) return;

    const options = { threshold: 0.4 };

    const topObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setCurrentYear("2023");
        }
      });
    }, options);

    const bottomObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setCurrentYear("2022");
        }
      });
    }, options);

    topObserver.observe(topEl);
    bottomObserver.observe(bottomEl);

    return () => {
      topObserver.disconnect();
      bottomObserver.disconnect();
    };
  }, []);

  return (
    <Section id="experience" title="Experience">
      <p className="text-xs md:text-sm uppercase tracking-[0.25em] text-emerald-300 text-center md:text-left">
        Rail data, governance &amp; analytics
      </p>

      <div className="relative mt-8">
        <div className="absolute left-6 top-0 bottom-0 w-px bg-slate-800" />

        <div className="flex items-start gap-10">
          <div className="sticky top-24 flex flex-col items-center gap-4">
            <div className="relative flex items-center justify-center">
              <div className="h-8 w-8 rounded-full bg-slate-900 border-4 border-slate-400 shadow-md" />
              <div className="absolute h-2 w-2 rounded-full bg-sky-400" />
            </div>
            <div className="ml-2 flex flex-col items-center text-slate-200">
              <span className="text-xl md:text-3xl font-bold">
                {currentYear}
              </span>
            </div>
          </div>

          <div className="flex-1 md:sticky md:top-24">
            <div ref={topMarkerRef} className="h-1 w-full" />

            <h3 className="text-2xl md:text-3xl font-semibold text-slate-50">
              VRRC Company
            </h3>
            <p className="mt-1 text-sm md:text-base text-slate-400">
              Data Analyst · Jan 2022 – Jul 2023
            </p>

            <ul className="mt-4 space-y-2 text-sm md:text-base text-slate-300">
              {visibleExpPoints.map((pt, idx) => (
                <li key={idx} className="flex gap-2">
                  <span className="mt-2 h-1.5 w-1.5 rounded-full bg-sky-400 flex-shrink-0" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>

            <div ref={bottomMarkerRef} className="h-1 w-full mt-4" />

            {!showAllExperience && vrrcPoints.length > 3 && (
              <div className="mt-4">
                <button
                  onClick={() => setShowAllExperience(true)}
                  className="text-sm font-medium text-sky-300 hover:text-sky-200 inline-flex items-center gap-1"
                >
                  Show more →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}

function ServicesSection() {
  return (
    <Section id="services" title="Services">
      <div className="mb-8">
        <h3 className="mt-3 text-3xl md:text-4xl font-semibold leading-tight tracking-tight text-slate-50">
          Create{" "}
          <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-fuchsia-400 bg-clip-text text-transparent">
            Efficient
          </span>{" "}
          Solutions for Your Business.
        </h3>
      </div>

      <div className="grid gap-6 md:grid-cols-3 sm:grid-cols-2">
        {services.map((svc) => (
          <div
            key={svc.title}
            className="group flex flex-col rounded-2xl border border-slate-800 bg-slate-900/70 px-5 py-6 shadow-[0_18px_45px_rgba(15,23,42,0.9)] transition duration-200 hover:-translate-y-1 hover:border-fuchsia-500/80 hover:shadow-[0_0_36px_rgba(236,72,153,0.7)]"
          >
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-pink-500 to-violet-500 text-base text-slate-50 shadow-[0_0_20px_rgba(236,72,153,0.9)]">
              {svc.icon}
            </div>
            <h4 className="text-sm md:text-base font-semibold text-slate-100">
              {svc.title}
            </h4>
            <p className="mt-3 text-xs md:text-sm leading-relaxed text-slate-300">
              {svc.description}
            </p>
          </div>
        ))}
      </div>
    </Section>
  );
}

/* ============== MAIN APP ============== */

export default function App() {
  const [showAllProjects, setShowAllProjects] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [isLight, setIsLight] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("vk-theme");
    if (saved === "light") {
      setIsLight(true);
      document.body.classList.add("theme-light");
    }
  }, []);

  const toggleTheme = () => {
    setIsLight((prev) => {
      const next = !prev;
      localStorage.setItem("vk-theme", next ? "light" : "dark");
      if (next) document.body.classList.add("theme-light");
      else document.body.classList.remove("theme-light");
      return next;
    });
  };

  const visibleProjects = showAllProjects ? projects : projects.slice(0, 3);

  return (
    <div
      className={`min-h-screen transition-colors duration-300 ${
        isLight ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-slate-100"
      }`}
    >
      {showIntro && <Intro onDone={() => setShowIntro(false)} />}

      <Navbar isLight={isLight} onToggleTheme={toggleTheme} />

      <main
        className={`transition-opacity duration-700 ${
          showIntro ? "opacity-0" : "opacity-100"
        }`}
      >
        <Hero />

        {/* ABOUT */}
        <Section id="about" title="About Me">
          <div className="grid gap-8 md:grid-cols-[minmax(0,2fr)_minmax(0,1.3fr)] items-center">
            <div>
              <h3 className="text-3xl font-semibold tracking-tight text-slate-50">
                Vamshi Krishna
              </h3>
              <p className="mt-4 text-sm md:text-base leading-relaxed text-slate-300">
                I&apos;m an aspiring Data Engineer with strong foundations in
                SQL, Python, and modern data engineering practices. I enjoy
                building reliable ETL/ELT pipelines, designing analytics-ready
                datasets, and enabling ML/AI workflows that actually support
                real business decisions.
              </p>
              <p className="mt-3 text-sm md:text-base leading-relaxed text-slate-300">
                Across my projects and experience, I&apos;ve worked on turning
                messy requirements into scalable data models, improving
                decision-making for stakeholders, and keeping data quality front
                and center. I care about clean documentation, efficient cloud
                data stacks, and creating systems that are easy for teams to
                understand and extend.
              </p>
            </div>

            <div className="flex justify-center md:justify-end">
              <div className="relative overflow-hidden rounded-2xl border border-slate-700 bg-slate-900/60 p-1 shadow-xl">
                <img
                  src={profileImg}
                  alt="Vamshi Krishna portrait"
                  className="h-64 w-56 md:h-72 md:w-60 rounded-2xl object-cover"
                />
              </div>
            </div>
          </div>
        </Section>

        {/* EXPERIENCE */}
        <ExperienceSection />

        {/* SERVICES */}
        <ServicesSection />

        {/* PROJECTS */}
        <Section id="projects" title="Projects">
          <div className="divide-y divide-slate-800/80">
            {visibleProjects.map((p, idx) => (
              <ProjectRow key={idx} {...p} />
            ))}
          </div>

          {!showAllProjects && projects.length > 3 && (
            <div className="mt-6 flex justify-center">
              <button
                onClick={() => setShowAllProjects(true)}
                className="rounded-full border border-sky-500/80 bg-slate-900/80 px-6 py-2 text-sm font-medium text-sky-200 transition hover:bg-sky-500 hover:text-slate-950 hover:shadow-[0_0_24px_rgba(56,189,248,0.9)]"
              >
                Show more →
              </button>
            </div>
          )}
        </Section>

        {/* SKILLS */}
        <Section id="skills" title="Skills">
          <div className="space-y-8">
            {skillCategories.map((cat) => (
              <div key={cat.name}>
                <h3 className="text-sm md:text-base font-semibold text-slate-100 mb-3">
                  {cat.name}
                </h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {cat.skills.map((skill) => (
                    <SkillCard
                      key={skill.name}
                      name={skill.name}
                      level={skill.level}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <SoftSkillsCarousel skills={softSkills} />
        </Section>

        {/* CONTACT */}
        <Section id="contact" title="Contact Me">
          <div className="mt-4 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-950 to-slate-950 px-5 py-8 md:px-8 md:py-10 shadow-[0_24px_60px_rgba(15,23,42,0.9)]">
            <div className="grid gap-8 md:grid-cols-2">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  window.location.href =
                    "mailto:vamshikrishna.reddy555@gmail.com";
                }}
                className="space-y-5"
              >
                <div className="space-y-1.5">
                  <label className="text-xs md:text-sm font-medium text-slate-200">
                    Name
                  </label>
                  <input
                    type="text"
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs md:text-sm font-medium text-slate-200">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs md:text-sm font-medium text-slate-200">
                    Message
                  </label>
                  <textarea
                    rows={5}
                    placeholder="Tell me about your project"
                    className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 resize-none"
                  />
                </div>

                <button
                  type="submit"
                  className="mt-3 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-sky-500 via-indigo-500 to-purple-500 px-6 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_20px_60px_rgba(56,189,248,0.55)] hover:from-sky-400 hover:via-indigo-400 hover:to-purple-500 transition"
                >
                  Send Message
                  <span className="ml-2 text-base">➜</span>
                </button>
              </form>

              <div className="space-y-6 text-sm md:text-[15px] text-slate-300">
                <p className="leading-relaxed">
                  Share your challenge, data problem, or automation idea and
                  I&apos;ll get back to you within 1–2 business days. I&apos;m
                  currently based in the US and open to remote or hybrid roles.
                </p>

                <div className="space-y-3">
                  <a
                    href="mailto:vamshikrishna.reddy555@gmail.com"
                    className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-slate-200 hover:border-sky-400 hover:bg-slate-900 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-lg">
                        ✉️
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">
                          Email
                        </span>
                      </div>
                    </div>
                  </a>

                  <a
                    href="https://www.linkedin.com/in/vamshikrishna11/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-slate-200 hover:border-sky-400 hover:bg-slate-900 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-lg">
                        in
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">
                          LinkedIn
                        </span>
                        <span className="text-xs text-slate-400">
                          linkedin.com/in/vamshikrishna11
                        </span>
                      </div>
                    </div>
                  </a>

                  <a
                    href="https://github.com/vamshikrishna55"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-slate-200 hover:border-sky-400 hover:bg-slate-900 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-lg">
                        🐙
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">
                          GitHub
                        </span>
                      </div>
                    </div>
                  </a>

                  <a
                    href="https://x.com/your-handle"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-2xl border border-slate-700 bg-slate-900/70 px-4 py-3 text-slate-200 hover:border-sky-400 hover:bg-slate-900 hover:shadow-[0_0_20px_rgba(56,189,248,0.5)] transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/15 text-sky-300 text-lg">
                        𝕏
                      </span>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-100">
                          X (Twitter)
                        </span>
                        <span className="text-xs text-slate-400">
                          @vamshikrishna
                        </span>
                      </div>
                    </div>
                  </a>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/80 px-4 py-3">
                  <div className="text-[11px] font-semibold tracking-[0.25em] text-slate-500 uppercase">
                    Availability
                  </div>
                  <div className="mt-1 text-sm text-slate-200">
                    Remote / Hybrid / On-site (open to relocation)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Section>
      </main>

      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} Vamshi Krishna. All rights reserved.
      </footer>
    </div>
  );
}
