import { NextResponse } from "next/server";
import { buildSolicitacaoItemsFromBling } from "@/services/api/line-resolver";
import { getStorage } from "@/services/storage";
import type { SolicitacaoSubmitInput } from "@/types/solicitacao";

const MAX_OBSERVACOES = 2000;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SolicitacaoSubmitInput;

    if (!body.cliente_id?.trim()) {
      return NextResponse.json(
        { error: "cliente_id é obrigatório." },
        { status: 400 },
      );
    }
    if (!Array.isArray(body.itens) || body.itens.length === 0) {
      return NextResponse.json(
        { error: "A solicitação deve conter ao menos um item." },
        { status: 400 },
      );
    }

    const cliente = await getStorage().getClienteById(body.cliente_id);
    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente não encontrado." },
        { status: 404 },
      );
    }

    const observacoes = body.observacoes?.trim().slice(0, MAX_OBSERVACOES);

    const built = await buildSolicitacaoItemsFromBling(body.itens);
    if (!built.ok) {
      return NextResponse.json({ error: built.error }, { status: 400 });
    }

    const solicitacao = await getStorage().createSolicitacao({
      cliente_id: body.cliente_id,
      itens: built.itens,
      observacoes: observacoes || undefined,
    });

    return NextResponse.json({ solicitacao });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "Erro ao criar solicitação.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
