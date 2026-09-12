"use client";

import { useState } from "react";

const STAGES = [
  {
    id: "surface",
    label: "1 体表定位",
    title: "先定位，再画切口",
    detail: "屈膝约 30°作为常用起始位，先标出关节线、Gerdy 结节、腓骨头和胫骨前嵴。切口近端通常越过关节线约 3–5 cm，远端长度服从骨折线和钢板工作区。",
  },
  {
    id: "fascia",
    label: "2 筋膜层",
    title: "髂胫束与胫前肌筋膜连续打开",
    detail: "近端顺髂胫束纤维切开，远端续入胫前肌筋膜；在 Gerdy 结节附近保留可修复组织袖，只做建立外侧贴骨通道所需的有限剥离。",
  },
  {
    id: "submeniscal",
    label: "3 半月板下窗",
    title: "提起半月板，直视外侧关节面",
    detail: "辨认外侧半月板后，在其下方受控切开半月板胫骨韧带，保留关闭边缘并用牵引线向近端提起；不要靠切除半月板换取视野。",
  },
  {
    id: "danger",
    label: "4 危险边界",
    title: "腓骨头后方不是常规前外侧工作区",
    detail: "腓总神经绕行腓骨颈。常规前外侧入路无法解释后外侧责任骨块时，应更换或增加合适窗口，不能把切口向腓骨头后方盲目扩大。",
  },
] as const;

type StageId = (typeof STAGES)[number]["id"];

function SvgLabel({ x, y, children, anchor = "start" }: { x: number; y: number; children: string; anchor?: "start" | "middle" | "end" }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      fill="#29454A"
      fontSize="14"
      fontWeight="600"
      style={{ paintOrder: "stroke", stroke: "#F8FBFA", strokeWidth: 4, strokeLinejoin: "round" }}
    >
      {children}
    </text>
  );
}

function Leader({ points, danger = false }: { points: string; danger?: boolean }) {
  return <polyline points={points} fill="none" stroke={danger ? "#B6474D" : "#58777C"} strokeWidth="1.5" />;
}

export function TibialPlateauAnterolateralFigure() {
  const [stage, setStage] = useState<StageId>("surface");
  const active = STAGES.find((item) => item.id === stage) || STAGES[0];

  return (
    <section className="mt-4 overflow-hidden rounded-lg border border-[var(--of-border)] bg-[#F8FBFA] text-[#29454A]">
      <div className="border-b border-[#D7E4E2] bg-white px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="font-semibold text-[#20383C]">前外侧入路 · 原创分层示意</div>
            <div className="mt-1 text-xs text-[#667C80]">右膝前外侧斜视 · 解剖比例示意 · 待术者复核</div>
          </div>
          <span className="rounded-md border border-[#E7D5AA] bg-[#FFF8E8] px-2 py-1 text-[11px] font-semibold text-[#7A5A16]">原型 V1</span>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b border-[#D7E4E2] bg-white sm:grid-cols-4" role="tablist" aria-label="前外侧入路图层">
        {STAGES.map((item) => {
          const selected = item.id === stage;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setStage(item.id)}
              className={`h-11 border-r border-t border-[#D7E4E2] px-2 text-xs font-semibold transition-colors first:border-t-0 sm:border-t-0 ${selected ? "bg-[#E6F5F4] text-[#126F79]" : "bg-white text-[#667C80] hover:bg-[#F1F7F5]"}`}
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1.45fr)_minmax(250px,.55fr)]">
        <div className="min-w-0 overflow-x-auto border-b border-[#D7E4E2] lg:border-b-0 lg:border-r">
          <svg
            className="block h-auto min-w-[620px] w-full sm:min-w-0"
            viewBox="0 0 720 620"
            role="img"
            aria-labelledby="anterolateral-figure-title anterolateral-figure-desc"
          >
            <title id="anterolateral-figure-title">胫骨平台前外侧入路分层示意图</title>
            <desc id="anterolateral-figure-desc">右膝前外侧斜视图，分层显示体表标志、切口、髂胫束与胫前肌筋膜、半月板下窗口、腓总神经和后外侧危险边界。</desc>
            <defs>
              <marker id="arrow-teal" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#168E91" />
              </marker>
              <marker id="arrow-red" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#B6474D" />
              </marker>
              <pattern id="danger-hatch" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)">
                <rect width="10" height="10" fill="#F9DDDE" opacity="0.72" />
                <line x1="0" y1="0" x2="0" y2="10" stroke="#B6474D" strokeWidth="3" opacity="0.55" />
              </pattern>
            </defs>

            <rect x="0" y="0" width="720" height="620" fill="#F8FBFA" />

            <g aria-hidden="true">
              <line x1="55" y1="78" x2="55" y2="30" stroke="#58777C" strokeWidth="1.5" markerEnd="url(#arrow-teal)" />
              <text x="55" y="22" textAnchor="middle" fill="#58777C" fontSize="12" fontWeight="700">近端</text>
              <line x1="55" y1="92" x2="55" y2="140" stroke="#58777C" strokeWidth="1.5" markerEnd="url(#arrow-teal)" />
              <text x="55" y="157" textAnchor="middle" fill="#58777C" fontSize="12" fontWeight="700">远端</text>
              <text x="22" y="102" fill="#58777C" fontSize="12" fontWeight="700">内侧</text>
              <text x="82" y="102" fill="#58777C" fontSize="12" fontWeight="700">外侧</text>
            </g>

            <g id="bones" fill="#F1E7C9" stroke="#8E816A" strokeWidth="2">
              <path d="M270 42 C263 91 270 130 292 161 C307 183 305 206 291 229 C278 251 282 270 307 279 C337 290 391 290 421 278 C447 268 451 249 437 226 C423 203 422 182 438 160 C460 130 467 91 460 42 C419 27 312 27 270 42 Z" />
              <path d="M294 296 C304 279 329 273 363 273 C403 273 433 281 446 299 L428 349 C418 384 416 451 426 584 L297 584 C309 452 306 386 296 348 Z" />
              <path d="M483 317 C504 306 533 308 548 326 C555 343 549 365 532 378 L520 571 L475 571 L493 378 C472 364 467 337 483 317 Z" />
              <path d="M316 251 C343 240 398 240 426 251 L419 274 C386 283 350 283 320 274 Z" fill="#DDEFEF" stroke="#4E9298" />
              <path d="M327 145 C345 127 379 126 396 146 L398 212 C381 226 348 227 329 211 Z" fill="#EFE3C4" />
            </g>

            <g id="baseline-landmarks">
              <circle cx="447" cy="306" r="6" fill="#15858A" />
              <circle cx="511" cy="330" r="6" fill="#15858A" />
              <circle cx="350" cy="333" r="6" fill="#15858A" />
              <line x1="245" y1="274" x2="518" y2="274" stroke="#4E9298" strokeWidth="2" strokeDasharray="6 6" />
            </g>

            <g aria-hidden={stage !== "surface"} className="transition-opacity duration-200" opacity={stage === "surface" ? 1 : 0}>
              <path d="M247 25 C219 128 228 231 259 285 C274 316 278 365 269 430 C264 478 266 546 279 600 L553 600 C561 524 559 432 568 379 C578 321 565 246 489 25 Z" fill="#F4C9B5" opacity="0.33" stroke="#C58F78" strokeWidth="2" />
              <path d="M457 92 C443 137 453 191 445 239 C439 274 429 292 421 314 C411 347 407 407 404 514" fill="none" stroke="#B6474D" strokeWidth="7" strokeLinecap="round" />
              <path d="M483 91 L483 271" fill="none" stroke="#B6474D" strokeWidth="1.5" strokeDasharray="5 5" />
              <path d="M476 92 L493 92 M476 271 L493 271" stroke="#B6474D" strokeWidth="1.5" />
              <SvgLabel x={502} y={169}>关节线上约 3–5 cm</SvgLabel>
              <Leader points="498,174 482,174" danger />
              <SvgLabel x={532} y={302}>Gerdy 结节</SvgLabel>
              <Leader points="524,306 455,306" />
              <SvgLabel x={578} y={344}>腓骨头</SvgLabel>
              <Leader points="570,347 518,333" />
              <SvgLabel x={196} y={268} anchor="end">关节线</SvgLabel>
              <Leader points="203,270 245,274" />
              <SvgLabel x={244} y={350} anchor="end">胫骨结节</SvgLabel>
              <Leader points="251,348 343,334" />
              <path d="M350 338 C346 392 340 462 337 550" fill="none" stroke="#58777C" strokeWidth="2" strokeDasharray="6 6" />
              <SvgLabel x={218} y={416} anchor="end">胫骨前嵴</SvgLabel>
              <Leader points="226,412 341,408" />
              <SvgLabel x={194} y={482} anchor="end">远端服从骨折与钢板</SvgLabel>
              <Leader points="202,478 401,480" danger />
            </g>

            <g aria-hidden={stage !== "fascia"} className="transition-opacity duration-200" opacity={stage === "fascia" ? 1 : 0}>
              <path d="M446 8 C438 78 436 143 441 211 C445 247 448 278 447 307 L417 314 C411 263 413 220 411 178 C408 105 411 48 419 8 Z" fill="#7E9EA5" opacity="0.78" stroke="#456D76" strokeWidth="2" />
              <path d="M447 312 C468 328 482 368 481 425 C480 477 472 536 463 587 L398 587 C406 528 408 464 405 415 C403 367 410 332 423 312 Z" fill="#C97868" opacity="0.82" stroke="#955348" strokeWidth="2" />
              <path d="M442 86 C431 153 442 226 432 296 C426 337 425 415 427 534" fill="none" stroke="#FFF8E8" strokeWidth="5" strokeDasharray="12 7" />
              <path d="M393 306 C416 294 445 292 468 305" fill="none" stroke="#168E91" strokeWidth="3" markerEnd="url(#arrow-teal)" />
              <SvgLabel x={548} y={132}>髂胫束</SvgLabel>
              <Leader points="539,136 443,142" />
              <SvgLabel x={559} y={431}>胫前肌与筋膜</SvgLabel>
              <Leader points="551,435 478,430" />
              <SvgLabel x={235} y={320} anchor="end">保留可修复组织袖</SvgLabel>
              <Leader points="243,317 401,306" />
            </g>

            <g aria-hidden={stage !== "submeniscal"} className="transition-opacity duration-200" opacity={stage === "submeniscal" ? 1 : 0}>
              <path d="M341 259 C369 244 419 246 449 264 C429 276 397 279 361 275 C350 273 343 267 341 259 Z" fill="#4E9298" stroke="#276A72" strokeWidth="2" />
              <path d="M350 271 C379 281 420 280 450 268" fill="none" stroke="#B6474D" strokeWidth="4" strokeDasharray="8 6" />
              <path d="M390 252 C387 225 388 197 391 172" fill="none" stroke="#168E91" strokeWidth="3" markerEnd="url(#arrow-teal)" />
              <path d="M414 254 C417 226 419 204 423 182" fill="none" stroke="#168E91" strokeWidth="3" markerEnd="url(#arrow-teal)" />
              <path d="M330 280 C356 290 422 291 461 277 L454 304 C419 316 365 317 330 303 Z" fill="#D6F0EF" stroke="#168E91" strokeWidth="2" opacity="0.9" />
              <SvgLabel x={527} y={228}>外侧半月板</SvgLabel>
              <Leader points="519,232 447,261" />
              <SvgLabel x={546} y={284}>半月板下切开线</SvgLabel>
              <Leader points="538,288 449,270" danger />
              <SvgLabel x={541} y={326}>外侧关节面窗口</SvgLabel>
              <Leader points="533,329 455,298" />
              <SvgLabel x={270} y={200} anchor="end">牵引线向近端提起</SvgLabel>
              <Leader points="278,204 389,223" />
            </g>

            <g aria-hidden={stage !== "danger"} className="transition-opacity duration-200" opacity={stage === "danger" ? 1 : 0}>
              <path d="M502 288 C548 280 584 300 592 338 C598 373 578 405 541 417 L477 396 C477 347 483 311 502 288 Z" fill="url(#danger-hatch)" stroke="#B6474D" strokeWidth="2" />
              <path d="M562 252 C546 276 536 298 531 321 C527 346 535 365 553 381 C566 392 570 407 563 426" fill="none" stroke="#E1B928" strokeWidth="8" strokeLinecap="round" />
              <path d="M554 423 C548 451 550 486 561 515" fill="none" stroke="#E1B928" strokeWidth="5" strokeLinecap="round" />
              <path d="M563 424 C578 450 586 480 585 516" fill="none" stroke="#E1B928" strokeWidth="5" strokeLinecap="round" />
              <path d="M387 304 C377 356 374 421 376 540" fill="none" stroke="#168E91" strokeWidth="20" opacity="0.3" />
              <path d="M387 304 C377 356 374 421 376 540" fill="none" stroke="#168E91" strokeWidth="3" strokeDasharray="8 6" markerEnd="url(#arrow-teal)" />
              <SvgLabel x={612} y={268}>腓总神经</SvgLabel>
              <Leader points="604,272 559,276" danger />
              <SvgLabel x={614} y={363}>后外侧禁区</SvgLabel>
              <Leader points="605,367 581,360" danger />
              <SvgLabel x={303} y={455} anchor="end">外侧贴骨通道</SvgLabel>
              <Leader points="311,451 371,433" />
              <path d="M614 396 C593 407 579 420 566 439" fill="none" stroke="#B6474D" strokeWidth="2.5" markerEnd="url(#arrow-red)" />
              <text x="614" y="391" textAnchor="end" fill="#B6474D" fontSize="13" fontWeight="700">不要盲目向后扩大</text>
            </g>
          </svg>
        </div>

        <div className="flex flex-col justify-between bg-white p-4 sm:p-5">
          <div>
            <div className="text-xs font-semibold text-[#168E91]">当前层级</div>
            <h5 className="mt-2 text-base font-semibold text-[#20383C]">{active.title}</h5>
            <p className="mt-3 text-sm leading-7 text-[#587277]">{active.detail}</p>
          </div>

          <div className="mt-5 border-t border-[#D7E4E2] pt-4">
            <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs text-[#587277]">
              <div className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm border border-[#8E816A] bg-[#F1E7C9]" />骨</div>
              <div className="flex items-center gap-2"><span className="h-3 w-5 rounded-sm border border-[#955348] bg-[#C97868]" />肌肉</div>
              <div className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-sm bg-[#4E9298]" />半月板</div>
              <div className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-sm bg-[#E1B928]" />神经</div>
              <div className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-sm bg-[#B6474D]" />切口 / 禁区</div>
              <div className="flex items-center gap-2"><span className="h-1.5 w-5 rounded-sm bg-[#168E91]" />工作通道</div>
            </div>
            <p className="mt-4 text-[11px] leading-5 text-[#7A8E91]">原创教学示意，依据 AO 近端胫骨入路与坎贝尔胫骨平台章节重绘；不按实际比例，不能替代术者现场确认。</p>
          </div>
        </div>
      </div>
    </section>
  );
}
