import { NextResponse } from "next/server";
import { getStorage } from "@/services/storage";
import type { ClienteLookupInput } from "@/types/cliente";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClienteLookupInput;
    if (!body.whatsapp?.trim() && !body.email?.trim()) {
      return NextResponse.json(
        { error: "Informe WhatsApp ou e-mail." },
        { status: 400 },
      );
    }
    const cliente = await getStorage().lookupCliente(body);
    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 },
      );
    }
    return NextResponse.json({ cliente });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao localizar cliente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
