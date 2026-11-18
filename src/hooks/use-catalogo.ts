import { useEffect, useState } from 'react';

import { api, ApiError } from '@/services/api';
import type { Catalogo, OpcaoCatalogo } from '@/types/api';

// O catálogo é fixo: uma busca por sessão do app basta, compartilhada entre as telas.
let catalogoEmMemoria: Catalogo | undefined;
let buscaEmAndamento: Promise<Catalogo> | undefined;

function carregarCatalogo(): Promise<Catalogo> {
  buscaEmAndamento ??= api<Catalogo>('/checklists/catalogo')
    .then((catalogo) => {
      catalogoEmMemoria = catalogo;

      return catalogo;
    })
    .finally(() => {
      buscaEmAndamento = undefined;
    });

  return buscaEmAndamento;
}

/** Rótulo em português de uma chave do catálogo; devolve a própria chave se ela não for encontrada. */
export function rotuloDe(opcoes: OpcaoCatalogo[] | undefined, valor: string | null | undefined): string {
  if (!valor) {
    return '';
  }

  return opcoes?.find((opcao) => opcao.valor === valor)?.rotulo ?? valor;
}

/** Catálogos fixos do checklist (itens, partes do veículo, tipos de avaria, pneus, combustível e limites). */
export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<Catalogo | undefined>(catalogoEmMemoria);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    if (catalogoEmMemoria) {
      return;
    }

    let ativo = true;

    carregarCatalogo()
      .then((resposta) => ativo && setCatalogo(resposta))
      .catch((excecao) => ativo && setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível carregar os catálogos.'));

    return () => {
      ativo = false;
    };
  }, []);

  return { catalogo, carregando: !catalogo && !erro, erro };
}
