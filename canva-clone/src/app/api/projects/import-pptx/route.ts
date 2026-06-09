import JSZip from "jszip";
import { JSDOM } from "jsdom";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EMU_PER_PX = 9525;

type SlideShape = {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  align: "left" | "center" | "right" | "justify";
  fontSize: number;
  fontWeight: number;
  fill: string;
};

type SlideImage = {
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
};

type SlidePrimitive = {
  type: "rect" | "ellipse";
  x: number;
  y: number;
  width: number;
  height: number;
  fill: string;
  stroke: string | null;
  strokeWidth: number;
  rx?: number;
  ry?: number;
};

type ImportedPayload = {
  width: number;
  height: number;
  json: string;
};

type ImportedSlidePayload = {
  id: string;
  json: string;
  width: number;
  height: number;
  thumbnailUrl?: string;
};

function emuToPx(value: string | null | undefined, fallback = 0) {
  const parsed = Number(value ?? "");
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(0, Math.round(parsed / EMU_PER_PX));
}

function getElementsByTagNameAny(parent: Element | Document, names: string[]) {
  const wanted = new Set(names.map((name) => toLocalName(name)));
  const allNodes = parent.getElementsByTagName("*");
  const matches: Element[] = [];

  for (let index = 0; index < allNodes.length; index += 1) {
    const node = allNodes[index] as Element;
    const local = toLocalName(node.localName || node.tagName);
    if (wanted.has(local)) {
      matches.push(node);
    }
  }

  return matches;
}

function getFirstElementByTagNameAny(parent: Element | Document, names: string[]) {
  return getElementsByTagNameAny(parent, names)[0] ?? null;
}

function parseXml(xml: string) {
  return new JSDOM(xml, { contentType: "text/xml" }).window.document;
}

function toLocalName(value: string | undefined) {
  if (!value) return "";
  const parts = value.split(":");
  return parts[parts.length - 1] ?? value;
}

function getAttributeAny(element: Element | null, names: string[]) {
  if (!element) return null;

  const wanted = new Set(names.map((name) => toLocalName(name)));

  for (const name of names) {
    const value = element.getAttribute(name);
    if (value !== null) return value;
  }

  const attributes = Array.from(element.attributes ?? []);
  for (const attribute of attributes) {
    const local = toLocalName(attribute.localName || attribute.name);
    if (wanted.has(local)) {
      return attribute.value;
    }
  }

  return null;
}

function getRgbFromElement(element: Element | null, fallback: string) {
  if (!element) return fallback;

  const srgb = getFirstElementByTagNameAny(element, ["a:srgbClr", "srgbClr"]);
  const value = srgb?.getAttribute("val");
  if (value && /^[0-9A-Fa-f]{6}$/.test(value)) {
    return `#${value.toUpperCase()}`;
  }

  return fallback;
}

function mapPptAlign(align: string | null): "left" | "center" | "right" | "justify" {
  switch (align) {
    case "ctr":
      return "center";
    case "r":
      return "right";
    case "just":
      return "justify";
    default:
      return "left";
  }
}

function getZipDir(path: string) {
  const normalized = path.replace(/\\/g, "/");
  const lastSlash = normalized.lastIndexOf("/");
  if (lastSlash <= 0) return "";
  return normalized.slice(0, lastSlash);
}

function getMimeTypeByPath(path: string) {
  const lower = path.toLowerCase();
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".gif")) return "image/gif";
  if (lower.endsWith(".webp")) return "image/webp";
  if (lower.endsWith(".svg")) return "image/svg+xml";
  if (lower.endsWith(".bmp")) return "image/bmp";
  return "application/octet-stream";
}

function toDataUrl(bytes: Uint8Array, mimeType: string) {
  const base64 = Buffer.from(bytes).toString("base64");
  return `data:${mimeType};base64,${base64}`;
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function svgToDataUrl(svg: string) {
  const base64 = Buffer.from(svg).toString("base64");
  return `data:image/svg+xml;base64,${base64}`;
}

function normalizeZipPath(baseDir: string, target: string) {
  const normalizedTarget = target.replace(/\\/g, "/").replace(/^\/+/, "");
  const baseParts = baseDir.split("/").filter(Boolean);
  const targetParts = normalizedTarget.startsWith("ppt/")
    ? normalizedTarget.split("/")
    : [...baseParts, ...normalizedTarget.split("/")];

  const resolved: string[] = [];
  for (const part of targetParts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      resolved.pop();
      continue;
    }

    resolved.push(part);
  }

  return resolved.join("/");
}

function parseRelationships(relsXml: string, baseDir: string) {
  const relsDoc = parseXml(relsXml);
  const relationships = getElementsByTagNameAny(relsDoc, ["Relationship"]);
  const map = new Map<string, string>();

  for (let index = 0; index < relationships.length; index += 1) {
    const relationship = relationships[index] as Element;
    const id = relationship.getAttribute("Id");
    const target = relationship.getAttribute("Target");

    if (!id || !target) continue;

    map.set(id, normalizeZipPath(baseDir, target));
  }

  return map;
}

function getSlideDimensions(presentationXml: string) {
  const doc = parseXml(presentationXml);
  const sldSz = getFirstElementByTagNameAny(doc, ["p:sldSz", "sldSz"]);

  const width = emuToPx(sldSz?.getAttribute("cx"), 1920);
  const height = emuToPx(sldSz?.getAttribute("cy"), 1080);

  return {
    width: Math.max(width, 320),
    height: Math.max(height, 180),
  };
}

function resolveFirstSlidePath(presentationXml: string, relsXml: string) {
  const presentationDoc = parseXml(presentationXml);
  const relsDoc = parseXml(relsXml);

  const sldIdNode = getElementsByTagNameAny(presentationDoc, ["p:sldId", "sldId"])[0] as Element | undefined;
  const relId = sldIdNode?.getAttribute("r:id") ?? sldIdNode?.getAttribute("id");

  if (!relId) {
    return "ppt/slides/slide1.xml";
  }

  const relationships = getElementsByTagNameAny(relsDoc, ["Relationship"]);
  for (let index = 0; index < relationships.length; index += 1) {
    const relationship = relationships[index] as Element;
    if (relationship.getAttribute("Id") !== relId) continue;

    const target = relationship.getAttribute("Target");
    if (!target) break;

    return normalizeZipPath("ppt", target);
  }

  return "ppt/slides/slide1.xml";
}

function resolveAllSlidePaths(presentationXml: string, relsXml: string) {
  const presentationDoc = parseXml(presentationXml);
  const relMap = parseRelationships(relsXml, "ppt");
  const slideIdNodes = getElementsByTagNameAny(presentationDoc, ["p:sldId", "sldId"]);

  const paths: string[] = [];

  for (const node of slideIdNodes) {
    const relId = getAttributeAny(node, ["r:id", "id"]);
    if (!relId) continue;

    const path = relMap.get(relId);
    if (path && !paths.includes(path)) {
      paths.push(path);
    }
  }

  if (paths.length === 0) {
    paths.push(resolveFirstSlidePath(presentationXml, relsXml));
  }

  return paths;
}

function parseSlideShapes(slideXml: string, canvasWidth: number, canvasHeight: number) {
  const doc = parseXml(slideXml);
  const shapeNodes = getElementsByTagNameAny(doc, ["p:sp", "sp", "p:graphicFrame", "graphicFrame", "p:cxnSp", "cxnSp"]);
  const shapes: SlideShape[] = [];

  for (let index = 0; index < shapeNodes.length; index += 1) {
    const shapeNode = shapeNodes[index] as Element;
    const textContainer = getFirstElementByTagNameAny(shapeNode, ["a:txBody", "txBody"]);
    if (!textContainer) continue;

    const textNodes = getElementsByTagNameAny(textContainer, ["a:t", "t", "a:fld", "fld"]);

    if (textNodes.length === 0) continue;

    const text = Array.from(textNodes)
      .map((node) => node.textContent?.trim() ?? "")
      .filter(Boolean)
      .join(" ")
      .trim();

    const resolvedText = text || (textContainer.textContent?.replace(/\s+/g, " ").trim() ?? "");

    if (!resolvedText) continue;

    const xfrm = getFirstElementByTagNameAny(shapeNode, ["a:xfrm", "xfrm", "p:xfrm"]);
    const off = xfrm ? getFirstElementByTagNameAny(xfrm, ["a:off", "off"]) : null;
    const ext = xfrm ? getFirstElementByTagNameAny(xfrm, ["a:ext", "ext"]) : null;
    const paragraph = getFirstElementByTagNameAny(textContainer, ["a:p", "p"]);
    const paragraphProps = paragraph ? getFirstElementByTagNameAny(paragraph, ["a:pPr", "pPr"]) : null;
    const runProps = getFirstElementByTagNameAny(textContainer, ["a:rPr", "rPr", "a:defRPr", "defRPr"]);

    const x = emuToPx(off?.getAttribute("x"), Math.round(canvasWidth * 0.08));
    const y = emuToPx(off?.getAttribute("y"), Math.round(canvasHeight * 0.08));
    const width = Math.max(emuToPx(ext?.getAttribute("cx"), Math.round(canvasWidth * 0.84)), 160);
    const height = Math.max(emuToPx(ext?.getAttribute("cy"), 80), 48);
    const align = mapPptAlign(getAttributeAny(paragraphProps, ["algn", "a:algn"]));
    const sizeInHundredthPt = Number(getAttributeAny(runProps, ["sz", "a:sz"]));
    const fontSize = Number.isFinite(sizeInHundredthPt) && sizeInHundredthPt > 0
      ? Math.max(10, Math.round((sizeInHundredthPt / 100) * (96 / 72)))
      : Math.max(14, Math.round(Math.min(height * 0.5, 36)));
    const bold = getAttributeAny(runProps, ["b", "a:b"]) === "1";
    const fill = getRgbFromElement(runProps, "#0F172A");

    shapes.push({
      x,
      y,
      width,
      height,
      text: resolvedText,
      align,
      fontSize,
      fontWeight: bold ? 700 : 400,
      fill,
    });
  }

  return shapes;
}

function parseSlidePrimitives(slideXml: string) {
  const doc = parseXml(slideXml);
  const shapeNodes = getElementsByTagNameAny(doc, ["p:sp", "sp"]);
  const primitives: SlidePrimitive[] = [];

  for (let index = 0; index < shapeNodes.length; index += 1) {
    const shapeNode = shapeNodes[index] as Element;
    const textNodes = getElementsByTagNameAny(shapeNode, ["a:t", "t"]);
    if (textNodes.length > 0) continue;

    const shapeProps = getFirstElementByTagNameAny(shapeNode, ["p:spPr", "spPr"]);
    if (!shapeProps) continue;

    const xfrm = getFirstElementByTagNameAny(shapeProps, ["a:xfrm", "xfrm"]);
    const off = xfrm ? getFirstElementByTagNameAny(xfrm, ["a:off", "off"]) : null;
    const ext = xfrm ? getFirstElementByTagNameAny(xfrm, ["a:ext", "ext"]) : null;

    const x = emuToPx(off?.getAttribute("x"), 0);
    const y = emuToPx(off?.getAttribute("y"), 0);
    const width = Math.max(emuToPx(ext?.getAttribute("cx"), 0), 1);
    const height = Math.max(emuToPx(ext?.getAttribute("cy"), 0), 1);

    const geom = getFirstElementByTagNameAny(shapeProps, ["a:prstGeom", "prstGeom"]);
    const preset = geom?.getAttribute("prst") ?? "rect";

    const line = getFirstElementByTagNameAny(shapeProps, ["a:ln", "ln"]);
    const strokeWidth = Math.max(emuToPx(getAttributeAny(line, ["w", "a:w"]), 0), 0);
    const stroke = line ? getRgbFromElement(line, "#0F172A") : null;
    const fill = getRgbFromElement(shapeProps, "transparent");

    if (preset === "ellipse") {
      primitives.push({
        type: "ellipse",
        x,
        y,
        width,
        height,
        fill,
        stroke,
        strokeWidth,
      });
      continue;
    }

    if (preset === "roundRect") {
      primitives.push({
        type: "rect",
        x,
        y,
        width,
        height,
        fill,
        stroke,
        strokeWidth,
        rx: Math.round(Math.min(width, height) * 0.12),
        ry: Math.round(Math.min(width, height) * 0.12),
      });
      continue;
    }

    if (preset === "rect" || preset === "line") {
      primitives.push({
        type: "rect",
        x,
        y,
        width,
        height: preset === "line" ? Math.max(2, strokeWidth || 2) : height,
        fill: preset === "line" ? "transparent" : fill,
        stroke,
        strokeWidth,
      });
    }
  }

  return primitives;
}

function primitiveToImage(primitive: SlidePrimitive): SlideImage {
  const safeStroke = primitive.stroke ?? "transparent";
  const safeFill = primitive.fill || "transparent";
  const strokeWidth = Math.max(primitive.strokeWidth || 0, 0);

  if (primitive.type === "ellipse") {
    const rx = Math.max(primitive.width / 2, 1);
    const ry = Math.max(primitive.height / 2, 1);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(primitive.width, 1)}" height="${Math.max(primitive.height, 1)}" viewBox="0 0 ${Math.max(primitive.width, 1)} ${Math.max(primitive.height, 1)}"><ellipse cx="${rx}" cy="${ry}" rx="${Math.max(rx - strokeWidth / 2, 0)}" ry="${Math.max(ry - strokeWidth / 2, 0)}" fill="${safeFill}" stroke="${safeStroke}" stroke-width="${strokeWidth}"/></svg>`;

    return {
      x: primitive.x,
      y: primitive.y,
      width: Math.max(primitive.width, 1),
      height: Math.max(primitive.height, 1),
      src: svgToDataUrl(svg),
    };
  }

  const rx = Math.max(primitive.rx ?? 0, 0);
  const ry = Math.max(primitive.ry ?? 0, 0);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(primitive.width, 1)}" height="${Math.max(primitive.height, 1)}" viewBox="0 0 ${Math.max(primitive.width, 1)} ${Math.max(primitive.height, 1)}"><rect x="${strokeWidth / 2}" y="${strokeWidth / 2}" width="${Math.max(primitive.width - strokeWidth, 0)}" height="${Math.max(primitive.height - strokeWidth, 0)}" rx="${rx}" ry="${ry}" fill="${safeFill}" stroke="${safeStroke}" stroke-width="${strokeWidth}"/></svg>`;

  return {
    x: primitive.x,
    y: primitive.y,
    width: Math.max(primitive.width, 1),
    height: Math.max(primitive.height, 1),
    src: svgToDataUrl(svg),
  };
}

function findPresentationThumbnail(zip: JSZip) {
  const candidates = [
    "docProps/thumbnail.jpeg",
    "docProps/thumbnail.jpg",
    "docProps/thumbnail.png",
  ];

  for (const path of candidates) {
    const file = zip.file(path);
    if (file) return { file, path };
  }

  return null;
}

async function buildNonTextSlideImage(
  zip: JSZip,
  width: number,
  height: number,
  primitives: SlidePrimitive[],
  images: SlideImage[],
) {
  if (primitives.length === 0 && images.length === 0) {
    const thumbnail = findPresentationThumbnail(zip);
    if (!thumbnail) return null;

    const bytes = await thumbnail.file.async("uint8array");
    const thumbnailSrc = toDataUrl(bytes, getMimeTypeByPath(thumbnail.path));
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(width, 1)}" height="${Math.max(height, 1)}" viewBox="0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}"><image href="${escapeXml(thumbnailSrc)}" x="0" y="0" width="${Math.max(width, 1)}" height="${Math.max(height, 1)}" preserveAspectRatio="none" /></svg>`;
    return svgToDataUrl(svg);
  }

  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.max(width, 1)}" height="${Math.max(height, 1)}" viewBox="0 0 ${Math.max(width, 1)} ${Math.max(height, 1)}">`,
  ];

  for (const primitive of primitives) {
    const stroke = escapeXml(primitive.stroke ?? "none");
    const fill = escapeXml(primitive.fill || "transparent");
    const strokeWidth = Math.max(primitive.strokeWidth || 0, 0);

    if (primitive.type === "ellipse") {
      parts.push(
        `<ellipse cx="${primitive.x + primitive.width / 2}" cy="${primitive.y + primitive.height / 2}" rx="${Math.max(primitive.width / 2, 1)}" ry="${Math.max(primitive.height / 2, 1)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`,
      );
      continue;
    }

    parts.push(
      `<rect x="${primitive.x}" y="${primitive.y}" width="${Math.max(primitive.width, 1)}" height="${Math.max(primitive.height, 1)}" rx="${Math.max(primitive.rx ?? 0, 0)}" ry="${Math.max(primitive.ry ?? 0, 0)}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />`,
    );
  }

  for (const image of images) {
    parts.push(
      `<image href="${escapeXml(image.src)}" x="${image.x}" y="${image.y}" width="${Math.max(image.width, 1)}" height="${Math.max(image.height, 1)}" preserveAspectRatio="none" />`,
    );
  }

  parts.push("</svg>");
  return svgToDataUrl(parts.join(""));
}

async function parseSlideImages(
  zip: JSZip,
  slideXml: string,
  slidePath: string,
  slideRelsXml?: string,
) {
  if (!slideRelsXml) {
    return [] as SlideImage[];
  }

  const relMap = parseRelationships(slideRelsXml, getZipDir(slidePath));
  const doc = parseXml(slideXml);
  const picNodes = getElementsByTagNameAny(doc, ["p:pic", "pic"]);
  const images: SlideImage[] = [];

  for (let index = 0; index < picNodes.length; index += 1) {
    const picNode = picNodes[index] as Element;
    const blip = getFirstElementByTagNameAny(picNode, ["a:blip", "blip"]);
    const relId = getAttributeAny(blip, ["r:embed", "embed"]);
    if (!relId) continue;

    const mediaPath = relMap.get(relId);
    if (!mediaPath) continue;

    const mediaFile = zip.file(mediaPath);
    if (!mediaFile) continue;

    const bytes = await mediaFile.async("uint8array");
    const src = toDataUrl(bytes, getMimeTypeByPath(mediaPath));

    const xfrm = getFirstElementByTagNameAny(picNode, ["a:xfrm", "xfrm"]);
    const off = xfrm ? getFirstElementByTagNameAny(xfrm, ["a:off", "off"]) : null;
    const ext = xfrm ? getFirstElementByTagNameAny(xfrm, ["a:ext", "ext"]) : null;

    const x = emuToPx(off?.getAttribute("x"), 0);
    const y = emuToPx(off?.getAttribute("y"), 0);
    const width = Math.max(emuToPx(ext?.getAttribute("cx"), 100), 1);
    const height = Math.max(emuToPx(ext?.getAttribute("cy"), 100), 1);

    images.push({ x, y, width, height, src });
  }

  return images;
}

function buildCanvasJson(width: number, height: number, shapes: SlideShape[], slideImageSrc: string | null): string {
  const objects: Array<Record<string, unknown>> = [
    {
      type: "rect",
      version: "5.3.0",
      left: 0,
      top: 0,
      width,
      height,
      fill: "white",
      stroke: null,
      strokeWidth: 1,
      selectable: false,
      hasControls: false,
      name: "clip",
      shadow: {
        color: "rgba(0,0,0,0.8)",
        blur: 5,
        offsetX: 0,
        offsetY: 0,
        affectStroke: false,
        nonScaling: false,
      },
    },
  ];

  if (slideImageSrc) {
    objects.push({
      type: "image",
      version: "5.3.0",
      left: 0,
      top: 0,
      width,
      height,
      scaleX: 1,
      scaleY: 1,
      src: slideImageSrc,
      crossOrigin: "anonymous",
      filters: [],
      selectable: true,
      hasControls: true,
    });
  }

  if (shapes.length > 0) {
    for (const shape of shapes.slice(0, 40)) {
      objects.push({
        type: "textbox",
        version: "5.3.0",
        left: shape.x,
        top: shape.y,
        width: Math.min(shape.width, width),
        height: shape.height,
        fill: shape.fill,
        fontSize: shape.fontSize,
        fontFamily: "Arial",
        fontWeight: shape.fontWeight,
        textAlign: shape.align,
        text: shape.text,
        styles: [],
        lineHeight: 1.16,
        charSpacing: 0,
        splitByGrapheme: false,
        selectable: true,
        hasControls: true,
        editable: true,
      });
    }
  }

  return JSON.stringify({
    version: "5.3.0",
    objects,
  });
}

async function parsePptxToCanvas(file: File): Promise<ImportedPayload> {
  const bytes = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(bytes);

  const presentationXml = await zip.file("ppt/presentation.xml")?.async("text");
  const relsXml = await zip.file("ppt/_rels/presentation.xml.rels")?.async("text");

  const { width, height } = presentationXml
    ? getSlideDimensions(presentationXml)
    : { width: 1920, height: 1080 };

  const slidePaths = presentationXml && relsXml
    ? resolveAllSlidePaths(presentationXml, relsXml)
    : ["ppt/slides/slide1.xml"];

  const slides: ImportedSlidePayload[] = [];

  for (let index = 0; index < slidePaths.length; index += 1) {
    const slidePath = slidePaths[index];
    if (!slidePath) continue;

    const slideXml = await zip.file(slidePath)?.async("text");
    if (!slideXml) continue;

    const slideRelsPath = `${getZipDir(slidePath)}/_rels/${slidePath.split("/").pop()}.rels`;
    const slideRelsXml = await zip.file(slideRelsPath)?.async("text");

    const shapes = parseSlideShapes(slideXml, width, height);
    const primitives = parseSlidePrimitives(slideXml);
    const images = await parseSlideImages(zip, slideXml, slidePath, slideRelsXml);
    const slideImageSrc = await buildNonTextSlideImage(zip, width, height, primitives, images);
    const slideJson = buildCanvasJson(width, height, shapes, slideImageSrc);

    slides.push({
      id: `slide-${index + 1}`,
      json: slideJson,
      width,
      height,
      thumbnailUrl: slideImageSrc ?? undefined,
    });
  }

  if (slides.length === 0) {
    const slideImageSrc = await buildNonTextSlideImage(zip, width, height, [], []);
    slides.push({
      id: "slide-1",
      json: buildCanvasJson(width, height, [], slideImageSrc),
      width,
      height,
      thumbnailUrl: slideImageSrc ?? undefined,
    });
  }

  const json = JSON.stringify({
    version: "multi-slide-v1",
    activeSlideIndex: 0,
    slides,
  });

  return { width, height, json };
}

async function buildSafeFallbackPayload(file: File): Promise<ImportedPayload> {
  const width = 1920;
  const height = 1080;

  try {
    const bytes = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(bytes);
    const thumbnail = findPresentationThumbnail(zip);

    if (thumbnail) {
      const thumbnailBytes = await thumbnail.file.async("uint8array");
      const thumbnailSrc = toDataUrl(thumbnailBytes, getMimeTypeByPath(thumbnail.path));
      return {
        width,
        height,
        json: buildCanvasJson(width, height, [], thumbnailSrc),
      };
    }
  } catch {
    // Fallback to empty safe canvas.
  }

  return {
    width,
    height,
    json: buildCanvasJson(width, height, [], null),
  };
}

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (!file.name.toLowerCase().endsWith(".pptx")) {
    return NextResponse.json({ error: "Only .pptx files are supported" }, { status: 400 });
  }

  try {
    const payload = await parsePptxToCanvas(file);
    return NextResponse.json({ data: payload });
  } catch {
    try {
      const payload = await buildSafeFallbackPayload(file);
      return NextResponse.json({ data: payload });
    } catch {
      // Ignore and return generic fallback payload below.
    }

    const payload = {
      width: 1920,
      height: 1080,
      json: buildCanvasJson(1920, 1080, [], null),
    };

    return NextResponse.json({ data: payload });
  }
}
