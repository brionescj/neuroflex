import type { ReactElement } from "react";

import type { MiniCaseImageKey } from "@/config/miniCaseImages";

/**
 * Dibujos de apoyo de los mini casos: escenas planas y sin texto, dibujadas en SVG (sin archivos ni
 * fotos) en una hoja de 320 x 200. Muestran el lugar o el material del caso, sin personas ni letras:
 * sirven para despejar la mente 4 segundos, no para recordar el caso.
 */
export const SCENE_WIDTH = 320;
export const SCENE_HEIGHT = 200;

const INK = "#3b4252";
const CREAM = "#fdf6e3";
const WOOD = "#d9a066";
const WOOD_DARK = "#b9824a";
const SKY = "#bfe6f7";
const GRASS = "#8fd18f";
const BLUE = "#4f8fe0";
const TEAL = "#3aa6a0";
const ORANGE = "#f4a259";
const RED = "#e76f51";
const YELLOW = "#f6c945";
const PURPLE = "#8e7dd6";
const PINK = "#f1a7c4";
const GREEN = "#5bb46b";

export const SCENES: Record<MiniCaseImageKey, () => ReactElement> = {
  aula: () => (
    <>
      <rect width="320" height="200" fill={CREAM} />
      <rect y="150" width="320" height="50" fill={WOOD} />
      <rect x="8" y="22" width="190" height="104" rx="6" fill={WOOD_DARK} />
      <rect x="14" y="28" width="178" height="92" rx="3" fill="#2f6f5e" />
      <circle cx="62" cy="68" r="20" fill="none" stroke="#fff" strokeWidth="3" opacity=".85" />
      <path d="M100 52h70M100 68h56M100 84h66" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".85" />
      <rect x="30" y="118" width="40" height="5" rx="2" fill="#fff" />
      <rect x="226" y="30" width="78" height="86" rx="4" fill="#fff" stroke={WOOD_DARK} strokeWidth="5" />
      <rect x="231" y="35" width="68" height="76" fill={SKY} />
      <circle cx="285" cy="52" r="10" fill={YELLOW} />
      <path d="M231 111V92q16-14 32-4t36-6v29z" fill={GRASS} />
      <path d="M265 35v76M231 73h68" stroke="#fff" strokeWidth="4" />
      {[26, 118, 210].map((x, i) => (
        <g key={x}>
          <rect x={x} y="140" width="84" height="10" rx="3" fill={[BLUE, ORANGE, TEAL][i]} />
          <path d={`M${x + 10} 150v34M${x + 74} 150v34`} stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <rect x={x + 24} y="126" width="14" height="14" rx="2" fill="#fff" />
          <rect x={x + 44} y="130" width="20" height="10" rx="2" fill={YELLOW} />
        </g>
      ))}
    </>
  ),

  "mesa-equipo": () => (
    <>
      <rect width="320" height="200" fill="#e7eefb" />
      <rect y="150" width="320" height="50" fill="#cfd9ee" />
      <rect x="30" y="18" width="150" height="82" rx="5" fill="#fff" stroke="#9aa7c4" strokeWidth="4" />
      {[
        [44, 30, YELLOW],
        [76, 40, PINK],
        [108, 30, "#9ad8a8"],
        [140, 42, ORANGE],
        [56, 66, "#9ec5f7"],
        [96, 68, YELLOW],
        [130, 70, PINK],
      ].map(([x, y, fill]) => (
        <rect key={`${x}-${y}`} x={x as number} y={y as number} width="24" height="22" rx="2" fill={fill as string} />
      ))}
      <path d="M200 40q20-22 40 0t40 0" fill="none" stroke="#9aa7c4" strokeWidth="4" strokeLinecap="round" />
      <rect x="236" y="62" width="48" height="34" rx="3" fill="#fff" stroke="#9aa7c4" strokeWidth="3" />
      <path d="M244 88l10-12 10 8 12-16 8 10" fill="none" stroke={TEAL} strokeWidth="3" strokeLinejoin="round" />
      <ellipse cx="160" cy="146" rx="112" ry="26" fill={WOOD} />
      <ellipse cx="160" cy="140" rx="112" ry="26" fill="#e9b97e" />
      <rect x="150" y="162" width="20" height="26" fill={WOOD_DARK} />
      {[
        [44, 156],
        [276, 156],
        [96, 112],
        [224, 112],
      ].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="20" ry="9" fill={[BLUE, ORANGE, TEAL, PURPLE][i]} />
      ))}
      <rect x="96" y="124" width="44" height="30" rx="3" fill="#fff" transform="rotate(-8 118 139)" />
      <rect x="178" y="126" width="46" height="30" rx="3" fill="#fffbe8" transform="rotate(6 200 141)" />
      <path d="M104 134h28M104 142h22M186 136h30M186 144h20" stroke="#9aa7c4" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="140" y="104" width="40" height="24" rx="3" fill="#4a5568" />
      <rect x="144" y="108" width="32" height="16" fill="#9ec5f7" />
      <path d="M134 128h52l-6 6h-40z" fill="#6b7280" />
      <circle cx="232" cy="132" r="9" fill="#fff" stroke="#9aa7c4" strokeWidth="2" />
    </>
  ),

  patio: () => (
    <>
      <rect width="320" height="200" fill={SKY} />
      <circle cx="270" cy="38" r="20" fill={YELLOW} />
      <g fill="#fff">
        <ellipse cx="70" cy="40" rx="28" ry="11" />
        <ellipse cx="92" cy="34" rx="20" ry="10" />
        <ellipse cx="190" cy="58" rx="24" ry="9" />
      </g>
      <rect y="136" width="320" height="64" fill={GRASS} />
      <path d="M0 150h320" stroke="#78bd78" strokeWidth="2" />
      <rect x="150" y="150" width="140" height="40" rx="4" fill="#f0e2b8" />
      <path d="M160 156h28v14h-28zM188 170h28v14h-28zM216 156h28v14h-28z" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M26 150V76M70 150V76M26 76l22-20M70 76L48 56" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M38 76v52M58 76v52" stroke={INK} strokeWidth="2" />
      <rect x="32" y="126" width="30" height="7" rx="2" fill={RED} />
      <path d="M214 150l44-76h14v10h-8l-38 66z" fill={BLUE} />
      <path d="M262 74V150M276 74V150M262 98h14M262 118h14M262 136h14" stroke={INK} strokeWidth="3" />
      <rect x="228" y="62" width="48" height="8" rx="2" fill={ORANGE} />
      <rect x="112" y="92" width="10" height="58" fill={WOOD_DARK} />
      <circle cx="117" cy="80" r="26" fill="#4ea75e" />
      <circle cx="100" cy="94" r="16" fill="#5bb46b" />
      <circle cx="134" cy="94" r="16" fill="#5bb46b" />
      <circle cx="196" cy="170" r="9" fill={RED} />
      <path d="M187 170h18M196 161v18" stroke="#fff" strokeWidth="2" />
    </>
  ),

  "rutina-visual": () => (
    <>
      <rect width="320" height="200" fill="#eef3fb" />
      <rect x="16" y="28" width="288" height="108" rx="10" fill="#fff" stroke="#c6d2ea" strokeWidth="4" />
      <rect x="28" y="40" width="264" height="10" rx="5" fill="#c6d2ea" />
      {[0, 1, 2, 3].map((i) => {
        const x = 34 + i * 66;

        return (
          <g key={i}>
            <rect x={x} y="62" width="56" height="64" rx="8" fill="#fff" stroke={[YELLOW, BLUE, GREEN, RED][i]} strokeWidth="5" />
            {i < 3 && <path d={`M${x + 58} 94h6m-3-4l4 4-4 4`} stroke={INK} strokeWidth="2" fill="none" strokeLinecap="round" />}
          </g>
        );
      })}
      <g>
        <circle cx="62" cy="94" r="11" fill={YELLOW} />
        <path d="M62 74v6M62 108v6M42 94h6M76 94h6M48 80l4 4M72 104l4 4M76 80l-4 4M52 104l-4 4" stroke={ORANGE} strokeWidth="3" strokeLinecap="round" />
      </g>
      <g>
        <path d="M110 84q12-6 22 0v22q-10-6-22 0z" fill="#fff" stroke={BLUE} strokeWidth="3" strokeLinejoin="round" />
        <path d="M132 84q12-6 22 0v22q-10-6-22 0z" fill="#dbe8fc" stroke={BLUE} strokeWidth="3" strokeLinejoin="round" />
      </g>
      <g>
        <circle cx="194" cy="94" r="14" fill={GREEN} />
        <path d="M180 94h28M194 80v28" stroke="#fff" strokeWidth="2" opacity=".7" />
        <circle cx="194" cy="94" r="14" fill="none" stroke="#3f8f50" strokeWidth="2" />
      </g>
      <g>
        <path d="M260 84c-12-8-22 6-16 20 4 8 10 8 16 5 6 3 12 3 16-5 6-14-4-28-16-20z" fill={RED} />
        <path d="M260 84q2-10 10-12" stroke="#3f8f50" strokeWidth="3" fill="none" strokeLinecap="round" />
      </g>
      <rect y="150" width="320" height="50" fill="#dfe7f6" />
      <rect x="120" y="152" width="80" height="12" rx="6" fill="#c6d2ea" />
      <circle cx="262" cy="172" r="12" fill="#fff" stroke={INK} strokeWidth="3" />
      <path d="M262 172v-7M262 172l5 3" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),

  cuaderno: () => (
    <>
      <rect width="320" height="200" fill={WOOD} />
      <path d="M0 40h320M0 90h320M0 150h320" stroke={WOOD_DARK} strokeWidth="1.5" opacity=".5" />
      <path d="M40 40l120 10 120-10v118l-120 12-120-12z" fill="#fff" stroke="#d6dbe6" strokeWidth="3" strokeLinejoin="round" />
      <path d="M160 50v120" stroke="#d6dbe6" strokeWidth="3" />
      <g stroke="#9ec5f7" strokeWidth="2.5" strokeLinecap="round">
        <path d="M58 70l88 6M58 86l88 6M58 102l88 6M58 118l88 6M58 134l60 4" />
        <path d="M174 76l88-6M174 92l88-6M174 108l88-6" />
      </g>
      <path d="M58 70v70" stroke="#f1a7c4" strokeWidth="2" />
      <circle cx="214" cy="132" r="14" fill="none" stroke={ORANGE} strokeWidth="4" />
      <path d="M244 124l10 14 10-14" fill="none" stroke={TEAL} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="rotate(-24 270 150)">
        <rect x="200" y="162" width="100" height="12" rx="2" fill={YELLOW} />
        <path d="M300 162l16 6-16 6z" fill="#f2d8b0" />
        <path d="M310 166l6 2-6 2z" fill={INK} />
        <rect x="200" y="162" width="12" height="12" fill={PINK} />
      </g>
      <rect x="14" y="152" width="84" height="16" rx="2" fill="#f4d35e" transform="rotate(-8 56 160)" />
      <path d="M26 152v8M38 150v6M50 148v8M62 146v6M74 144v8M86 142v6" stroke={INK} strokeWidth="1.5" transform="rotate(-8 56 160)" />
      <rect x="284" y="26" width="26" height="14" rx="4" fill={BLUE} />
    </>
  ),

  globo: () => (
    <>
      <rect width="320" height="200" fill="#e9e6fb" />
      <rect y="156" width="320" height="44" fill="#d3cff2" />
      <g opacity=".9">
        <path d="M30 40h58a8 8 0 0 1 8 8v22a8 8 0 0 1-8 8H56l-14 12v-12h-12a8 8 0 0 1-8-8V48a8 8 0 0 1 8-8z" fill="#fff" />
        <circle cx="48" cy="60" r="4" fill={PURPLE} />
        <circle cx="62" cy="60" r="4" fill={PINK} />
        <circle cx="76" cy="60" r="4" fill={TEAL} />
        <path d="M240 30h50a8 8 0 0 1 8 8v20a8 8 0 0 1-8 8h-10v12l-14-12h-26a8 8 0 0 1-8-8V38a8 8 0 0 1 8-8z" fill="#fff" />
        <path d="M236 48h50M236 56h34" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
      </g>
      <path d="M118 150q42 22 84 0" fill="none" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <rect x="146" y="164" width="28" height="10" rx="3" fill={INK} />
      <circle cx="160" cy="100" r="54" fill={BLUE} />
      <path d="M130 70q16-14 30-4 8 14-6 20-10-2-14 8-10 0-10-24zM168 96q18-8 26 8-4 22-18 26-8-14-8-34zM142 112q10 6 6 20-10 2-14-8z" fill={GREEN} />
      <ellipse cx="160" cy="100" rx="54" ry="20" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".6" />
      <ellipse cx="160" cy="100" rx="22" ry="54" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".6" />
      <path d="M120 70q40 10 80 0M114 120q46 14 92 0" fill="none" stroke="#fff" strokeWidth="1.5" opacity=".5" />
      <circle cx="160" cy="46" r="3" fill={INK} />
      <path d="M240 150l36-14-8 34-10-10z" fill="#fff" stroke={PURPLE} strokeWidth="3" strokeLinejoin="round" />
      <path d="M268 136l-18 18" stroke={PURPLE} strokeWidth="2" />
    </>
  ),

  bloques: () => (
    <>
      <rect width="320" height="200" fill="#fff4de" />
      <rect x="20" y="30" width="110" height="80" rx="4" fill={WOOD_DARK} />
      <rect x="26" y="36" width="98" height="30" fill="#f3d9b1" />
      <rect x="26" y="72" width="98" height="32" fill="#f3d9b1" />
      <circle cx="48" cy="56" r="10" fill={RED} />
      <rect x="68" y="44" width="18" height="18" fill={BLUE} />
      <path d="M96 62l10-18 10 18z" fill={YELLOW} />
      <rect x="36" y="82" width="26" height="16" rx="2" fill={TEAL} />
      <circle cx="90" cy="92" r="9" fill={PURPLE} />
      <rect y="150" width="320" height="50" fill="#e4c590" />
      <ellipse cx="170" cy="168" rx="130" ry="22" fill="#9ed1c9" />
      <ellipse cx="170" cy="168" rx="104" ry="15" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="8 8" />
      <rect x="146" y="140" width="48" height="24" rx="2" fill={BLUE} />
      <rect x="152" y="116" width="40" height="24" rx="2" fill={YELLOW} />
      <rect x="158" y="92" width="32" height="24" rx="2" fill={RED} />
      <path d="M156 92l18-24 18 24z" fill={GREEN} />
      <rect x="228" y="148" width="30" height="18" rx="2" fill={ORANGE} transform="rotate(14 243 157)" />
      <rect x="262" y="154" width="26" height="22" rx="2" fill={PURPLE} transform="rotate(-20 275 165)" />
      <circle cx="108" cy="160" r="10" fill={TEAL} />
      <rect x="84" y="170" width="28" height="16" rx="2" fill={PINK} transform="rotate(8 98 178)" />
    </>
  ),

  matematicas: () => (
    <>
      <rect width="320" height="200" fill="#e8f5ee" />
      <rect y="152" width="320" height="48" fill={WOOD} />
      <rect x="22" y="40" width="120" height="96" rx="6" fill="none" stroke={WOOD_DARK} strokeWidth="8" />
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          <path d={`M26 ${58 + row * 24}h112`} stroke={INK} strokeWidth="2.5" />
          {Array.from({ length: row + 2 }, (_, i) => (
            <circle key={i} cx={42 + i * 16} cy={58 + row * 24} r="7.5" fill={[RED, ORANGE, BLUE, GREEN][row]} />
          ))}
          {Array.from({ length: 3 - (row % 3) }, (_, i) => (
            <circle key={`r${i}`} cx={122 - i * 16} cy={58 + row * 24} r="7.5" fill={[YELLOW, TEAL, PURPLE, PINK][row]} />
          ))}
        </g>
      ))}
      <path d="M176 120h38v-38h-38z" fill={BLUE} />
      <path d="M232 120l20-40 20 40z" fill={YELLOW} />
      <circle cx="198" cy="64" r="16" fill={RED} />
      <path d="M170 150l24-14 24 14-24 14zM170 150v28l24 14v-28zM194 164v28l24-14v-28z" fill={GREEN} />
      <path d="M170 150l24-14 24 14-24 14z" fill="#7fd08c" />
      <path d="M194 164v28l-24-14v-28z" fill="#3f9a50" />
      <path d="M232 160h60" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <path key={i} d={`M${236 + i * 10.5} 155v10`} stroke={INK} strokeWidth="2.5" />
      ))}
      <circle cx="236" cy="160" r="4" fill={ORANGE} />
      <circle cx="278" cy="160" r="4" fill={ORANGE} />
    </>
  ),

  "reunion-familia": () => (
    <>
      <rect width="320" height="200" fill="#fdeedd" />
      <rect y="152" width="320" height="48" fill="#d9b48f" />
      <rect x="22" y="26" width="72" height="54" rx="3" fill="#fff" stroke={WOOD_DARK} strokeWidth="5" />
      <path d="M27 76V58q16-12 28-2t34-4v22z" fill={GRASS} />
      <circle cx="74" cy="42" r="7" fill={YELLOW} />
      <rect x="226" y="30" width="70" height="86" rx="4" fill="#fff" stroke={WOOD_DARK} strokeWidth="5" />
      <rect x="231" y="35" width="60" height="76" fill={SKY} />
      <path d="M261 35v76" stroke="#fff" strokeWidth="4" />
      <path d="M228 34l16 14M296 34l-16 14" stroke="#f4a259" strokeWidth="5" opacity=".6" />
      <ellipse cx="160" cy="144" rx="70" ry="14" fill={WOOD} />
      <rect x="92" y="130" width="136" height="12" rx="4" fill="#e9b97e" />
      <path d="M110 142v34M210 142v34" stroke={WOOD_DARK} strokeWidth="6" strokeLinecap="round" />
      <rect x="130" y="112" width="48" height="22" rx="2" fill={ORANGE} />
      <rect x="130" y="108" width="20" height="6" rx="2" fill="#e08a34" />
      <rect x="190" y="112" width="20" height="16" rx="3" fill="#fff" stroke="#9aa7c4" strokeWidth="2.5" />
      <path d="M210 117q8 0 8 6t-8 6" fill="none" stroke="#9aa7c4" strokeWidth="2.5" />
      <path d="M28 160v-44q0-12 10-12h22q10 0 10 12v24H38z" fill={BLUE} />
      <path d="M28 160v20M70 140v40M34 140h36" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M292 160v-44q0-12-10-12h-22q-10 0-10 12v24h22z" fill={TEAL} />
      <path d="M292 160v20M250 140v40M286 140h-36" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <rect x="150" y="72" width="22" height="26" rx="4" fill={WOOD_DARK} />
      <path d="M161 72q-14-20-8-30 10 4 8 30zM161 72q14-20 8-30-10 4-8 30z" fill={GREEN} />
    </>
  ),

  laboratorio: () => (
    <>
      <rect width="320" height="200" fill="#eaf6ef" />
      <rect x="214" y="22" width="84" height="82" rx="4" fill="#fff" stroke={WOOD_DARK} strokeWidth="5" />
      <rect x="219" y="27" width="74" height="72" fill={SKY} />
      <circle cx="274" cy="44" r="9" fill={YELLOW} />
      <path d="M256 27v72" stroke="#fff" strokeWidth="4" />
      <rect y="136" width="320" height="64" fill={WOOD} />
      <rect y="136" width="320" height="10" fill="#e9b97e" />
      {[0, 1, 2].map((i) => {
        const x = 40 + i * 70;

        return (
          <g key={i}>
            <path d={`M${x - 20} 100h40l-6 36h-28z`} fill={RED} />
            <rect x={x - 22} y="96" width="44" height="8" rx="3" fill="#d4573b" />
            <path d={`M${x - 14} 100q14 4 28 0`} fill="none" stroke="#6b4a2f" strokeWidth="1" />
            {i === 0 && <circle cx={x} cy="94" r="3" fill="#6b4a2f" />}
            {i === 1 && (
              <>
                <path d={`M${x} 98V78`} stroke={GREEN} strokeWidth="3" strokeLinecap="round" />
                <path d={`M${x} 84q-12-2-14-12 10 0 14 12zM${x} 84q12-2 14-12-10 0-14 12z`} fill={GREEN} />
              </>
            )}
            {i === 2 && (
              <>
                <path d={`M${x} 98V56`} stroke={GREEN} strokeWidth="4" strokeLinecap="round" />
                <path d={`M${x} 82q-18-2-20-16 14 0 20 16zM${x} 70q18-2 20-16-14 0-20 16zM${x} 58q-12-2-14-12 10 0 14 12z`} fill="#4ea75e" />
              </>
            )}
          </g>
        );
      })}
      <path d="M232 112h24l8 24h-40z" fill="#9ec5f7" opacity=".85" />
      <rect x="230" y="108" width="28" height="6" rx="2" fill="#dbe8fc" />
      <path d="M270 128h26v8h-26z" fill={BLUE} />
      <path d="M284 128q10-14 22-12" fill="none" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
      <circle cx="110" cy="166" r="14" fill="none" stroke={INK} strokeWidth="4" />
      <path d="M120 176l16 14" stroke={INK} strokeWidth="5" strokeLinecap="round" />
    </>
  ),

  biblioteca: () => (
    <>
      <rect width="320" height="200" fill="#f6ecdd" />
      <rect y="156" width="320" height="44" fill="#d9b48f" />
      <rect x="14" y="16" width="168" height="144" rx="4" fill={WOOD_DARK} />
      {[0, 1, 2, 3].map((row) => (
        <g key={row}>
          <rect x="20" y={22 + row * 34} width="156" height="30" fill="#f3d9b1" />
          {Array.from({ length: 9 }, (_, i) => {
            const colors = [RED, BLUE, YELLOW, GREEN, PURPLE, ORANGE, TEAL, PINK, BLUE];
            const h = 20 + ((i * 7 + row * 5) % 9);

            return (
              <rect
                key={i}
                x={24 + i * 16.5}
                y={52 + row * 34 - h}
                width="13"
                height={h}
                rx="1.5"
                fill={colors[(i + row * 3) % colors.length]}
              />
            );
          })}
        </g>
      ))}
      <ellipse cx="248" cy="176" rx="64" ry="12" fill="#e8a5a0" />
      <path d="M214 160v-34q0-14 14-14h40q14 0 14 14v34z" fill={TEAL} />
      <rect x="206" y="138" width="14" height="30" rx="6" fill="#2e8a85" />
      <rect x="276" y="138" width="14" height="30" rx="6" fill="#2e8a85" />
      <rect x="220" y="146" width="56" height="22" rx="6" fill="#4cbab3" />
      <path d="M298 156V70" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M284 70l14-22 14 22z" fill={YELLOW} />
      <circle cx="298" cy="76" r="22" fill={YELLOW} opacity=".25" />
      <path d="M236 108l12-8 12 8v14l-12-8-12 8z" fill="#fff" stroke={BLUE} strokeWidth="2.5" strokeLinejoin="round" />
    </>
  ),

  circulo: () => (
    <>
      <rect width="320" height="200" fill="#fdf1e6" />
      <rect y="112" width="320" height="88" fill="#e8d3b5" />
      <ellipse cx="160" cy="132" rx="116" ry="46" fill="#9ed1c9" />
      <ellipse cx="160" cy="132" rx="88" ry="32" fill="none" stroke="#fff" strokeWidth="3" strokeDasharray="10 8" />
      <circle cx="160" cy="130" r="16" fill={YELLOW} />
      <circle cx="160" cy="130" r="7" fill={ORANGE} />
      {[
        [160, 78, RED],
        [100, 92, BLUE],
        [220, 92, GREEN],
        [58, 130, PURPLE],
        [262, 130, TEAL],
        [100, 168, ORANGE],
        [220, 168, PINK],
        [160, 176, BLUE],
      ].map(([x, y, fill], i) => (
        <g key={i}>
          <ellipse cx={x as number} cy={(y as number) + 14} rx="17" ry="5" fill="#000" opacity=".12" />
          <rect x={(x as number) - 14} y={(y as number) - 14} width="28" height="26" rx="8" fill={fill as string} />
          <rect x={(x as number) - 14} y={(y as number) - 22} width="28" height="12" rx="6" fill={fill as string} />
          <path d={`M${(x as number) - 10} ${(y as number) + 12}v6M${(x as number) + 10} ${(y as number) + 12}v6`} stroke={INK} strokeWidth="3" strokeLinecap="round" />
        </g>
      ))}
      <g opacity=".95">
        <circle cx="42" cy="34" r="12" fill="#fff" />
        <circle cx="42" cy="34" r="5" fill={PINK} />
        <circle cx="278" cy="40" r="14" fill="#fff" />
        <path d="M270 40h16M278 32v16" stroke={BLUE} strokeWidth="3" strokeLinecap="round" />
      </g>
    </>
  ),

  "rincon-calma": () => (
    <>
      <rect width="320" height="200" fill="#e4e0f7" />
      <rect y="150" width="320" height="50" fill="#cfc8ee" />
      <g stroke={INK} strokeWidth="2" opacity=".6">
        <path d="M60 0v34M130 0v52M200 0v28M262 0v46" />
      </g>
      <path d="M60 34m-18 6a18 12 0 0 1 36 0a10 8 0 0 1-8 8h-22a10 8 0 0 1-6-14z" fill="#fff" />
      <path d="M130 52l8 16 18 2-13 12 3 18-16-9-16 9 3-18-13-12 18-2z" fill={YELLOW} transform="scale(.9) translate(14 6)" />
      <path d="M200 28m-16 4a16 11 0 0 1 32 0a9 7 0 0 1-8 7h-18a9 7 0 0 1-6-11z" fill="#dbe8fc" />
      <circle cx="262" cy="64" r="16" fill={PINK} />
      <path d="M254 64q8 8 16 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
      <ellipse cx="160" cy="176" rx="130" ry="16" fill="#b9d8ea" />
      <path d="M88 168q-10-52 56-54t74 40q10 14-6 22-30 10-70 8-40-2-54-16z" fill={PURPLE} />
      <path d="M110 128q40-22 80-4" fill="none" stroke="#fff" strokeWidth="3" opacity=".45" strokeLinecap="round" />
      <path d="M248 160l-6-28h38l-6 28z" fill={ORANGE} />
      <path d="M261 132q-22-18-14-40 14 6 14 40zM261 132q20-22 12-44-14 8-12 44zM261 132q-2-30 6-48" fill={GREEN} />
      <circle cx="40" cy="120" r="30" fill={YELLOW} opacity=".3" />
      <path d="M40 146v30" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <path d="M26 118q14-30 28 0z" fill={YELLOW} />
      <rect x="26" y="116" width="28" height="6" rx="3" fill="#e0b52c" />
    </>
  ),

  taller: () => (
    <>
      <rect width="320" height="200" fill="#e9eef5" />
      <rect x="0" y="0" width="320" height="104" fill="#d5dde9" />
      {Array.from({ length: 7 }, (_, r) =>
        Array.from({ length: 16 }, (_, c) => <circle key={`${r}-${c}`} cx={10 + c * 20} cy={10 + r * 14} r="1.6" fill="#aab6c8" />),
      )}
      <path d="M30 40l28-4v12l-28 4zM38 52v36" fill={RED} stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <rect x="40" y="38" width="14" height="10" fill="#9aa7c4" transform="rotate(-8 47 43)" />
      <path d="M96 38a8 8 0 0 1 16 0v14h-6v36h-4V52h-6z" fill={BLUE} stroke={INK} strokeWidth="2" />
      <path d="M150 36l10-6h12l10 6v14l-10 6h-12l-10-6z" fill="#9aa7c4" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="166" cy="43" r="5" fill="#d5dde9" stroke={INK} strokeWidth="2" />
      <path d="M200 46h40" stroke={ORANGE} strokeWidth="8" strokeLinecap="round" />
      <path d="M200 46v34" stroke={INK} strokeWidth="3" />
      <rect x="258" y="30" width="48" height="52" rx="4" fill="#fff" stroke="#aab6c8" strokeWidth="3" />
      <path d="M266 44h32M266 56h24M266 68h30" stroke="#aab6c8" strokeWidth="3" strokeLinecap="round" />
      <rect x="0" y="130" width="320" height="70" fill={WOOD} />
      <rect x="0" y="122" width="320" height="14" rx="3" fill="#e9b97e" />
      <rect x="24" y="96" width="62" height="30" rx="4" fill="#9aa7c4" />
      <path d="M24 108h62" stroke="#fff" strokeWidth="2" />
      <rect x="32" y="82" width="46" height="18" fill={YELLOW} />
      <circle cx="150" cy="104" r="20" fill="none" stroke={INK} strokeWidth="6" strokeDasharray="7 5" />
      <circle cx="150" cy="104" r="9" fill={TEAL} />
      <circle cx="190" cy="112" r="13" fill="none" stroke={INK} strokeWidth="5" strokeDasharray="5 4" />
      <circle cx="190" cy="112" r="5" fill={ORANGE} />
      <rect x="226" y="104" width="22" height="18" rx="2" fill={BLUE} />
      <rect x="252" y="96" width="22" height="26" rx="2" fill={RED} />
      <rect x="278" y="110" width="22" height="12" rx="2" fill={GREEN} />
      <rect x="20" y="150" width="140" height="42" rx="3" fill={WOOD_DARK} />
      <rect x="28" y="158" width="58" height="26" rx="2" fill="#c99a6b" />
      <rect x="94" y="158" width="58" height="26" rx="2" fill="#c99a6b" />
      <circle cx="57" cy="171" r="3" fill={INK} />
      <circle cx="123" cy="171" r="3" fill={INK} />
    </>
  ),

  espacio: () => (
    <>
      <rect width="320" height="200" fill="#1f2a56" />
      {[
        [20, 24], [60, 70], [96, 16], [140, 48], [180, 20], [214, 64], [250, 26], [296, 52],
        [34, 120], [84, 150], [130, 112], [176, 140], [226, 118], [286, 128], [304, 90],
      ].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2 : 1.3} fill="#fff" opacity={i % 2 ? 0.7 : 1} />
      ))}
      <circle cx="238" cy="62" r="30" fill={ORANGE} />
      <path d="M212 56q26 10 52-2M210 72q28 8 56 0" fill="none" stroke="#e08a34" strokeWidth="4" opacity=".7" />
      <ellipse cx="238" cy="62" rx="52" ry="11" fill="none" stroke={YELLOW} strokeWidth="4" transform="rotate(-18 238 62)" />
      <circle cx="56" cy="50" r="18" fill="#e8e8f0" />
      <circle cx="50" cy="46" r="4" fill="#c9c9d8" />
      <circle cx="62" cy="58" r="3" fill="#c9c9d8" />
      <path d="M118 150l-30 40M118 150l30 40M118 150v40" stroke="#9aa7c4" strokeWidth="5" strokeLinecap="round" />
      <g transform="rotate(-38 118 150)">
        <rect x="76" y="132" width="86" height="22" rx="6" fill={BLUE} />
        <rect x="156" y="128" width="22" height="30" rx="4" fill="#9ec5f7" />
        <rect x="64" y="136" width="14" height="14" rx="3" fill={INK} />
      </g>
      <g transform="translate(222 134) rotate(35)">
        <path d="M0 -26q12 12 12 30v14h-24v-14q0-18 12-30z" fill="#fff" />
        <circle cx="0" cy="-2" r="5" fill={SKY} />
        <path d="M-12 12l-10 12 10-2zM12 12l10 12-10-2z" fill={RED} />
        <path d="M-5 22l5 12 5-12z" fill={YELLOW} />
      </g>
    </>
  ),

  reloj: () => (
    <>
      <rect width="320" height="200" fill="#fff0e0" />
      <rect y="160" width="320" height="40" fill="#e7cfae" />
      <circle cx="108" cy="92" r="64" fill={WOOD_DARK} />
      <circle cx="108" cy="92" r="56" fill="#fff" />
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI) / 6;

        return (
          <path
            key={i}
            d={`M${108 + Math.sin(angle) * 46} ${92 - Math.cos(angle) * 46}L${108 + Math.sin(angle) * (i % 3 === 0 ? 38 : 41)} ${92 - Math.cos(angle) * (i % 3 === 0 ? 38 : 41)}`}
            stroke={INK}
            strokeWidth={i % 3 === 0 ? 4 : 2.5}
            strokeLinecap="round"
          />
        );
      })}
      <path d="M108 92V58" stroke={INK} strokeWidth="5" strokeLinecap="round" />
      <path d="M108 92l24 14" stroke={RED} strokeWidth="4" strokeLinecap="round" />
      <circle cx="108" cy="92" r="6" fill={INK} />
      <path d="M200 40h66M200 148h66" stroke={WOOD_DARK} strokeWidth="9" strokeLinecap="round" />
      <path d="M208 46q0 38 25 50-25 12-25 50M258 46q0 38-25 50 25 12 25 50" fill="#e8f4fb" stroke="#9aa7c4" strokeWidth="4" strokeLinejoin="round" />
      <path d="M216 54h34q-4 16-17 28-13-12-17-28z" fill={YELLOW} />
      <path d="M222 148q11-18 22 0z" fill={YELLOW} />
      <path d="M233 100v36" stroke={YELLOW} strokeWidth="3" />
      <circle cx="288" cy="148" r="16" fill="#fff" stroke={TEAL} strokeWidth="5" />
      <rect x="283" y="126" width="10" height="6" rx="2" fill={TEAL} />
      <path d="M288 148v-8M288 148l6 4" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
    </>
  ),

  lupa: () => (
    <>
      <rect width="320" height="200" fill="#fdf3dc" />
      <rect y="150" width="320" height="50" fill={WOOD} />
      <rect x="40" y="62" width="160" height="96" rx="4" fill="#fff" stroke="#d6dbe6" strokeWidth="3" />
      <g stroke="#9aa7c4" strokeWidth="3" strokeLinecap="round">
        <path d="M54 82h132M54 98h110M54 114h126M54 130h88" />
      </g>
      <circle cx="140" cy="98" r="44" fill="#fff" opacity=".55" />
      <g strokeLinecap="round">
        <path d="M108 78h66" stroke={INK} strokeWidth="9" />
        <path d="M108 100h50" stroke={BLUE} strokeWidth="9" />
        <path d="M108 120h60" stroke={INK} strokeWidth="9" />
      </g>
      <circle cx="140" cy="98" r="44" fill="none" stroke={ORANGE} strokeWidth="8" />
      <circle cx="140" cy="98" r="48" fill="none" stroke="#e08a34" strokeWidth="1.5" opacity=".6" />
      <path d="M172 130l34 34" stroke={WOOD_DARK} strokeWidth="12" strokeLinecap="round" />
      <path d="M124 74q10-8 22-6" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".8" fill="none" />
      <path d="M262 160v-72l-20-26" stroke={INK} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M222 62l20-20 22 20-8 6h-28z" fill={TEAL} />
      <path d="M226 68h32l24 60h-80z" fill={YELLOW} opacity=".3" />
      <ellipse cx="262" cy="162" rx="22" ry="6" fill={INK} />
    </>
  ),

  universidad: () => (
    <>
      <rect width="320" height="200" fill={SKY} />
      <circle cx="40" cy="36" r="16" fill={YELLOW} />
      <g fill="#fff">
        <ellipse cx="240" cy="34" rx="30" ry="10" />
        <ellipse cx="262" cy="28" rx="20" ry="9" />
      </g>
      <rect y="168" width="320" height="32" fill={GRASS} />
      <path d="M40 168h240l-8-14H48z" fill="#d7d7e0" />
      <path d="M62 154h196l-8-12H70z" fill="#e6e6ee" />
      <rect x="74" y="78" width="172" height="64" fill="#f1e6d2" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <g key={i}>
          <rect x={82 + i * 28} y="78" width="12" height="64" rx="3" fill="#fff" />
          <path d={`M${82 + i * 28} 78h12M${82 + i * 28} 142h12`} stroke="#d4c4a4" strokeWidth="3" />
        </g>
      ))}
      <path d="M64 78l96-44 96 44z" fill="#e8dcc4" stroke="#d4c4a4" strokeWidth="3" strokeLinejoin="round" />
      <circle cx="160" cy="62" r="10" fill={BLUE} />
      <path d="M160 52v20M150 62h20" stroke="#fff" strokeWidth="2" />
      <rect x="146" y="104" width="28" height="38" rx="14" fill="#7a5a3a" />
      <path d="M160 18v-12" stroke={INK} strokeWidth="2.5" />
      <path d="M160 6h18l-4 5 4 5h-18z" fill={RED} />
      <circle cx="30" cy="152" r="18" fill="#4ea75e" />
      <rect x="27" y="160" width="6" height="16" fill={WOOD_DARK} />
      <circle cx="292" cy="150" r="20" fill="#4ea75e" />
      <rect x="289" y="160" width="6" height="18" fill={WOOD_DARK} />
      <g transform="translate(262 78) rotate(-14)">
        <path d="M-22 0l22-10 22 10-22 10z" fill={INK} />
        <path d="M-12 5v10q12 8 24 0V5l-12 6z" fill="#4a5568" />
        <path d="M22 0v14" stroke={YELLOW} strokeWidth="2" />
        <circle cx="22" cy="16" r="2.5" fill={YELLOW} />
      </g>
    </>
  ),

  rampa: () => (
    <>
      <rect width="320" height="200" fill={SKY} />
      <circle cx="286" cy="34" r="16" fill={YELLOW} />
      <rect y="166" width="320" height="34" fill={GRASS} />
      <rect x="150" y="40" width="150" height="130" rx="4" fill="#f1e6d2" />
      <rect x="150" y="34" width="150" height="12" fill="#c9b99a" />
      <rect x="196" y="82" width="64" height="88" fill="#fff" stroke="#9aa7c4" strokeWidth="4" />
      <path d="M228 82v88" stroke="#9aa7c4" strokeWidth="3" />
      <rect x="164" y="60" width="26" height="30" fill={SKY} stroke="#fff" strokeWidth="3" />
      <rect x="270" y="60" width="22" height="30" fill={SKY} stroke="#fff" strokeWidth="3" />
      <rect x="150" y="148" width="150" height="22" fill="#d7d7e0" />
      <path d="M30 170h130l-16-22H150L30 170z" fill="#cfd5e0" />
      <path d="M30 170L150 148" stroke="#9aa7c4" strokeWidth="3" />
      <path d="M42 140l108-26" stroke={BLUE} strokeWidth="5" strokeLinecap="round" />
      <path d="M42 140v30M80 133v36M118 124v36" stroke={BLUE} strokeWidth="4" strokeLinecap="round" />
      <circle cx="22" cy="150" r="16" fill="#4ea75e" />
      <rect x="19" y="158" width="6" height="14" fill={WOOD_DARK} />
      <rect x="64" y="184" width="40" height="6" rx="3" fill="#fff" opacity=".8" />
      <rect x="248" y="172" width="44" height="8" rx="3" fill={WOOD_DARK} />
      <path d="M254 180v8M286 180v8" stroke={WOOD_DARK} strokeWidth="3" />
    </>
  ),

  investigacion: () => (
    <>
      <rect width="320" height="200" fill="#e6f1f5" />
      <rect y="152" width="320" height="48" fill="#cfdde3" />
      <rect x="18" y="22" width="132" height="102" rx="6" fill="#fff" stroke="#9aa7c4" strokeWidth="4" />
      {[
        [38, 70, BLUE],
        [62, 54, TEAL],
        [86, 82, ORANGE],
        [110, 44, PURPLE],
        [130, 64, GREEN],
      ].map(([x, y, fill], i) => (
        <rect key={i} x={(x as number) - 8} y={y as number} width="16" height={112 - (y as number)} rx="2" fill={fill as string} />
      ))}
      <path d="M30 108h112" stroke={INK} strokeWidth="2.5" />
      <path d="M32 50l24 -10 24 22 24 -26 24 18" fill="none" stroke={RED} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M190 164h74" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <path d="M204 164v-22a34 34 0 0 1 34-34h6" fill="none" stroke={INK} strokeWidth="9" strokeLinecap="round" />
      <g transform="rotate(-24 232 96)">
        <rect x="216" y="38" width="22" height="64" rx="5" fill={BLUE} />
        <rect x="220" y="102" width="14" height="12" fill="#4a5568" />
        <rect x="214" y="30" width="26" height="10" rx="3" fill="#2f6bb8" />
      </g>
      <rect x="224" y="128" width="46" height="8" rx="3" fill="#4a5568" />
      <circle cx="288" cy="148" r="16" fill="#fff" stroke="#9aa7c4" strokeWidth="3" />
      <circle cx="288" cy="148" r="9" fill="#bfe6c9" />
      <circle cx="285" cy="146" r="2" fill={GREEN} />
      <circle cx="291" cy="151" r="1.5" fill={GREEN} />
      <rect x="40" y="146" width="62" height="14" rx="2" fill={YELLOW} transform="rotate(-4 71 153)" />
      <rect x="112" y="150" width="40" height="10" rx="2" fill={PINK} transform="rotate(6 132 155)" />
    </>
  ),
};
