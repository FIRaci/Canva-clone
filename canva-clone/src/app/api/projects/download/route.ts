import { NextResponse } from "next/server";
import PptxGenJS from "pptxgenjs";

export const runtime = "nodejs";

type DownloadPayload = {
  imageDataUrl: string;
  name: string;
  width: number;
  height: number;
};

function sanitizeFileName(value: string) {
  const fallback = "project";
  const sanitized = value.replace(/[\\/:*?"<>|]/g, "-").trim();
  return sanitized || fallback;
}

export async function POST(req: Request) {
  try {
    const payload = (await req.json()) as Partial<DownloadPayload>;

    if (!payload.imageDataUrl || !payload.name || !payload.width || !payload.height) {
      return NextResponse.json({ error: "Missing download payload" }, { status: 400 });
    }

    const widthInches = Math.max(payload.width / 96, 1);
    const heightInches = Math.max(payload.height / 96, 1);

    const pptx = new PptxGenJS();
    pptx.defineLayout({
      name: "PROJECT_LAYOUT",
      width: widthInches,
      height: heightInches,
    });
    pptx.layout = "PROJECT_LAYOUT";

    const slide = pptx.addSlide();
    slide.addImage({
      data: payload.imageDataUrl,
      x: 0,
      y: 0,
      w: widthInches,
      h: heightInches,
    });

    const output = await pptx.write({ outputType: "arraybuffer" });
    const fileName = `${sanitizeFileName(payload.name)}.pptx`;

    const body =
      output instanceof ArrayBuffer
        ? output
        : output instanceof Uint8Array
          ? output.buffer
          : null;

    if (!body) {
      return NextResponse.json({ error: "Invalid PPTX output" }, { status: 500 });
    }

    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename=\"${fileName}\"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Failed to generate PPTX" }, { status: 500 });
  }
}
