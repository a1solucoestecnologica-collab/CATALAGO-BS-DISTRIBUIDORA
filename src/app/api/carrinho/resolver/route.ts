import { NextResponse } from "next/server";
import { resolveCartDisplayLine } from "@/services/api/line-resolver";
import type { CartLineStored } from "@/types/catalog";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { lines?: CartLineStored[] };
    const lines = body.lines;
    if (!Array.isArray(lines) || lines.length === 0) {
      return NextResponse.json({ lines: [] });
    }

    const resolved = await Promise.all(
      lines.map(async (line) => {
        const display = await resolveCartDisplayLine(line);
        if (!display) return null;
        return { ...line, ...display };
      }),
    );

    return NextResponse.json({
      lines: resolved.filter((l): l is NonNullable<typeof l> => l !== null),
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao resolver carrinho.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
