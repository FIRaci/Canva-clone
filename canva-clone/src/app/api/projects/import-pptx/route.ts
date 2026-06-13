import JSZip from "jszip";
import { JSDOM } from "jsdom";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EMU_PER_PX = 9525;

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

function parseXml(xml: string) {
  return new JSDOM(xml, { contentType: "text/xml" }).window.document;
}

function toLocalName(value: string | undefined) {
  if (!value) return "";
  const parts = value.split(":");
  return parts[parts.length - 1] ?? value;
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

  // Solid fill
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

// Helper to calculate rotation from PPTX rot (which is 1/60,000 of a degree)
function getRotation(xfrm: Element | null) {
  if (!xfrm) return 0;
  const rot = parseInt(xfrm.getAttribute("rot") || "0");
  return rot / 60000;
}

// Extract base properties from an xfrm element
function extractXfrmBase(xfrm: Element | null, defaultW = 100, defaultH = 100) {
  const off = xfrm ? getFirstElementByTagNameAny(xfrm, ["a:off", "off"]) : null;
  const ext = xfrm ? getFirstElementByTagNameAny(xfrm, ["a:ext", "ext"]) : null;

  const left = emuToPx(off?.getAttribute("x"), 0);
  const top = emuToPx(off?.getAttribute("y"), 0);
  const width = Math.max(emuToPx(ext?.getAttribute("cx"), defaultW), 1);
  const height = Math.max(emuToPx(ext?.getAttribute("cy"), defaultH), 1);
  const angle = getRotation(xfrm);

  return { left, top, width, height, angle };
}

// Convert parsed shapes/images into Fabric JSON objects, preserving z-index via tree walking
async function parseNodeToFabricObjects(
  node: Element,
  zip: JSZip,
  relMap: Map<string, string>,
  objects: Array<Record<string, unknown>>
) {
  const localName = toLocalName(node.localName || node.tagName);

  if (localName === "grpSp") {
    const children = Array.from(node.children);
    for (const child of children) {
      await parseNodeToFabricObjects(child, zip, relMap, objects);
    }
    return;
  }

  if (localName === "sp") { // Shape or Textbox
    const shapeProps = getFirstElementByTagNameAny(node, ["p:spPr", "spPr"]);
    const xfrm = getFirstElementByTagNameAny(shapeProps || node, ["a:xfrm", "xfrm", "p:xfrm"]);
    const { left, top, width, height, angle } = extractXfrmBase(xfrm, 160, 48);

    const geom = getFirstElementByTagNameAny(shapeProps, ["a:prstGeom", "prstGeom"]);
    const preset = geom?.getAttribute("prst") ?? "rect";

    const fill = getRgbFromElement(shapeProps, "transparent");
    const line = getFirstElementByTagNameAny(shapeProps, ["a:ln", "ln"]);
    const strokeWidth = Math.max(emuToPx(getAttributeAny(line, ["w", "a:w"]), 0), 0);
    const stroke = line ? getRgbFromElement(line, "transparent") : "transparent";

    // If there is a background to the shape, add the shape object
    if (fill !== "transparent" || stroke !== "transparent" || preset !== "rect") {
      let type = "rect";
      if (preset === "ellipse") type = "circle";
      if (preset === "triangle") type = "triangle";
      
      const rx = preset === "roundRect" ? Math.round(Math.min(width, height) * 0.12) : 0;
      const ry = rx;

      if (type === "circle") {
        objects.push({
          type: "ellipse",
          version: "5.3.0",
          left,
          top,
          width,
          height,
          rx: width / 2,
          ry: height / 2,
          fill,
          stroke: stroke === "transparent" ? null : stroke,
          strokeWidth,
          angle,
          selectable: true,
          hasControls: true,
        });
      } else {
        objects.push({
          type,
          version: "5.3.0",
          left,
          top,
          width,
          height,
          fill,
          stroke: stroke === "transparent" ? null : stroke,
          strokeWidth,
          angle,
          rx,
          ry,
          selectable: true,
          hasControls: true,
        });
      }
    }

    // Process Text
    const textContainer = getFirstElementByTagNameAny(node, ["a:txBody", "txBody"]);
    if (textContainer) {
      const textNodes = getElementsByTagNameAny(textContainer, ["a:t", "t", "a:fld", "fld"]);
      const text = Array.from(textNodes)
        .map((node) => node.textContent?.trim() ?? "")
        .filter(Boolean)
        .join(" ")
        .trim();

      const resolvedText = text || (textContainer.textContent?.replace(/\s+/g, " ").trim() ?? "");

      if (resolvedText) {
        const paragraph = getFirstElementByTagNameAny(textContainer, ["a:p", "p"]);
        const paragraphProps = paragraph ? getFirstElementByTagNameAny(paragraph, ["a:pPr", "pPr"]) : null;
        const runProps = getFirstElementByTagNameAny(textContainer, ["a:rPr", "rPr", "a:defRPr", "defRPr"]);

        const align = mapPptAlign(getAttributeAny(paragraphProps, ["algn", "a:algn"]));
        const sizeInHundredthPt = Number(getAttributeAny(runProps, ["sz", "a:sz"]));
        const fontSize = Number.isFinite(sizeInHundredthPt) && sizeInHundredthPt > 0
          ? Math.max(10, Math.round((sizeInHundredthPt / 100) * (96 / 72)))
          : Math.max(14, Math.round(Math.min(height * 0.5, 36)));
        const bold = getAttributeAny(runProps, ["b", "a:b"]) === "1";
        const textFill = getRgbFromElement(runProps, "#0F172A");

        objects.push({
          type: "textbox",
          version: "5.3.0",
          left,
          top,
          width,
          height,
          fill: textFill,
          fontSize,
          fontFamily: "Arial",
          fontWeight: bold ? 700 : 400,
          textAlign: align,
          text: resolvedText,
          angle,
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
  }

  if (localName === "pic") { // Image
    const blip = getFirstElementByTagNameAny(node, ["a:blip", "blip"]);
    const relId = getAttributeAny(blip, ["r:embed", "embed"]);
    if (relId) {
      const mediaPath = relMap.get(relId);
      if (mediaPath) {
        const mediaFile = zip.file(mediaPath);
        if (mediaFile) {
          const bytes = await mediaFile.async("uint8array");
          const src = toDataUrl(bytes, getMimeTypeByPath(mediaPath));
          
          const shapeProps = getFirstElementByTagNameAny(node, ["p:spPr", "spPr"]);
          const xfrm = getFirstElementByTagNameAny(shapeProps || node, ["a:xfrm", "xfrm"]);
          const { left, top, width, height, angle } = extractXfrmBase(xfrm, 100, 100);

          objects.push({
            type: "image",
            version: "5.3.0",
            left,
            top,
            width,
            height,
            scaleX: 1,
            scaleY: 1,
            src,
            angle,
            crossOrigin: "anonymous",
            filters: [],
            selectable: true,
            hasControls: true,
          });
        }
      }
    }
  }
}

async function parseSlideObjects(
  zip: JSZip,
  slideXml: string,
  slidePath: string,
  slideRelsXml?: string,
  canvasWidth = 1920,
  canvasHeight = 1080
) {
  const doc = parseXml(slideXml);
  const relMap = slideRelsXml ? parseRelationships(slideRelsXml, getZipDir(slidePath)) : new Map();
  const objects: Array<Record<string, unknown>> = [];

  objects.push({
    type: "rect",
    version: "5.3.0",
    left: 0,
    top: 0,
    width: canvasWidth,
    height: canvasHeight,
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
  });

  const spTree = getFirstElementByTagNameAny(doc, ["p:spTree", "spTree"]);
  if (spTree) {
    const children = Array.from(spTree.children);
    for (const child of children) {
      await parseNodeToFabricObjects(child, zip, relMap, objects);
    }
  }

  return JSON.stringify({
    version: "5.3.0",
    objects,
  });
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

    const slideJson = await parseSlideObjects(zip, slideXml, slidePath, slideRelsXml, width, height);

    slides.push({
      id: `slide-${index + 1}`,
      json: slideJson,
      width,
      height,
    });
  }

  if (slides.length === 0) {
    const fallbackJson = JSON.stringify({
      version: "5.3.0",
      objects: [
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
        }
      ]
    });
    slides.push({
      id: "slide-1",
      json: fallbackJson,
      width,
      height,
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
      
      const json = JSON.stringify({
        version: "5.3.0",
        objects: [
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
          },
          {
            type: "image",
            version: "5.3.0",
            left: 0,
            top: 0,
            width,
            height,
            scaleX: 1,
            scaleY: 1,
            src: thumbnailSrc,
            crossOrigin: "anonymous",
            selectable: true,
            hasControls: true,
          }
        ]
      });

      return {
        width,
        height,
        json,
      };
    }
  } catch {
    // Fallback to empty safe canvas.
  }

  return {
    width,
    height,
    json: JSON.stringify({
      version: "5.3.0",
      objects: [{
          type: "rect",
          version: "5.3.0",
          left: 0,
          top: 0,
          width,
          height,
          fill: "white",
          selectable: false,
          hasControls: false,
          name: "clip"
      }],
    }),
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
  } catch (err) {
    console.error("Failed to parse PPTX normally:", err);
    try {
      const payload = await buildSafeFallbackPayload(file);
      return NextResponse.json({ data: payload });
    } catch {
      // Ignore and return generic fallback payload below.
    }

    const payload = {
      width: 1920,
      height: 1080,
      json: JSON.stringify({
        version: "5.3.0",
        objects: [],
      }),
    };

    return NextResponse.json({ data: payload });
  }
}
