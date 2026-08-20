"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode, type TouchEvent, type WheelEvent } from "react";
import type { DiseaseData } from "@/types/orthoflow";

const isUsableImageUrl = (url?: string) =>
  Boolean(
    url &&
      /^https?:\/\//i.test(url) &&
      !url.includes("your-cdn.com") &&
      !url.includes("example.com")
  );

type GalleryImage = {
  imageUrl: string;
  title?: string;
  description?: string;
  alt?: string;
};

function normalizeGalleryImages(source: any): GalleryImage[] {
  const rawImages: any[] = [];

  if (Array.isArray(source?.images)) rawImages.push(...source.images);
  if (Array.isArray(source?.imageUrls)) rawImages.push(...source.imageUrls);

  [
    source?.imageUrl,
    source?.imageUrl2,
    source?.imageUrl3,
    source?.imageUrl4,
  ].forEach((imageUrl) => {
    if (imageUrl) rawImages.push(imageUrl);
  });

  const normalized = rawImages
    .map((image, index): GalleryImage | null => {
      if (typeof image === "string") {
        return isUsableImageUrl(image)
          ? { imageUrl: image, title: `影像 ${index + 1}` }
          : null;
      }

      const imageUrl = image?.imageUrl || image?.url || image?.src;
      if (!isUsableImageUrl(imageUrl)) return null;

      return {
        imageUrl,
        title: image?.title,
        description: image?.description,
        alt: image?.alt,
      };
    })
    .filter((image): image is GalleryImage => Boolean(image));

  return normalized.filter(
    (image, index, array) =>
      array.findIndex((candidate) => candidate.imageUrl === image.imageUrl) ===
      index
  );
}

function ClassificationImageCarousel({
  classification,
  onPreview,
}: {
  classification: any;
  onPreview: (imageUrl: string) => void;
}) {
  const images = useMemo(
    () => normalizeGalleryImages(classification),
    [classification]
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const lastWheelAt = useRef(0);
  const touchStartX = useRef<number | null>(null);

  useEffect(() => {
    setActiveIndex(0);
  }, [classification?.id]);

  if (images.length === 0) {
    return (
      <div className="flex aspect-video items-center justify-center bg-[var(--of-surface-muted)] text-sm text-[var(--of-muted)]">
        暂无真实影像
      </div>
    );
  }

  const activeImage = images[Math.min(activeIndex, images.length - 1)];

  const move = (direction: 1 | -1) => {
    setActiveIndex((current) =>
      (current + direction + images.length) % images.length
    );
  };

  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    if (images.length <= 1) return;

    const wheelAmount =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    if (Math.abs(wheelAmount) < 8) return;

    event.preventDefault();

    const now = Date.now();
    if (now - lastWheelAt.current < 320) return;
    lastWheelAt.current = now;

    move(wheelAmount > 0 ? 1 : -1);
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartX.current === null || images.length <= 1) return;

    const endX = event.changedTouches[0]?.clientX ?? touchStartX.current;
    const distance = endX - touchStartX.current;
    touchStartX.current = null;

    if (Math.abs(distance) < 40) return;
    move(distance < 0 ? 1 : -1);
  };

  return (
    <div
      className="group relative aspect-video overflow-hidden bg-[var(--of-surface-muted)]"
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={0}
      onKeyDown={(event) => {
        if (images.length <= 1) return;
        if (event.key === "ArrowRight") move(1);
        if (event.key === "ArrowLeft") move(-1);
      }}
      aria-label={`${classification?.type || "疾病分型"}影像轮播，共${images.length}张`}
    >
      <button
        type="button"
        onClick={() => onPreview(activeImage.imageUrl)}
        className="block h-full w-full"
        aria-label={`放大查看${activeImage.title || classification?.type || "影像"}`}
      >
        <img
          src={activeImage.imageUrl}
          alt={
            activeImage.alt ||
            activeImage.title ||
            classification?.type ||
            "疾病分型影像"
          }
          className="h-full w-full object-contain transition duration-500 group-hover:scale-[1.015]"
        />
      </button>

      {images.length > 1 && (
        <>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              move(-1);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-[#17343A]/72 px-2.5 py-1.5 text-lg leading-none text-white opacity-0 transition hover:bg-[#17343A]/88 group-hover:opacity-100 focus:opacity-100"
            aria-label="上一张影像"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              move(1);
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-[#17343A]/72 px-2.5 py-1.5 text-lg leading-none text-white opacity-0 transition hover:bg-[#17343A]/88 group-hover:opacity-100 focus:opacity-100"
            aria-label="下一张影像"
          >
            ›
          </button>

          <div className="pointer-events-none absolute right-2 top-2 rounded-full bg-[#17343A]/76 px-2 py-1 text-xs text-white">
            {activeIndex + 1} / {images.length}
          </div>

          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 via-black/20 to-transparent px-3 pb-2 pt-8 text-white">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                {activeImage.title && (
                  <div className="truncate text-sm font-medium">
                    {activeImage.title}
                  </div>
                )}
                <div className="text-[11px] text-white/80">
                  鼠标滚轮、左右键或滑动切换
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {images.map((image, index) => (
                  <button
                    key={image.imageUrl}
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      setActiveIndex(index);
                    }}
                    className={`pointer-events-auto h-1.5 rounded-full transition-all ${
                      index === activeIndex
                        ? "w-5 bg-white"
                        : "w-1.5 bg-white/55 hover:bg-[var(--of-surface)]"
                    }`}
                    aria-label={`查看第${index + 1}张影像`}
                  />
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function StudyMode({ disease }: { disease: DiseaseData }) {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const summary = disease.learningSummary || {};
  const symptoms = Array.isArray(summary.typicalSymptoms)
    ? summary.typicalSymptoms
    : [];
  const differentials = Array.isArray(summary.differentialDiagnosis)
    ? summary.differentialDiagnosis
    : [];
  const physicalExams = Array.isArray(disease.physicalExams)
    ? disease.physicalExams
    : [];
  const imagingGuide = disease.imagingGuide || {};
  const preferredTests = Array.isArray(imagingGuide.preferredTests)
    ? imagingGuide.preferredTests
    : [];
  const readingPoints = Array.isArray(imagingGuide.readingPoints)
    ? imagingGuide.readingPoints
    : [];
  const commonPitfalls = Array.isArray(imagingGuide.commonPitfalls)
    ? imagingGuide.commonPitfalls
    : [];
  const decisionSteps = Array.isArray(disease.decisionFlow?.steps)
    ? disease.decisionFlow?.steps || []
    : [];
  const classifications = Array.isArray(disease.classifications)
    ? disease.classifications
    : [];
  const commonImages = Array.isArray(disease.commonImages)
    ? disease.commonImages
    : [];



  const hasSummary = Boolean(
    summary.typicalPatients ||
      symptoms.length ||
      summary.keyPoint ||
      differentials.length
  );
  const hasImagingGuide = Boolean(
    preferredTests.length || readingPoints.length || commonPitfalls.length
  );
  const hasClassifications = classifications.length > 0;
  const hasCommonImages = commonImages.length > 0;

  const jumpTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  };

  return (
    <div className="space-y-10">
      <section className="rounded-[28px] border border-[var(--of-border)] bg-[var(--of-surface)] p-5 shadow-[0_16px_50px_rgba(39,76,79,.07)] backdrop-blur-xl sm:p-6">
        <div className="mb-5">
          <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[var(--of-accent)]/75">
            Learning Map
          </div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--of-text)]">
            先抓主线，再深入细节
          </h3>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--of-muted)]">
            学习顺序优先围绕“临床识别 → 查体与影像 → 诊疗决策 → 手术与康复”，分型用于解释决策，而不是替代决策。
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            ["01", "临床一眼看懂", "先知道典型患者、症状和常见鉴别", "study-clinical"],
            ["02", "查体与影像", "会定位、会判断稳定性，也会看片", "study-exam-imaging"],
            ["03", "诊疗决策", "把关键临床变量与治疗路径连起来", "study-decision"],
            ["04", "手术与康复", "理解为什么选这个方案，以及术后怎么走", "study-treatment"],
          ].map(([number, title, description, target]) => (
            <button
              key={number}
              type="button"
              onClick={() => jumpTo(target)}
              className="group rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] p-4 text-left transition hover:-translate-y-0.5 hover:border-[#B9DDE1] hover:bg-[var(--of-surface)] hover:shadow-[0_12px_30px_rgba(39,76,79,.08)]"
            >
              <div className="text-[10px] font-semibold tracking-[0.18em] text-[var(--of-accent)]">
                {number}
              </div>
              <div className="mt-2 font-semibold text-[var(--of-text-strong)]">{title}</div>
              <div className="mt-1 text-xs leading-5 text-[var(--of-muted)]">
                {description}
              </div>
              <div className="mt-3 text-xs font-medium text-[var(--of-accent)] transition group-hover:translate-x-0.5">
                进入 →
              </div>
            </button>
          ))}
        </div>
      </section>

      <div id="study-clinical" className="scroll-mt-28">
        {hasSummary && (
          <StudySection number="1" title="临床一眼看懂">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {summary.typicalPatients && (
                <InfoCard title="典型人群">
                  <p>{summary.typicalPatients}</p>
                </InfoCard>
              )}

              {symptoms.length > 0 && (
                <InfoCard title="典型表现">
                  <BulletList items={symptoms} />
                </InfoCard>
              )}

              {summary.keyPoint && (
                <InfoCard title="核心理解" tone="action" className="md:col-span-2">
                  <p className="font-medium leading-7">{summary.keyPoint}</p>
                </InfoCard>
              )}

              {differentials.length > 0 && (
                <InfoCard title="常见鉴别" className="md:col-span-2">
                  <div className="flex flex-wrap gap-2">
                    {differentials.map((item, index) => (
                      <span
                        key={`${item}-${index}`}
                        className="rounded-full border border-[var(--of-border)] bg-[var(--of-surface-muted)] px-3 py-1 text-sm text-[var(--of-muted)]"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </InfoCard>
              )}
            </div>
          </StudySection>
        )}
      </div>

      <div id="study-exam-imaging" className="scroll-mt-28 space-y-10">
        {physicalExams.length > 0 && (
          <StudySection number="2" title="关键查体">
            <div className="space-y-3">
              {physicalExams.map((exam, index) => (
                <details
                  key={`${exam.name || "exam"}-${index}`}
                  className="group overflow-hidden rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] shadow-[0_12px_36px_rgba(39,76,79,.06)] backdrop-blur-xl"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 transition hover:bg-[var(--of-surface-muted)]">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-semibold text-[var(--of-text-strong)]">
                          {index + 1}. {exam.name || "未命名查体"}
                        </h4>
                        {exam.target && (
                          <p className="mt-1 text-sm text-[var(--of-muted)]">
                            检查目标：{exam.target}
                          </p>
                        )}
                      </div>
                      <span className="text-sm font-medium text-[var(--of-accent)] group-open:hidden">
                        展开
                      </span>
                      <span className="hidden text-sm font-medium text-[var(--of-accent)] group-open:inline">
                        收起
                      </span>
                    </div>
                  </summary>

                  <div className="border-t border-[var(--of-border)] px-5 py-4">
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                      {exam.method && <MiniInfo title="怎么做" text={exam.method} />}
                      {exam.positiveFinding && (
                        <MiniInfo title="阳性表现" text={exam.positiveFinding} />
                      )}
                      {exam.meaning && (
                        <MiniInfo title="提示什么" text={exam.meaning} tone="action" />
                      )}
                    </div>

                    {isUsableImageUrl(exam.imageUrl) && (
                      <button
                        type="button"
                        onClick={() => setPreviewImage(exam.imageUrl || null)}
                        className="mt-4 block overflow-hidden rounded-xl border border-[var(--of-border)] bg-[var(--of-surface-muted)]"
                      >
                        <img
                          src={exam.imageUrl}
                          alt={exam.name || "查体示意图"}
                          className="max-h-72 w-full object-contain"
                        />
                      </button>
                    )}
                  </div>
                </details>
              ))}
            </div>
          </StudySection>
        )}

        {hasImagingGuide && (
          <StudySection number="3" title="影像检查与看片要点">
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
              {preferredTests.length > 0 && (
                <InfoCard title="推荐检查" tone="action">
                  <BulletList items={preferredTests} />
                </InfoCard>
              )}
              {readingPoints.length > 0 && (
                <InfoCard title="看片顺序与重点">
                  <BulletList items={readingPoints} />
                </InfoCard>
              )}
              {commonPitfalls.length > 0 && (
                <InfoCard title="常见误区" tone="warning">
                  <BulletList items={commonPitfalls} />
                </InfoCard>
              )}
            </div>
          </StudySection>
        )}
      </div>

      <div id="study-decision" className="scroll-mt-28 space-y-10">
        {decisionSteps.length > 0 && (
          <StudySection number="4" title="学习型诊疗决策">
            {disease.decisionFlow?.title && (
              <h4 className="mb-4 text-lg font-semibold text-[var(--of-text-strong)]">
                {disease.decisionFlow.title}
              </h4>
            )}

            <div className="space-y-4">
              {decisionSteps.map((step, index) => (
                <div
                  key={step.id ?? index}
                  className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-5 shadow-[0_14px_42px_rgba(39,76,79,.07)]"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-sm font-bold text-white shadow-[0_8px_20px_rgba(32,166,185,.16)]">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h5 className="font-semibold text-[var(--of-text-strong)]">
                        {step.question || "未填写判断问题"}
                      </h5>
                      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                        {step.yes && (
                          <div className="rounded-xl border border-[#BFDCCF] bg-[#EDF8F2] p-3 text-sm leading-6 text-[#2D6A4F]">
                            <span className="font-semibold">是 → </span>
                            {step.yes}
                          </div>
                        )}
                        {step.no && (
                          <div className="rounded-xl border border-[#E7D5AA] bg-[#FFF8E8] p-3 text-sm leading-6 text-[#7A5A16]">
                            <span className="font-semibold">否 → </span>
                            {step.no}
                          </div>
                        )}
                      </div>
                      {step.note && (
                        <p className="mt-3 rounded-xl bg-[var(--of-surface-muted)] px-3 py-2 text-sm leading-6 text-[var(--of-muted)]">
                          为什么：{step.note}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {disease.decisionFlow?.disclaimer && (
              <p className="mt-4 rounded-xl border border-[#E7D5AA] bg-[#FFF8E8] p-3 text-xs leading-5 text-[#7A5A16]">
                {disease.decisionFlow.disclaimer}
              </p>
            )}
          </StudySection>
        )}

        {(hasClassifications || hasCommonImages) && (
          <StudySection number="5" title="影像与分型">
            {hasClassifications && (
              <ClassificationGroup
                title="分型与结构分层"
                description="用于描述损伤或疾病模式，并解释其临床意义；分型本身不自动等同于某一种治疗。"
                items={classifications}
                onPreview={setPreviewImage}
                tone="neutral"
              />
            )}

            {hasCommonImages && (
              <div className={hasClassifications ? "mt-6" : ""}>
                <h4 className="mb-3 font-semibold text-[var(--of-text-strong)]">常见影像</h4>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {commonImages.map((image: any, index: number) => {
                    const normalized =
                      typeof image === "string"
                        ? { imageUrl: image, title: `影像 ${index + 1}` }
                        : image || {};
                    const imageUrl = normalized.imageUrl || normalized.url;
                    const canPreview = isUsableImageUrl(imageUrl);

                    if (!canPreview) return null;

                    return (
                      <button
                        key={`${imageUrl}-${index}`}
                        type="button"
                        onClick={() => setPreviewImage(imageUrl)}
                        className="overflow-hidden rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] text-left shadow-[0_12px_36px_rgba(39,76,79,.06)] transition hover:-translate-y-0.5 hover:border-[#B9DDE1]"
                      >
                        <img
                          src={imageUrl}
                          alt={normalized.title || `常见影像 ${index + 1}`}
                          className="aspect-video w-full bg-[var(--of-surface-muted)] object-contain"
                        />
                        <div className="p-3">
                          <div className="font-medium text-[var(--of-text-strong)]">
                            {normalized.title || `影像 ${index + 1}`}
                          </div>
                          {normalized.description && (
                            <p className="mt-1 text-sm text-[var(--of-muted)]">
                              {normalized.description}
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </StudySection>
        )}
      </div>

      <div id="study-treatment" className="scroll-mt-28 space-y-10">
        {disease.surgeryTable && (
          <StudySection number="6" title="治疗与手术策略">
            <div className="overflow-x-auto rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] shadow-[0_14px_42px_rgba(39,76,79,.07)]">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--of-surface-muted)]">
                  <tr>
                    {(disease.surgeryTable.headers || []).map(
                      (header: string, index: number) => (
                        <th
                          key={index}
                          className="whitespace-nowrap px-4 py-3 text-left font-medium text-[var(--of-text-strong)]"
                        >
                          {header}
                        </th>
                      )
                    )}
                  </tr>
                </thead>
                <tbody>
                  {(disease.surgeryTable.rows || []).map(
                    (row: any[], rowIndex: number) => (
                      <tr key={rowIndex} className="border-t border-[var(--of-border)]">
                        {row.map((cell, cellIndex) => (
                          <td
                            key={cellIndex}
                            className="min-w-40 px-4 py-3 align-top leading-6 text-[var(--of-muted)]"
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </StudySection>
        )}

        {Array.isArray(disease.rehabPlan) && disease.rehabPlan.length > 0 && (
          <StudySection number="7" title="康复方案">
            <div className="space-y-3">
              {disease.rehabPlan.map((item: any, index: number) => (
                <details
                  key={index}
                  className="group rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] shadow-[0_12px_36px_rgba(39,76,79,.06)]"
                >
                  <summary className="cursor-pointer list-none px-4 py-4">
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm font-semibold text-[var(--of-accent)]">
                        {item.phase}
                      </div>
                      <span className="text-xs text-[var(--of-muted)] group-open:hidden">展开</span>
                      <span className="hidden text-xs text-[var(--of-muted)] group-open:inline">收起</span>
                    </div>
                  </summary>
                  <div className="border-t border-[var(--of-border)] px-4 py-4 text-sm leading-6 text-[var(--of-muted)]">
                    {item.content}
                  </div>
                </details>
              ))}
            </div>
          </StudySection>
        )}
      </div>

      {!hasSummary &&
        physicalExams.length === 0 &&
        !hasImagingGuide &&
        !hasClassifications &&
        !hasCommonImages &&
        decisionSteps.length === 0 &&
        !disease.surgeryTable &&
        (!Array.isArray(disease.rehabPlan) || disease.rehabPlan.length === 0) && (
          <div className="rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] p-6 text-[var(--of-muted)] shadow-sm">
            该疾病暂无学习内容。
          </div>
        )}

      {previewImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#0A1518]/82 p-4 backdrop-blur-md"
          onClick={() => setPreviewImage(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setPreviewImage(null)}
            className="absolute right-5 top-5 rounded-full border border-white/20 bg-white/15 px-4 py-2 text-sm font-medium text-[var(--of-text-strong)] backdrop-blur-xl"
          >
            关闭
          </button>
          <img
            src={previewImage}
            alt="放大影像"
            className="max-h-[90vh] max-w-[95vw] rounded-2xl border border-white/15 bg-white object-contain shadow-[0_30px_100px_rgba(0,0,0,.45)]"
            onClick={(event) => event.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function ClassificationGroup({
  title,
  description,
  items,
  onPreview,
  tone = "neutral",
}: {
  title: string;
  description: string;
  items: any[];
  onPreview: (imageUrl: string) => void;
  tone?: "neutral" | "action";
}) {
  const action = tone === "action";

  return (
    <details className="group overflow-hidden rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface)] shadow-[0_12px_36px_rgba(39,76,79,.06)]">
      <summary className={`cursor-pointer list-none px-5 py-4 transition ${action ? "bg-[var(--of-accent-soft)]" : "bg-[var(--of-surface-muted)]"}`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h4 className="font-semibold text-[var(--of-text-strong)]">{title}</h4>
            <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]">{description}</p>
          </div>
          <span className="shrink-0 rounded-full border border-[var(--of-accent-border)] bg-[var(--of-surface)] px-3 py-1 text-xs font-medium text-[var(--of-accent)] group-open:hidden">
            展开学习
          </span>
          <span className="hidden shrink-0 rounded-full border border-[var(--of-accent-border)] bg-[var(--of-surface)] px-3 py-1 text-xs font-medium text-[var(--of-accent)] group-open:inline">
            收起
          </span>
        </div>
      </summary>

      <div className="border-t border-[var(--of-border)] p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((classification: any, index: number) => (
            <article
              key={classification?.id ?? index}
              className="overflow-hidden rounded-2xl border border-[var(--of-border)] bg-[var(--of-surface-muted)] transition hover:-translate-y-0.5 hover:border-[#B9DDE1]"
            >
              <ClassificationImageCarousel
                classification={classification}
                onPreview={onPreview}
              />
              <div className="p-4">
                <h5 className="font-semibold text-[var(--of-text-strong)]">
                  {classification?.type || `分型 ${index + 1}`}
                </h5>
                {classification?.description && (
                  <p className="mt-1 text-sm leading-6 text-[var(--of-muted)]">
                    {classification.description}
                  </p>
                )}
                {classification?.imageKeyPoints && (
                  <div className="mt-3 rounded-xl border border-[var(--of-accent-border)] bg-[var(--of-accent-soft)] p-3 text-sm leading-6 text-[var(--of-accent)]">
                    <span className="font-semibold">看片要点：</span>
                    {classification.imageKeyPoints}
                  </div>
                )}
                {classification?.note && (
                  <div className="mt-3 rounded-xl border border-[#E8D9B4] bg-[#FFF9EC] p-3 text-sm leading-6 text-[#7A5A16]">
                    <span className="font-semibold">临床提醒：</span>
                    {classification.note}
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </div>
    </details>
  );
}

function StudySection({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#20A6B9] to-[#4B8EE8] text-sm font-bold text-white shadow-[0_8px_20px_rgba(32,166,185,.15)]">
          {number}
        </span>
        <div>
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--of-accent)]/65">
            Study Module
          </div>
          <h3 className="mt-0.5 text-lg font-semibold text-[var(--of-text-strong)]">{title}</h3>
        </div>
        <div className="ml-2 h-px flex-1 bg-gradient-to-r from-[#D9E6E3] to-transparent" />
      </div>
      {children}
    </section>
  );
}

function InfoCard({
  title,
  children,
  className = "",
  tone = "neutral",
}: {
  title: string;
  children: ReactNode;
  className?: string;
  tone?: "neutral" | "action" | "warning" | "danger";
}) {
  const toneClasses =
    tone === "action"
      ? "border-[#C7E4E7] bg-[var(--of-accent-soft)]"
      : tone === "warning"
        ? "border-[#E7D6AC] bg-[#FFF9EC]"
        : tone === "danger"
          ? "border-[#EBCBCB] bg-[#FFF2F2]"
          : "border-[var(--of-border)] bg-[var(--of-surface)]";

  const dotClass =
    tone === "warning"
      ? "bg-[#D4A93A]"
      : tone === "danger"
        ? "bg-[#C85B5B]"
        : "bg-[#20A6B9]";

  const textClass =
    tone === "warning"
      ? "text-[#6F581F]"
      : tone === "danger"
        ? "text-[#8E4141]"
        : tone === "action"
          ? "text-[var(--of-accent)]"
          : "text-[var(--of-muted)]";

  return (
    <div className={`rounded-2xl border p-5 shadow-[0_12px_36px_rgba(39,76,79,.06)] ${toneClasses} ${className}`}>
      <div className="mb-3 flex items-center gap-2">
        <span className={`h-1.5 w-1.5 rounded-full ${dotClass}`} />
        <h4 className="font-semibold text-[var(--of-text-strong)]">{title}</h4>
      </div>
      <div className={`text-sm leading-6 ${textClass}`}>{children}</div>
    </div>
  );
}

function MiniInfo({
  title,
  text,
  tone = "neutral",
}: {
  title: string;
  text: string;
  tone?: "neutral" | "action";
}) {
  return (
    <div className={`rounded-xl border p-3.5 ${tone === "action" ? "border-[var(--of-accent-border)] bg-[var(--of-accent-soft)]" : "border-[var(--of-border)] bg-[var(--of-surface-muted)]"}`}>
      <div className="mb-1 text-sm font-semibold text-[var(--of-accent)]">{title}</div>
      <p className="text-sm leading-6 text-[var(--of-muted)]">{text}</p>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="flex items-start gap-2.5">
          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[#20A6B9]" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}


export default StudyMode
