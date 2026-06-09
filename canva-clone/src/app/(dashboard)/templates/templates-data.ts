export type DemoTemplate = {
  id: string;
  name: string;
  width: number;
  height: number;
  json: string;
  thumbnailDataUrl: string;
};

type SlideSpec = {
  title: string;
  subtitle: string;
  fromColor: string;
  toColor: string;
};

const createSlideJson = (
  width: number,
  height: number,
  title: string,
  subtitle: string,
  fromColor: string,
  toColor: string,
) => {
  return JSON.stringify({
    version: "5.3.0",
    objects: [
      {
        type: "rect",
        version: "5.3.0",
        left: 0,
        top: 0,
        width,
        height,
        fill: "#ffffff",
        stroke: null,
        strokeWidth: 1,
        selectable: false,
        hasControls: false,
        name: "clip",
      },
      {
        type: "rect",
        version: "5.3.0",
        left: 0,
        top: 0,
        width,
        height,
        fill: fromColor,
        selectable: false,
        hasControls: false,
      },
      {
        type: "circle",
        version: "5.3.0",
        left: Math.round(width * 0.62),
        top: Math.round(height * 0.08),
        radius: Math.round(width * 0.24),
        fill: toColor,
        opacity: 0.8,
      },
      {
        type: "textbox",
        version: "5.3.0",
        left: Math.round(width * 0.08),
        top: Math.round(height * 0.2),
        width: Math.round(width * 0.68),
        text: title,
        fill: "#0f172a",
        fontSize: Math.max(38, Math.round(width / 18)),
        fontFamily: "Arial",
        fontWeight: 700,
        lineHeight: 1.08,
      },
      {
        type: "textbox",
        version: "5.3.0",
        left: Math.round(width * 0.08),
        top: Math.round(height * 0.57),
        width: Math.round(width * 0.7),
        text: subtitle,
        fill: "#334155",
        fontSize: Math.max(18, Math.round(width / 42)),
        fontFamily: "Arial",
        fontWeight: 400,
        lineHeight: 1.25,
      },
    ],
  });
};

const createSlideThumbnailDataUrl = (
  width: number,
  height: number,
  title: string,
  subtitle: string,
  fromColor: string,
  toColor: string,
) => {
  const safeTitle = title.split("&").join("and");
  const safeSubtitle = subtitle.split("&").join("and");
  const svg = [
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${width} ${height}'>`,
    "<defs>",
    "<linearGradient id='g' x1='0' x2='1' y1='0' y2='1'>",
    `<stop offset='0%' stop-color='${fromColor}'/>`,
    `<stop offset='100%' stop-color='${toColor}'/>`,
    "</linearGradient>",
    "</defs>",
    "<rect width='100%' height='100%' fill='url(#g)'/>",
    "<circle cx='1400' cy='210' r='260' fill='rgba(255,255,255,0.55)'/>",
    `<text x='154' y='260' font-size='96' font-family='Arial' font-weight='700' fill='#0f172a' style='white-space:pre'>${safeTitle}</text>`,
    `<text x='154' y='620' font-size='46' font-family='Arial' font-weight='400' fill='#334155' style='white-space:pre'>${safeSubtitle}</text>`,
    "</svg>",
  ].join("");

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

const createMultiSlideTemplateJson = (
  width: number,
  height: number,
  slides: SlideSpec[],
) => {
  const slidePayload = slides.map((slide, index) => ({
    id: `slide-${index + 1}`,
    json: createSlideJson(width, height, slide.title, slide.subtitle, slide.fromColor, slide.toColor),
    width,
    height,
    thumbnailUrl: createSlideThumbnailDataUrl(width, height, slide.title, slide.subtitle, slide.fromColor, slide.toColor),
  }));

  return {
    json: JSON.stringify({
      version: "multi-slide-v1",
      activeSlideIndex: 0,
      slides: slidePayload,
    }),
    firstSlideThumbnailUrl: slidePayload[0]?.thumbnailUrl || "",
  };
};

const createDemoTemplate = (
  id: string,
  name: string,
  width: number,
  height: number,
  slides: SlideSpec[],
): DemoTemplate => {
  const payload = createMultiSlideTemplateJson(width, height, slides);

  return {
    id,
    name,
    width,
    height,
    json: payload.json,
    thumbnailDataUrl: payload.firstSlideThumbnailUrl,
  };
};

export const DEMO_TEMPLATES: DemoTemplate[] = [
  createDemoTemplate("demo-template-pitch", "Pitch Deck Intro", 1920, 1080, [
      {
        title: "Pitch Deck\nOverview",
        subtitle: "Show your product vision and key metrics in one concise story.",
        fromColor: "#dbeafe",
        toColor: "#bfdbfe",
      },
      {
        title: "Problem &\nOpportunity",
        subtitle: "Clarify customer pain points and why now is the right time.",
        fromColor: "#e0e7ff",
        toColor: "#c7d2fe",
      },
      {
        title: "Solution\nRoadmap",
        subtitle: "Present milestones, delivery timeline, and expected impact.",
        fromColor: "#dbeafe",
        toColor: "#93c5fd",
      },
    ]),
  createDemoTemplate("demo-template-marketing", "Marketing Launch", 1920, 1080, [
      {
        title: "Product\nLaunch",
        subtitle: "Present your campaign message with a clean and bold structure.",
        fromColor: "#fee2e2",
        toColor: "#fecaca",
      },
      {
        title: "Audience\nSegments",
        subtitle: "Define customer personas and the channels that matter most.",
        fromColor: "#ffe4e6",
        toColor: "#fecdd3",
      },
      {
        title: "Launch\nTimeline",
        subtitle: "Align content, paid media, and partnerships across phases.",
        fromColor: "#fee2e2",
        toColor: "#fca5a5",
      },
    ]),
];
