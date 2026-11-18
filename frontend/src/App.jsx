import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { loadSoundPreference, playClick, saveSoundPreference } from "./sound.js";

/* ------------------------------------------------------------------ */
/* Configuration                                                       */
/* ------------------------------------------------------------------ */
const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/+$/, "");
const MAX_MB = 10;
const MAX_BYTES = MAX_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png"];
const ALLOWED_EXT = /\.(jpe?g|png)$/i;

const NAV = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "model", label: "Model" },
  { id: "results", label: "Results" },
  { id: "docs", label: "Docs" },
];

const prettyName = (name) => (name ? name.charAt(0).toUpperCase() + name.slice(1) : "");
const formatSize = (bytes) =>
  bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

function validateFile(file) {
  if (!file) return "No file was selected.";
  const typeOk = file.type === "" || ALLOWED_TYPES.includes(file.type);
  if (!ALLOWED_EXT.test(file.name) || !typeOk) {
    return `"${file.name}" is not supported. Please upload a JPG, JPEG or PNG image.`;
  }
  if (file.size === 0) return `"${file.name}" is empty. Please choose a different image.`;
  if (file.size > MAX_BYTES) {
    return `"${file.name}" is ${formatSize(file.size)}. The maximum size is ${MAX_MB} MB.`;
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Icons (inline SVG, Lucide style, no extra dependency)               */
/* ------------------------------------------------------------------ */
function Icon({ children, size = 20, className = "", ...rest }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {children}
    </svg>
  );
}

const IconZap = (p) => (
  <Icon {...p}>
    <path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z" />
  </Icon>
);
const IconTarget = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </Icon>
);
const IconCpu = (p) => (
  <Icon {...p}>
    <rect width="16" height="16" x="4" y="4" rx="2" />
    <rect width="6" height="6" x="9" y="9" rx="1" />
    <path d="M15 2v2M15 20v2M2 15h2M2 9h2M20 15h2M20 9h2M9 2v2M9 20v2" />
  </Icon>
);
const IconUpload = (p) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" x2="12" y1="3" y2="15" />
  </Icon>
);
const IconImage = (p) => (
  <Icon {...p}>
    <rect width="18" height="18" x="3" y="3" rx="2" />
    <circle cx="9" cy="9" r="2" />
    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
  </Icon>
);
const IconX = (p) => (
  <Icon {...p}>
    <path d="M18 6 6 18" />
    <path d="m6 6 12 12" />
  </Icon>
);
const IconMenu = (p) => (
  <Icon {...p}>
    <line x1="4" x2="20" y1="7" y2="7" />
    <line x1="4" x2="20" y1="12" y2="12" />
    <line x1="4" x2="20" y1="17" y2="17" />
  </Icon>
);
const IconAlert = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </Icon>
);
const IconVolumeOn = (p) => (
  <Icon {...p}>
    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
    <path d="M16 9a5 5 0 0 1 0 6" />
    <path d="M19.364 18.364a9 9 0 0 0 0-12.728" />
  </Icon>
);
const IconVolumeOff = (p) => (
  <Icon {...p}>
    <path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z" />
    <line x1="22" x2="16" y1="9" y2="15" />
    <line x1="16" x2="22" y1="9" y2="15" />
  </Icon>
);

function LogoMark({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id="lg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b6cff" />
          <stop offset="1" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="#0a1636" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="14.5" fill="none" stroke="url(#lg)" strokeOpacity=".55" strokeWidth="2" />
      <path
        d="M16 24v-6a2 2 0 0 1 2-2h6M40 16h6a2 2 0 0 1 2 2v6M48 40v6a2 2 0 0 1-2 2h-6M24 48h-6a2 2 0 0 1-2-2v-6"
        fill="none" stroke="url(#lg)" strokeWidth="3.5" strokeLinecap="round"
      />
      <path d="M20 32c4-8 8-8 12 0s8 8 12 0" fill="none" stroke="#e8eeff" strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/* Hooks                                                               */
/* ------------------------------------------------------------------ */
function scrollToId(id) {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  try {
    history.replaceState(null, "", `#${id}`);
  } catch {
    /* ignore */
  }
}

function useActiveSection() {
  const [active, setActive] = useState("home");
  useEffect(() => {
    // The upload + results area counts as "Results" in the navigation.
    const map = { home: "home", tool: "results", about: "about", model: "model", docs: "docs" };
    const els = Object.keys(map).map((k) => document.getElementById(k)).filter(Boolean);
    const visible = new Map();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
        let best = null;
        let bestRatio = 0;
        visible.forEach((ratio, id) => {
          if (ratio > bestRatio) {
            best = id;
            bestRatio = ratio;
          }
        });
        if (best) setActive(map[best]);
      },
      { rootMargin: "-30% 0px -40% 0px", threshold: [0, 0.1, 0.25, 0.5, 0.75, 1] }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
  return active;
}

/** Checks GET /health. Retries every 5 s until the model is online (free hosting can take ~1 minute to wake up). */
function useApiStatus() {
  const [status, setStatus] = useState("checking"); // checking | online | loading | offline
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer;
    async function check() {
      const controller = new AbortController();
      const abort = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(`${API_URL}/health`, { signal: controller.signal });
        const body = await res.json();
        if (cancelled) return;
        if (body.status === "ready") {
          setStatus("online");
          return; // stop polling
        }
        setStatus(body.status === "error" ? "offline" : "loading");
      } catch {
        if (!cancelled) setStatus((s) => (s === "online" ? "offline" : s === "checking" ? "checking" : "offline"));
      } finally {
        clearTimeout(abort);
      }
      if (!cancelled) timer = setTimeout(check, 5000);
    }
    check();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [attempt]);

  const recheck = useCallback(() => {
    setStatus("checking");
    setAttempt((n) => n + 1);
  }, []);
  return { status, recheck };
}

/* ------------------------------------------------------------------ */
/* Header                                                              */
/* ------------------------------------------------------------------ */
function Header({ active, soundOn, onToggleSound }) {
  const [open, setOpen] = useState(false);

  const go = (id) => (e) => {
    e.preventDefault();
    setOpen(false);
    scrollToId(id);
  };

  return (
    <header className="header">
      <div className="header-inner">
        <a href="#home" className="brand" onClick={go("home")} aria-label="AnimalScope AI, back to top">
          <LogoMark />
          <span className="brand-text">
            <span className="brand-name">AnimalScope AI</span>
            <span className="brand-sub">AI-Powered Animal Image Classifier</span>
          </span>
        </a>

        <nav className={`nav ${open ? "open" : ""}`} aria-label="Main navigation">
          {NAV.map((item) => (
            <a
              key={item.id}
              href={`#${item.id}`}
              className={`nav-link ${active === item.id ? "active" : ""}`}
              aria-current={active === item.id ? "true" : undefined}
              onClick={go(item.id)}
            >
              {item.label}
            </a>
          ))}
          <a href="#upload" className="btn btn-primary nav-cta-mobile" onClick={go("upload")}>
            Try Now
          </a>
        </nav>

        <div className="header-actions">
          <button
            type="button"
            className={`btn btn-ghost sound-btn ${soundOn ? "on" : ""}`}
            onClick={onToggleSound}
            aria-pressed={soundOn}
            title={soundOn ? "Turn click sounds off" : "Turn click sounds on"}
          >
            {soundOn ? <IconVolumeOn size={18} /> : <IconVolumeOff size={18} />}
            <span>Sound {soundOn ? "ON" : "OFF"}</span>
          </button>
          <a href="#upload" className="btn btn-primary nav-cta" onClick={go("upload")}>
            Try Now
          </a>
          <button
            type="button"
            className="btn btn-ghost menu-btn"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <IconX size={20} /> : <IconMenu size={20} />}
          </button>
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Hero + wave graphic                                                 */
/* ------------------------------------------------------------------ */
function wavePath({ amp, periods, phase, base }) {
  // Two tiles of 1440 px; an integer number of periods per tile makes the loop seamless.
  const W = 2880;
  const pts = [];
  for (let x = 0; x <= W; x += 20) {
    const y = base + amp * Math.sin((2 * Math.PI * periods * x) / 1440 + phase);
    pts.push(`${x},${y.toFixed(1)}`);
  }
  return pts;
}

function Waves() {
  const layers = useMemo(
    () => [
      { cls: "w1", amp: 22, periods: 2, phase: 0, base: 120 },
      { cls: "w2", amp: 30, periods: 3, phase: 1.6, base: 140 },
      { cls: "w3", amp: 16, periods: 4, phase: 3.1, base: 160 },
    ],
    []
  );
  return (
    <div className="waves" aria-hidden="true">
      {layers.map((l) => {
        const pts = wavePath(l);
        return (
          <svg key={l.cls} className={`wave-track ${l.cls}`} viewBox="0 0 2880 220" preserveAspectRatio="none">
            <defs>
              <linearGradient id={`fill-${l.cls}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#2f6bff" stopOpacity=".16" />
                <stop offset="1" stopColor="#2f6bff" stopOpacity="0" />
              </linearGradient>
              <linearGradient id={`stroke-${l.cls}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#2f6bff" />
                <stop offset=".5" stopColor="#22d3ee" />
                <stop offset="1" stopColor="#2f6bff" />
              </linearGradient>
            </defs>
            <polygon points={`0,220 ${pts.join(" ")} 2880,220`} fill={`url(#fill-${l.cls})`} />
            <polyline points={pts.join(" ")} fill="none" stroke={`url(#stroke-${l.cls})`} strokeWidth="1.6" />
          </svg>
        );
      })}
    </div>
  );
}

function Hero() {
  const features = [
    { icon: <IconZap size={22} />, title: "Fast Prediction", text: "A lightweight MobileNetV2 backbone keeps every prediction quick." },
    { icon: <IconTarget size={22} />, title: "High Accuracy", text: "Transfer learning from ImageNet, fine-tuned on labelled cat, dog and bird photos." },
    { icon: <IconCpu size={22} />, title: "Deep Learning", text: "A convolutional neural network built and trained with TensorFlow and Keras." },
  ];
  return (
    <section id="home" className="hero">
      <div className="hero-grid" aria-hidden="true" />
      <Waves />
      <div className="container hero-content">
        <h1 className="hero-title">AI Animal Image Classifier</h1>
        <p className="hero-text">
          Classify images into Cat, Dog or Bird using a pre-trained deep learning model (MobileNetV2).
        </p>
        <div className="hero-actions">
          <button type="button" className="btn btn-primary btn-lg" onClick={() => scrollToId("upload")}>
            Try Now
          </button>
          <button type="button" className="btn btn-outline btn-lg" onClick={() => scrollToId("about")}>
            How it works
          </button>
        </div>
        <ul className="features">
          {features.map((f) => (
            <li key={f.title} className="feature">
              <span className="feature-icon">{f.icon}</span>
              <div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Upload + results                                                    */
/* ------------------------------------------------------------------ */
const STATUS_TEXT = {
  checking: "Connecting to the server",
  online: "Model online",
  loading: "Model is loading",
  offline: "Server unreachable",
};

function StatusPill({ status, onRetry }) {
  return (
    <button
      type="button"
      className={`status status-${status}`}
      onClick={status === "online" ? undefined : onRetry}
      title={status === "online" ? `Connected to ${API_URL}` : `Select to check ${API_URL} again`}
    >
      <span className="status-dot" />
      {STATUS_TEXT[status]}
    </button>
  );
}

function UploadCard({ file, previewUrl, uploadError, loading, apiStatus, onFile, onClear, onPredict, onImageError }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  const openPicker = () => inputRef.current?.click();

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) onFile(f);
  };

  return (
    <div className="card upload-card" id="upload">
      <div className="card-head">
        <h2>Upload an image</h2>
        <p>Drop a photo of a cat, dog or bird. JPG, JPEG or PNG, up to {MAX_MB} MB.</p>
      </div>

      <div
        className={`dropzone ${dragging ? "dragging" : ""} ${previewUrl ? "has-image" : ""}`}
        role="button"
        tabIndex={0}
        aria-label={previewUrl ? "Replace the selected image" : "Choose an image, or drag and drop it here"}
        onClick={openPicker}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            openPicker();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt="Your selected upload" className="preview-img" onError={onImageError} />
            <button
              type="button"
              className="icon-btn clear-btn"
              aria-label="Remove image"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
            >
              <IconX size={18} />
            </button>
          </>
        ) : (
          <div className="dropzone-empty">
            <span className="drop-icon">
              <IconUpload size={26} />
            </span>
            <p className="drop-title">{dragging ? "Release to upload" : "Drag and drop an image here"}</p>
            <p className="drop-sub">or select a file from your device</p>
          </div>
        )}
      </div>

      {file && !uploadError && (
        <p className="file-meta">
          <IconImage size={16} />
          <span className="file-name">{file.name}</span>
          <span className="file-size">{formatSize(file.size)}</span>
        </p>
      )}

      {uploadError && (
        <p className="alert" role="alert">
          <IconAlert size={18} />
          <span>{uploadError}</span>
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        className="visually-hidden"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = ""; // lets the same file be chosen again
          if (f) onFile(f);
        }}
        tabIndex={-1}
      />

      <div className="upload-actions">
        <button type="button" className="btn btn-outline" onClick={openPicker}>
          <IconImage size={18} /> Choose Image
        </button>
        <button type="button" className="btn btn-primary" onClick={onPredict} disabled={!file || loading}>
          {loading ? (
            <>
              <span className="spinner" aria-hidden="true" /> Analysing
            </>
          ) : (
            "Predict Animal"
          )}
        </button>
      </div>

      {apiStatus !== "online" && (
        <p className="hint">
          {apiStatus === "offline"
            ? "The prediction server is not responding yet. Servers on free hosting can take about a minute to wake up, so this page keeps checking."
            : "The prediction server is starting. Predict Animal works as soon as the model is online."}
        </p>
      )}
    </div>
  );
}

function ConfidenceRow({ name, percentage, top, animate }) {
  const hasValue = typeof percentage === "number";
  return (
    <div className={`conf-row ${top ? "top" : ""}`}>
      <div className="conf-label">
        <span>{prettyName(name)}</span>
        <span className="conf-value">{hasValue ? `${percentage.toFixed(2)}%` : "–"}</span>
      </div>
      <div
        className="conf-track"
        role="progressbar"
        aria-label={`${prettyName(name)} confidence`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={hasValue ? Math.round(percentage) : undefined}
      >
        <div className="conf-fill" style={{ width: hasValue && animate ? `${percentage}%` : "0%" }} />
      </div>
    </div>
  );
}

// Labels only, for the empty state (these are the model's class names, not predictions).
const EMPTY_ROWS = ["Cat", "bird", "dog"];

function ResultsCard({ previewUrl, result, predicting, predictError, apiStatus, cardRef }) {
  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(false);
    if (!result) return undefined;
    const t = setTimeout(() => setAnimate(true), 60);
    return () => clearTimeout(t);
  }, [result]);

  let body;
  if (predicting) {
    body = (
      <div className="result-state" aria-live="polite">
        <span className="spinner spinner-lg" aria-hidden="true" />
        <p className="state-title">Analysing your image</p>
        <p className="state-sub">
          {apiStatus === "online" ? "The model is classifying the photo." : "Waiting for the server to wake up. This can take up to a minute."}
        </p>
      </div>
    );
  } else if (result) {
    const topName = result.predicted_class;
    body = (
      <div className="result-body" aria-live="polite">
        <div className="result-top">
          <img src={previewUrl} alt="The image that was classified" className="result-thumb" />
          <div className="result-main">
            <p className="result-kicker">Predicted animal</p>
            <p className="result-name">{prettyName(topName)}</p>
            <p className="result-conf">
              <span className="result-conf-num">{Number(result.confidence).toFixed(2)}%</span> confidence
            </p>
          </div>
        </div>
        <div className="conf-list">
          {result.probabilities.map((p) => (
            <ConfidenceRow key={p.class} name={p.class} percentage={p.percentage} top={p.class === topName} animate={animate} />
          ))}
        </div>
        <p className="result-note">
          Confidence is the model&rsquo;s probability for each class. It only knows Cat, Bird and Dog, so any other image still receives one of these labels.
        </p>
      </div>
    );
  } else if (predictError) {
    body = (
      <div className="result-state">
        <span className="state-icon error">
          <IconAlert size={26} />
        </span>
        <p className="state-title">Prediction failed</p>
        <p className="state-sub" role="alert">{predictError}</p>
      </div>
    );
  } else {
    body = (
      <div className="result-empty">
        <div className="result-state">
          <span className="state-icon">
            <IconImage size={26} />
          </span>
          <p className="state-title">No prediction yet</p>
          <p className="state-sub">Upload an image and select Predict Animal. The model&rsquo;s result will appear here.</p>
        </div>
        <div className="conf-list muted">
          {EMPTY_ROWS.map((n) => (
            <ConfidenceRow key={n} name={n} percentage={undefined} animate={false} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="card result-card" id="results" ref={cardRef}>
      <div className="card-head">
        <h2>Prediction results</h2>
        <p>Every value shown here comes from the model&rsquo;s response.</p>
      </div>
      {body}
    </div>
  );
}

function ToolSection({ apiStatus, recheck }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState(null);
  const [predictError, setPredictError] = useState(null);
  const resultsRef = useRef(null);

  // Free the object URL whenever it is replaced or the component unmounts.
  useEffect(() => () => previewUrl && URL.revokeObjectURL(previewUrl), [previewUrl]);

  const resetOutput = () => {
    setResult(null);
    setPredictError(null);
  };

  const handleFile = (f) => {
    const problem = validateFile(f);
    resetOutput();
    if (problem) {
      setUploadError(problem);
      setFile(null);
      setPreviewUrl(null);
      return;
    }
    setUploadError(null);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleClear = () => {
    setFile(null);
    setPreviewUrl(null);
    setUploadError(null);
    resetOutput();
  };

  const handleImageError = () => {
    setUploadError("This image could not be displayed. The file may be damaged. Please choose another image.");
    setFile(null);
    setPreviewUrl(null);
  };

  const handlePredict = async () => {
    if (!file || predicting) return;
    setPredicting(true);
    resetOutput();

    if (window.innerWidth < 960) {
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000); // allows for a cold start
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`${API_URL}/predict`, { method: "POST", body: form, signal: controller.signal });

      let data = null;
      try {
        data = await res.json();
      } catch {
        /* non-JSON body */
      }

      if (!res.ok) {
        const detail = data && data.detail;
        const msg = typeof detail === "string" ? detail : `The server returned an error (HTTP ${res.status}).`;
        throw new Error(msg);
      }
      if (!data || typeof data.predicted_class !== "string" || !Array.isArray(data.probabilities)) {
        throw new Error("The server sent an unexpected response.");
      }
      setResult(data);
    } catch (err) {
      if (err.name === "AbortError") {
        setPredictError("The request took too long. The server may be starting up. Please try again in a minute.");
        recheck();
      } else if (err instanceof TypeError) {
        setPredictError(`Could not reach the prediction server at ${API_URL}. Check that the backend is running (or wait a minute if it is waking up), then try again.`);
        recheck();
      } else {
        setPredictError(err.message);
      }
    } finally {
      clearTimeout(timeout);
      setPredicting(false);
    }
  };

  return (
    <section id="tool" className="section tool-section">
      <div className="container">
        <div className="section-head">
          <h2 className="section-title">Classify your own image</h2>
          <StatusPill status={apiStatus} onRetry={recheck} />
        </div>
        <div className="tool-grid">
          <UploadCard
            file={file}
            previewUrl={previewUrl}
            uploadError={uploadError}
            loading={predicting}
            apiStatus={apiStatus}
            onFile={handleFile}
            onClear={handleClear}
            onPredict={handlePredict}
            onImageError={handleImageError}
          />
          <ResultsCard
            previewUrl={previewUrl}
            result={result}
            predicting={predicting}
            predictError={predictError}
            apiStatus={apiStatus}
            cardRef={resultsRef}
          />
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* About / Model / Docs                                                */
/* ------------------------------------------------------------------ */
function About() {
  const steps = [
    { title: "Upload", text: "Choose or drop a JPG, JPEG or PNG photo." },
    { title: "Prepare", text: "The server converts it to RGB and resizes it to 224 × 224 pixels." },
    { title: "Classify", text: "MobileNetV2 scores the image against each class." },
    { title: "Result", text: "You see the predicted animal and the confidence for every class." },
  ];
  return (
    <section id="about" className="section">
      <div className="container">
        <h2 className="section-title">About AnimalScope AI</h2>
        <p className="section-lead">
          AnimalScope AI is a Samsung internship project that shows a complete deep learning workflow: a model trained in
          Google Colab, served by a FastAPI backend, and used through this React website. It tells cats, dogs and birds apart.
        </p>
        <ol className="steps">
          {steps.map((s, i) => (
            <li key={s.title} className="step card">
              <span className="step-num">{i + 1}</span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function ModelSection() {
  const specs = [
    { k: "Architecture", v: "MobileNetV2 with ImageNet weights, then global average pooling, 30% dropout and a 3-way softmax layer." },
    { k: "Input", v: "224 × 224 pixel RGB images." },
    { k: "Classes", v: "Cat, bird and dog, in that exact order." },
    { k: "Training data", v: "The Roboflow “cats, dogs and birds” image dataset, with random flip, rotation and zoom augmentation." },
    { k: "Training steps", v: "20 epochs training the new classification head, then 5 epochs fine-tuning the last 30 MobileNetV2 layers at a low learning rate." },
    { k: "Preprocessing", v: "MobileNetV2 pixel scaling is built into the saved model, so the server only converts to RGB and resizes." },
  ];
  return (
    <section id="model" className="section">
      <div className="container">
        <h2 className="section-title">The model</h2>
        <p className="section-lead">Transfer learning reuses what MobileNetV2 already learned from millions of images, then specialises it for three animals.</p>
        <dl className="specs">
          {specs.map((s) => (
            <div key={s.k} className="spec card">
              <dt>{s.k}</dt>
              <dd>{s.v}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Docs() {
  const curl = `curl -X POST ${API_URL}/predict \\\n  -F "file=@my-photo.jpg"`;
  const response = `{
  "predicted_class": "<class name>",
  "confidence": <number, 0 to 100>,
  "probabilities": [
    { "class": "Cat",  "probability": <0 to 1>, "percentage": <0 to 100> },
    { "class": "bird", "probability": <0 to 1>, "percentage": <0 to 100> },
    { "class": "dog",  "probability": <0 to 1>, "percentage": <0 to 100> }
  ],
  "inference_ms": <number>,
  "filename": "<uploaded file name>"
}`;
  return (
    <section id="docs" className="section">
      <div className="container">
        <h2 className="section-title">API documentation</h2>
        <p className="section-lead">The website talks to a small REST API. You can call it directly from any tool.</p>

        <div className="docs-grid">
          <div className="card doc-card">
            <h3>Endpoints</h3>
            <ul className="endpoints">
              <li><code className="method get">GET</code><code>/health</code><span>Reports whether the model has finished loading.</span></li>
              <li><code className="method get">GET</code><code>/classes</code><span>Lists the class names in model order.</span></li>
              <li><code className="method post">POST</code><code>/predict</code><span>Classifies one uploaded image.</span></li>
            </ul>
            <h3>Rules</h3>
            <ul className="plain">
              <li>Send the image as multipart form data in a field named <code>file</code>.</li>
              <li>JPG, JPEG and PNG only, up to {MAX_MB} MB.</li>
              <li>Errors return JSON like <code>{`{"detail": "..."}`}</code> with status 400, 413, 415, 422 or 503.</li>
            </ul>
            <a className="btn btn-outline doc-link" href={`${API_URL}/docs`} target="_blank" rel="noreferrer">
              Open interactive API docs
            </a>
          </div>

          <div className="card doc-card">
            <h3>Example request</h3>
            <pre className="code"><code>{curl}</code></pre>
            <h3>Response shape</h3>
            <pre className="code"><code>{response}</code></pre>
          </div>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="footer">
      <div className="container footer-inner">
        <div className="footer-brand">
          <LogoMark size={28} />
          <span>AnimalScope AI</span>
        </div>
        <p>Samsung internship project. Built with TensorFlow, FastAPI and React.</p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */
export default function App() {
  const [soundOn, setSoundOn] = useState(loadSoundPreference);
  const active = useActiveSection();
  const { status: apiStatus, recheck } = useApiStatus();

  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  // One subtle click for buttons and links, only when the person has switched sound on.
  useEffect(() => {
    const onClick = (e) => {
      if (!soundRef.current) return;
      if (e.target.closest(".sound-btn")) return; // the toggle plays its own confirmation tick
      if (e.target.closest("button:not(:disabled), a[href], [role='button']")) playClick();
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    saveSoundPreference(next);
    if (next) setTimeout(() => playClick(1.25), 0); // short confirmation tick when switching on
  };

  return (
    <>
      <Header active={active} soundOn={soundOn} onToggleSound={toggleSound} />
      <main>
        <Hero />
        <ToolSection apiStatus={apiStatus} recheck={recheck} />
        <About />
        <ModelSection />
        <Docs />
      </main>
      <Footer />
    </>
  );
}
