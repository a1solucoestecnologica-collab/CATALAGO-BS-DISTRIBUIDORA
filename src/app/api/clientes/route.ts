import { NextResponse } from "next/server";
import { getStorage } from "@/services/storage";
import type { ClienteRegistroInput } from "@/types/cliente";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as ClienteRegistroInput;
    if (!body.nome?.trim() || !body.whatsapp?.trim() || !body.email?.trim()) {
      return NextResponse.json(
        { error: "Nome, WhatsApp e e-mail são obrigatórios." },
        { status: 400 },
      );
    }
    const cliente = await getStorage().registerCliente(body);
    return NextResponse.json({ cliente });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erro ao registrar cliente.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
