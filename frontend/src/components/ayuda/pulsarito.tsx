"use client";

import { useEffect, useId, useState, type RefObject } from "react";

/// Pulsarito, el botón de ayuda: el pulsador redondo C-PULSAR de IoT FENSTER
/// (bisel negro con anillo de luz azul). Cerrado es solo el botón; al abrir la
/// ayuda le salen la cara, las manos y los pies, y de vez en cuando saluda, da
/// unos pasitos sin moverse del sitio o parpadea. El dibujo es el de
/// "Pulsarito Morales" de la mascota del panel; los giros de las piezas están en
/// globals.css (clases `pul-*`).

type Gesto = "saluda" | "pasitos" | "mira" | null;
const GESTOS: Exclude<Gesto, null>[] = ["saluda", "pasitos", "mira", "saluda", "pasitos"];

const sinMovimiento = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/// Un gesto cada pocos segundos mientras está abierto (y la persona no pida menos movimiento).
function useGestos(abierto: boolean): Gesto {
  const [gesto, setGesto] = useState<Gesto>(null);
  useEffect(() => {
    if (!abierto || sinMovimiento()) return;
    let activo = true;
    let espera: ReturnType<typeof setTimeout>;
    const proximo = () => {
      espera = setTimeout(
        () => {
          if (!activo) return;
          setGesto(GESTOS[Math.floor(Math.random() * GESTOS.length)]);
          espera = setTimeout(() => {
            if (!activo) return;
            setGesto(null);
            proximo();
          }, 2000);
        },
        5000 + Math.random() * 6000,
      );
    };
    proximo();
    return () => {
      activo = false;
      clearTimeout(espera);
      setGesto(null);
    };
  }, [abierto]);
  return gesto;
}

/// Parpadeo cada pocos segundos mientras está abierto.
function useParpadeo(abierto: boolean): boolean {
  const [cerrados, setCerrados] = useState(false);
  useEffect(() => {
    if (!abierto || sinMovimiento()) return;
    let activo = true;
    let espera: ReturnType<typeof setTimeout>;
    const proximo = () => {
      espera = setTimeout(
        () => {
          if (!activo) return;
          setCerrados(true);
          espera = setTimeout(() => {
            if (!activo) return;
            setCerrados(false);
            proximo();
          }, 150);
        },
        2500 + Math.random() * 3500,
      );
    };
    proximo();
    return () => {
      activo = false;
      clearTimeout(espera);
      setCerrados(false);
    };
  }, [abierto]);
  return cerrados;
}

export function Pulsarito({
  abierto,
  llama,
  botonRef,
  onClick,
  ariaLabel,
  titulo,
  ariaControls,
}: {
  abierto: boolean;
  /// Hay un mensaje en el aire: el anillo late más para llamar la atención.
  llama: boolean;
  botonRef: RefObject<HTMLButtonElement | null>;
  onClick: () => void;
  ariaLabel: string;
  titulo: string;
  ariaControls?: string;
}) {
  const id = useId().replace(/:/g, "");
  const gesto = useGestos(abierto);
  const parpadea = useParpadeo(abierto);
  const clases = ["pul", abierto ? "abierto" : "", llama && !abierto ? "llama" : "", gesto ? `gesto-${gesto}` : "", parpadea ? "parpadea" : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      ref={botonRef}
      type="button"
      onClick={onClick}
      aria-expanded={abierto}
      aria-controls={abierto ? ariaControls : undefined}
      aria-label={ariaLabel}
      title={titulo}
      className="rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 print:hidden"
    >
      <span className={clases}>
        <span className="pul-mover">
          {/* Cerrado se ve solo el botón; abierto, el personaje entero (misma escala: 0,8 px por unidad). */}
          <svg viewBox={abierto ? "6 30 108 128" : "17 34 78 84"} aria-hidden="true">
            <defs>
              <linearGradient id={`${id}-bisel`} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#3a3b40" />
                <stop offset="1" stopColor="#0c0d0f" />
              </linearGradient>
              <radialGradient id={`${id}-tapa`} cx=".42" cy=".38" r=".75">
                <stop offset="0" stopColor="#26272c" />
                <stop offset="1" stopColor="#121316" />
              </radialGradient>
              <filter id={`${id}-brillo`} x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="2.6" />
              </filter>
              <clipPath id={`${id}-rosca`}>
                <ellipse cx="76" cy="78" rx="27" ry="32" />
              </clipPath>
            </defs>

            {/* Pies y piernas, detrás del cuerpo */}
            <g className="pul-pierna pul-pierna-i">
              <line x1="46" y1="106" x2="46" y2="147" stroke="#2a2b30" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="42" cy="149" rx="9" ry="4.5" fill="#2a2b30" />
            </g>
            <g className="pul-pierna pul-pierna-d">
              <line x1="70" y1="106" x2="70" y2="147" stroke="#2a2b30" strokeWidth="5" strokeLinecap="round" />
              <ellipse cx="74" cy="149" rx="9" ry="4.5" fill="#2a2b30" />
            </g>

            {/* Cuerpo roscado de atrás */}
            <path d="M54 40 L76 46 L76 110 L54 113 Z" fill="#141518" />
            <ellipse cx="76" cy="78" rx="27" ry="32" fill="#141518" />
            <g clipPath={`url(#${id}-rosca)`} fill="none" stroke="#33343a" strokeWidth="2.2">
              {[72, 78, 84, 90, 96].map((x) => (
                <path key={x} d={`M${x} 44 Q${x + 10} 78 ${x} 112`} />
              ))}
            </g>

            {/* Bisel, anillo de luz azul y tapa */}
            <ellipse cx="56" cy="76" rx="34" ry="37" fill={`url(#${id}-bisel)`} stroke="#0a0a0c" strokeWidth="1.2" />
            <g className="pul-anillo">
              <ellipse cx="56" cy="76" rx="26" ry="28.5" fill="none" stroke="#1f7bff" strokeWidth="5" opacity=".75" filter={`url(#${id}-brillo)`} />
              <ellipse cx="56" cy="76" rx="26" ry="28.5" fill="none" stroke="#3fa9ff" strokeWidth="3.4" />
              <ellipse cx="56" cy="76" rx="26" ry="28.5" fill="none" stroke="#c9ecff" strokeWidth="1" opacity=".8" />
            </g>
            <ellipse cx="56" cy="76" rx="23.6" ry="26" fill={`url(#${id}-tapa)`} />
            <path d="M40 64 Q48 54 60 53" fill="none" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" opacity=".12" />

            {/* Cerrado: el interrogante de "ayuda" sobre la tapa */}
            <text className="pul-interrogante" x="56" y="86" textAnchor="middle" fontSize="28" fontWeight="700" fill="#9fd0ff" fontFamily="system-ui, sans-serif">
              ?
            </text>

            {/* Manos, delante */}
            <g className="pul-brazo pul-brazo-i">
              <path d="M25 84 Q16 92 15 104" fill="none" stroke="#2a2b30" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="15" cy="106" r="5" fill="#fafafa" stroke="#2a2b30" strokeWidth="2.2" />
            </g>
            <g className="pul-brazo pul-brazo-d">
              <path d="M98 84 Q106 92 107 104" fill="none" stroke="#2a2b30" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="107" cy="106" r="5" fill="#fafafa" stroke="#2a2b30" strokeWidth="2.2" />
            </g>

            {/* Cara en la tapa */}
            <g className="pul-cara">
              <g className="pul-ojos">
                <ellipse cx="48.5" cy="70" rx="5" ry="6" fill="#fff" />
                <ellipse cx="63.5" cy="70" rx="5" ry="6" fill="#fff" />
                <g className="pul-pupilas">
                  <circle cx="49" cy="71" r="2.9" fill="#0b1a2c" />
                  <circle cx="64" cy="71" r="2.9" fill="#0b1a2c" />
                  <circle cx="50" cy="69.6" r="1" fill="#fff" />
                  <circle cx="65" cy="69.6" r="1" fill="#fff" />
                </g>
              </g>
              <path d="M47 83 Q56 91 65 83" fill="none" stroke="#9fd0ff" strokeWidth="2.6" strokeLinecap="round" />
            </g>
          </svg>
        </span>
      </span>
    </button>
  );
}
