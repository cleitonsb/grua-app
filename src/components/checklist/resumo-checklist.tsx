import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Cartao } from '@/components/cartao';
import { FotoAmpliada, MiniaturaFoto } from '@/components/checklist/miniatura-foto';
import { VeiculoDesenho } from '@/components/checklist/veiculo-desenho';
import { ContadorCard } from '@/components/contador-card';
import { ThemedText } from '@/components/themed-text';
import { Fontes, Spacing } from '@/constants/theme';
import { rotuloDe, useCatalogo } from '@/hooks/use-catalogo';
import { useTheme } from '@/hooks/use-theme';
import type { Catalogo, Checklist, CorrecaoChecklist, FotoChecklist } from '@/types/api';
import { COR_DA_LETRA_DO_TIPO, COR_DO_TIPO, LETRA_DO_TIPO } from '@/utils/desenho';
import { formatarCpfCnpj, formatarPlaca, formatarQuando } from '@/utils/formatadores';

const CAMPOS_CORRIGIDOS: Record<string, string> = {
  local_retirada: 'Local de retirada',
  destino: 'Destino',
  cliente_acompanha: 'Cliente acompanha',
  pneu_dianteiro: 'Pneu dianteiro',
  pneu_traseiro: 'Pneu traseiro',
  pneu_estepe: 'Estepe',
  combustivel: 'Combustível',
  observacoes_avarias: 'Observações das avarias',
  observacoes_gerais: 'Observações gerais',
};

/** Texto de um valor do registro de correção: sim/não, rótulo do catálogo, "Presente (obs.)" ou o próprio texto. */
function textoDoValor(valor: unknown, catalogo?: Catalogo): string {
  if (valor === null || valor === undefined || valor === '') return 'vazio';
  if (typeof valor === 'boolean') return valor ? 'Sim' : 'Não';

  if (typeof valor === 'object') {
    const item = valor as { presente?: boolean; observacao?: string | null };

    return item.presente ? `Presente${item.observacao ? ` (${item.observacao})` : ''}` : 'Ausente';
  }

  const texto = String(valor);

  return rotuloDe(catalogo?.estados_pneu, texto) !== texto
    ? rotuloDe(catalogo?.estados_pneu, texto)
    : rotuloDe(catalogo?.niveis_combustivel, texto);
}

/** Uma linha "Campo: de → para" do que a correção mudou. */
export function descreverAlteracao(chave: string, alteracao: { de: unknown; para: unknown }, catalogo?: Catalogo): string {
  const rotulo = chave.startsWith('item:')
    ? `Item ${rotuloDe(catalogo?.itens, chave.slice(5)).toLowerCase()}`
    : (CAMPOS_CORRIGIDOS[chave] ?? chave);

  return `${rotulo}: ${textoDoValor(alteracao.de, catalogo)} → ${textoDoValor(alteracao.para, catalogo)}`;
}

/**
 * Visão somente leitura completa do checklist: serviço, pneus e combustível, avarias com marcadores e miniaturas,
 * itens com fotos e observações, e as correções do administrador. Usada no detalhe e no resumo do passo 4.
 */
export function ResumoChecklist({ checklist }: { checklist: Checklist }) {
  const theme = useTheme();
  const { catalogo } = useCatalogo();
  const [ampliada, setAmpliada] = useState<FotoChecklist>();
  const rota = checklist.local_retirada && checklist.destino ? `${checklist.local_retirada} → ${checklist.destino}` : undefined;

  return (
    <View style={estilos.resumo}>
      <Cartao style={estilos.resumoDoServico}>
        <LinhaDoResumo
          rotulo="Cliente"
          valor={checklist.cliente?.nome}
          detalhe={checklist.cliente ? formatarCpfCnpj(checklist.cliente.documento) : undefined}
        />
        <LinhaDoResumo
          rotulo="Veículo"
          valor={
            checklist.veiculo
              ? `${checklist.veiculo.modelo} · ${formatarPlaca(checklist.veiculo.placa)}${checklist.veiculo.cor ? ` · ${checklist.veiculo.cor}` : ''}`
              : undefined
          }
        />
        <LinhaDoResumo rotulo="Rota" valor={rota} />
        <LinhaDoResumo
          rotulo="Cliente acompanha"
          valor={checklist.cliente_acompanha === null ? undefined : checklist.cliente_acompanha ? 'Sim' : 'Não'}
        />
        <LinhaDoResumo rotulo="Motorista" valor={checklist.motorista.nome} />
        {checklist.origem ? (
          <LinhaDoResumo rotulo="Retirada" valor={`#${checklist.origem.id} · ${formatarQuando(checklist.origem.data_hora)}`} />
        ) : null}
      </Cartao>

      <View style={estilos.contagens}>
        <ContadorCard valor={checklist.contagens.itens_presentes} rotulo="Itens presentes" />
        <ContadorCard valor={checklist.contagens.fotos} rotulo="Fotos tiradas" />
        <ContadorCard valor={checklist.contagens.avarias} rotulo="Avarias" />
      </View>

      <Secao titulo="Pneus e combustível">
        <Cartao style={estilos.resumoDoServico}>
          <LinhaDoResumo rotulo="Pneu dianteiro" valor={rotuloDe(catalogo?.estados_pneu, checklist.pneus.dianteiro) || undefined} />
          <LinhaDoResumo rotulo="Pneu traseiro" valor={rotuloDe(catalogo?.estados_pneu, checklist.pneus.traseiro) || undefined} />
          <LinhaDoResumo rotulo="Estepe" valor={rotuloDe(catalogo?.estados_pneu, checklist.pneus.estepe) || undefined} />
          <LinhaDoResumo rotulo="Combustível" valor={rotuloDe(catalogo?.niveis_combustivel, checklist.combustivel) || undefined} />
        </Cartao>
      </Secao>

      <Secao titulo="Avarias">
        <BlocoDeAvarias checklist={checklist} onAmpliar={setAmpliada} />
      </Secao>

      <Secao titulo="Itens do veículo">
        <BlocoDeItens checklist={checklist} onAmpliar={setAmpliada} />
      </Secao>

      {checklist.correcoes.length > 0 ? (
        <Secao titulo="Correções do administrador">
          {checklist.correcoes.map((correcao: CorrecaoChecklist) => (
            <View key={`${correcao.criada_em}-${correcao.motivo}`} style={[estilos.cartao, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText type="smallBold">
                {correcao.autor} · {formatarQuando(correcao.criada_em)}
              </ThemedText>
              <ThemedText type="small">Motivo: {correcao.motivo}</ThemedText>
              {Object.entries(correcao.alteracoes).map(([chave, alteracao]) => (
                <ThemedText key={chave} type="small" themeColor="textSecondary">
                  {descreverAlteracao(chave, alteracao, catalogo)}
                </ThemedText>
              ))}
            </View>
          ))}
        </Secao>
      ) : null}

      <FotoAmpliada foto={ampliada} onFechar={() => setAmpliada(undefined)} />
    </View>
  );
}

/** Desenho do veículo com os marcadores e a lista de avarias, cada uma com as miniaturas das fotos. */
export function BlocoDeAvarias({ checklist, onAmpliar }: { checklist: Checklist; onAmpliar: (foto: FotoChecklist) => void }) {
  const theme = useTheme();
  const { catalogo } = useCatalogo();

  return (
    <>
      {checklist.avarias.length === 0 ? (
        <ThemedText themeColor="textSecondary">Nenhuma avaria marcada.</ThemedText>
      ) : (
        <>
          <VeiculoDesenho avarias={checklist.avarias} somenteLeitura />
          {checklist.avarias.map((avaria) => (
            <View key={avaria.id} style={[estilos.cartao, { backgroundColor: theme.backgroundElement }]}>
              <View style={estilos.linhaAvaria}>
                <View style={[estilos.letra, { backgroundColor: COR_DO_TIPO[avaria.tipo] }]}>
                  <ThemedText type="smallBold" style={[estilos.letraTexto, { color: COR_DA_LETRA_DO_TIPO[avaria.tipo] }]}>
                    {LETRA_DO_TIPO[avaria.tipo]}
                  </ThemedText>
                </View>
                <View style={estilos.textoAvaria}>
                  <ThemedText type="smallBold">{avaria.parte_rotulo}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {rotuloDe(catalogo?.tipos_avaria, avaria.tipo)}
                  </ThemedText>
                </View>
              </View>
              {avaria.fotos.length > 0 ? (
                <View style={estilos.fotos}>
                  {avaria.fotos.map((foto) => (
                    <MiniaturaFoto key={foto.id} foto={foto} tamanho={72} onPress={() => onAmpliar(foto)} />
                  ))}
                </View>
              ) : null}
            </View>
          ))}
        </>
      )}
      {checklist.observacoes_avarias ? <Linha rotulo="Observações das avarias" valor={checklist.observacoes_avarias} /> : null}
    </>
  );
}

/** Itens marcados como presentes, com observação e miniaturas das fotos. */
export function BlocoDeItens({ checklist, onAmpliar }: { checklist: Checklist; onAmpliar: (foto: FotoChecklist) => void }) {
  const theme = useTheme();
  const itensPresentes = checklist.itens.filter((item) => item.presente);

  return (
    <>
      {itensPresentes.length === 0 ? (
        <ThemedText themeColor="textSecondary">Nenhum item marcado como presente.</ThemedText>
      ) : (
        itensPresentes.map((item) => (
          <View key={item.item} style={[estilos.cartao, { backgroundColor: theme.backgroundElement }]}>
            <ThemedText type="smallBold">{item.rotulo}</ThemedText>
            {item.observacao ? <ThemedText type="small">{item.observacao}</ThemedText> : null}
            {item.fotos.length === 0 ? (
              <ThemedText type="small" themeColor="textSecondary">
                Sem foto
              </ThemedText>
            ) : (
              <View style={estilos.fotos}>
                {item.fotos.map((foto) => (
                  <MiniaturaFoto key={foto.id} foto={foto} tamanho={72} onPress={() => onAmpliar(foto)} />
                ))}
              </View>
            )}
          </View>
        ))
      )}
      {checklist.observacoes_gerais ? <Linha rotulo="Observações gerais" valor={checklist.observacoes_gerais} /> : null}
    </>
  );
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <View style={estilos.secao}>
      <ThemedText type="subtitle" style={estilos.tituloSecao}>
        {titulo}
      </ThemedText>
      {children}
    </View>
  );
}

function Linha({ rotulo, valor, detalhe }: { rotulo: string; valor?: string; detalhe?: string }) {
  return (
    <View style={estilos.linha}>
      <ThemedText type="smallBold">{rotulo}</ThemedText>
      <ThemedText themeColor={valor ? 'text' : 'textSecondary'}>{valor ?? 'Não informado'}</ThemedText>
      {detalhe ? (
        <ThemedText type="small" themeColor="textSecondary">
          {detalhe}
        </ThemedText>
      ) : null}
    </View>
  );
}

/** Linha do cartão de resumo: o nome à esquerda e o valor à direita, como no protótipo. */
function LinhaDoResumo({ rotulo, valor, detalhe }: { rotulo: string; valor?: string; detalhe?: string }) {
  return (
    <View style={estilos.linhaDoResumo} accessible accessibilityLabel={`${rotulo}: ${valor ?? 'não informado'}`}>
      <ThemedText type="small" themeColor="textSecondary" style={estilos.rotuloDoResumo}>
        {rotulo}
      </ThemedText>
      <View style={estilos.valorDoResumo}>
        <ThemedText type="smallBold" themeColor={valor ? 'text' : 'textSecondary'} style={estilos.textoDoValor}>
          {valor ?? 'Não informado'}
        </ThemedText>
        {detalhe ? (
          <ThemedText type="small" themeColor="textSecondary" style={estilos.textoDoValor}>
            {detalhe}
          </ThemedText>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  resumo: { gap: Spacing.three },
  secao: { gap: Spacing.two },
  tituloSecao: { fontSize: 22, lineHeight: 28 },
  linha: { gap: Spacing.half },
  contagens: { flexDirection: 'row', gap: Spacing.two },
  resumoDoServico: { gap: Spacing.three },
  linhaDoResumo: { flexDirection: 'row', gap: Spacing.three, alignItems: 'flex-start' },
  rotuloDoResumo: { width: 112 },
  valorDoResumo: { flex: 1, gap: 2 },
  textoDoValor: { textAlign: 'right' },
  cartao: { padding: Spacing.three, borderRadius: Spacing.three, gap: Spacing.two },
  linhaAvaria: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  textoAvaria: { flex: 1, gap: Spacing.half },
  letra: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  letraTexto: { fontFamily: Fontes.tituloNegrito, fontSize: 13, lineHeight: 16 },
});
