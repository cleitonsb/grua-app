import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { BotaoCamera } from '@/components/botao-camera';
import { Cartao } from '@/components/cartao';
import { CampoFormulario } from '@/components/campo-formulario';
import { FotoAmpliada, MiniaturaFoto } from '@/components/checklist/miniatura-foto';
import { RegistroOrigem } from '@/components/checklist/registro-origem';
import { VeiculoDesenho, type PontoDoToque } from '@/components/checklist/veiculo-desenho';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios, Spacing } from '@/constants/theme';
import { useCatalogo, rotuloDe } from '@/hooks/use-catalogo';
import type { CamposDoChecklist, DadosDaAvaria } from '@/hooks/use-checklist';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import type { Avaria, Checklist, FotoChecklist, OpcaoCatalogo, TipoAvaria } from '@/types/api';
import { COR_DA_LETRA_DO_TIPO, COR_DO_TIPO, LETRA_DO_TIPO } from '@/utils/desenho';

const LIMITE_PADRAO_DE_AVARIAS = 20;

interface PassoAvariasProps {
  checklist: Checklist;
  alterar: (campos: CamposDoChecklist, local?: Partial<Checklist>) => void;
  adicionarAvaria: (dados: DadosDaAvaria) => Promise<Avaria>;
  alterarAvaria: (avaria: Avaria, mudancas: Partial<DadosDaAvaria>) => Promise<Avaria>;
  removerAvaria: (avariaId: number) => Promise<void>;
  removerFoto: (fotoId: number) => Promise<void>;
  /** Abre a tela de fotos da avaria. */
  onAbrirFotos: (avariaId: number) => void;
}

const textoDeFotos = (quantidade: number) =>
  quantidade === 0 ? 'Sem foto ainda' : quantidade === 1 ? '1 foto' : `${quantidade} fotos`;

/**
 * Passo 2: marcar avarias sobre o desenho do veículo, escolher o tipo, fotografar, alterar e remover, e escrever as
 * observações. Cada gravação vai direto à API pela fila do rascunho, com identificador próprio (reenvio seguro).
 */
export function PassoAvarias({
  checklist,
  alterar,
  adicionarAvaria,
  alterarAvaria,
  removerAvaria,
  removerFoto,
  onAbrirFotos,
}: PassoAvariasProps) {
  const theme = useTheme();
  const { catalogo, carregando } = useCatalogo();
  const [pontoNovo, setPontoNovo] = useState<PontoDoToque>();
  const [selecionadaId, setSelecionadaId] = useState<number>();
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string>();
  const [fotoAmpliada, setFotoAmpliada] = useState<FotoChecklist>();

  const limite = catalogo?.limites.avarias ?? LIMITE_PADRAO_DE_AVARIAS;
  const noLimite = checklist.avarias.length >= limite;
  const selecionada = checklist.avarias.find((avaria) => avaria.id === selecionadaId);

  async function executar(acao: () => Promise<void>) {
    setOcupado(true);
    setErro(undefined);

    try {
      await acao();
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : 'Não foi possível salvar a avaria. Tente novamente.');
    } finally {
      setOcupado(false);
    }
  }

  function aoTocarNaParte(ponto: PontoDoToque) {
    setSelecionadaId(undefined);

    if (noLimite) {
      setPontoNovo(undefined);
      setErro(`Você atingiu o limite de ${limite} avarias neste checklist.`);

      return;
    }

    setErro(undefined);
    setPontoNovo(ponto);
  }

  function aoTocarNaAvaria(avariaId: number) {
    setPontoNovo(undefined);
    setErro(undefined);
    setSelecionadaId(avariaId);
  }

  function criar(tipo: TipoAvaria) {
    if (!pontoNovo) return;

    const ponto = pontoNovo;

    void executar(async () => {
      const avaria = await adicionarAvaria({ parte: ponto.parte, tipo, pos_x: ponto.x, pos_y: ponto.y });

      setPontoNovo(undefined);
      setSelecionadaId(avaria.id);
    });
  }

  function mudarTipo(avaria: Avaria, tipo: TipoAvaria) {
    if (avaria.tipo === tipo) return;

    void executar(async () => {
      await alterarAvaria(avaria, { tipo });
    });
  }

  function confirmarRemocao(avaria: Avaria) {
    Alert.alert(
      'Remover avaria',
      avaria.fotos.length > 0 ? 'A avaria e as fotos dela serão apagadas. Deseja continuar?' : 'A avaria será removida. Deseja continuar?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: () =>
            void executar(async () => {
              await removerAvaria(avaria.id);
              setSelecionadaId(undefined);
            }),
        },
      ],
    );
  }

  return (
    <View style={estilos.passo}>
      <ThemedText themeColor="textSecondary">Toque no ponto do veículo e marque o tipo de avaria.</ThemedText>

      {checklist.origem ? <RegistroOrigem origemId={checklist.origem.id} parte="avarias" /> : null}

      <Cartao style={estilos.cartaoDoDesenho}>
        <VeiculoDesenho
          avarias={checklist.avarias}
          selecionadaId={selecionadaId}
          pontoNovo={pontoNovo}
          onToqueNaParte={aoTocarNaParte}
          onToqueNaAvaria={aoTocarNaAvaria}
        />

        <View style={estilos.legenda}>
          {(Object.keys(COR_DO_TIPO) as TipoAvaria[]).map((tipo) => (
            <View key={tipo} style={estilos.itemDaLegenda}>
              <View style={[estilos.letraPequena, { backgroundColor: COR_DO_TIPO[tipo] }]}>
                <ThemedText style={[estilos.letraTexto, { color: COR_DA_LETRA_DO_TIPO[tipo] }]}>{LETRA_DO_TIPO[tipo]}</ThemedText>
              </View>
              <ThemedText type="small">{ROTULO_NA_LEGENDA[tipo]}</ThemedText>
            </View>
          ))}
        </View>
      </Cartao>

      {carregando ? <ActivityIndicator /> : null}

      {pontoNovo && catalogo ? (
        <Cartao style={estilos.cartao}>
          <ThemedText type="smallBold">Nova avaria · {rotuloDe(catalogo.partes, pontoNovo.parte)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Qual é o tipo da avaria?
          </ThemedText>
          <EscolhaDeTipo tipos={catalogo.tipos_avaria} onEscolher={criar} desabilitado={ocupado} />
          <Botao titulo="Cancelar" variante="secundario" onPress={() => setPontoNovo(undefined)} desabilitado={ocupado} />
        </Cartao>
      ) : null}

      {selecionada && catalogo ? (
        <Cartao style={estilos.cartao}>
          <ThemedText type="smallBold">{selecionada.parte_rotulo}</ThemedText>
          <EscolhaDeTipo tipos={catalogo.tipos_avaria} valor={selecionada.tipo} onEscolher={(tipo) => mudarTipo(selecionada, tipo)} desabilitado={ocupado} />

          {selecionada.fotos.length > 0 ? (
            <View style={estilos.fotos}>
              {selecionada.fotos.map((foto) => (
                <MiniaturaFoto key={foto.id} foto={foto} onPress={() => setFotoAmpliada(foto)} />
              ))}
            </View>
          ) : null}

          <Botao titulo="Remover avaria" variante="perigo" onPress={() => confirmarRemocao(selecionada)} desabilitado={ocupado} />
        </Cartao>
      ) : null}

      {erro ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erro}
        </ThemedText>
      ) : null}

      <View style={estilos.lista}>
        <ThemedText type="subtitle">
          Avarias marcadas ({checklist.avarias.length} de {limite})
        </ThemedText>

        {checklist.avarias.length === 0 ? <ThemedText themeColor="textSecondary">Nenhuma avaria marcada.</ThemedText> : null}

        {checklist.avarias.map((avaria) => (
          <Cartao
            key={avaria.id}
            style={[estilos.linha, avaria.id === selecionadaId && { borderColor: theme.marinho, borderWidth: 2 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected: avaria.id === selecionadaId }}
              onPress={() => aoTocarNaAvaria(avaria.id)}
              style={estilos.linhaConteudo}>
              <View style={[estilos.letra, { backgroundColor: COR_DO_TIPO[avaria.tipo] }]}>
                <ThemedText style={[estilos.letraTexto, { color: COR_DA_LETRA_DO_TIPO[avaria.tipo] }]}>
                  {LETRA_DO_TIPO[avaria.tipo]}
                </ThemedText>
              </View>
              <View style={estilos.linhaTexto}>
                <ThemedText type="smallBold" style={estilos.nomeDaParte}>
                  {avaria.parte_rotulo}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {textoDeFotos(avaria.fotos.length)} · {rotuloDe(catalogo?.tipos_avaria, avaria.tipo).toLowerCase()}
                </ThemedText>
              </View>
            </Pressable>
            <BotaoCamera
              rotulo={`Adicionar foto da avaria: ${avaria.parte_rotulo}`}
              quantidade={avaria.fotos.length}
              aoTocar={() => onAbrirFotos(avaria.id)}
              desabilitado={ocupado}
            />
          </Cartao>
        ))}

        {noLimite ? (
          <ThemedText type="small" themeColor="textSecondary">
            Você atingiu o limite de {limite} avarias.
          </ThemedText>
        ) : null}
      </View>

      <CampoFormulario
        rotulo="Observações"
        placeholder="Detalhes sobre a lataria"
        value={checklist.observacoes_avarias ?? ''}
        onChangeText={(texto) => alterar({ observacoes_avarias: texto })}
        multiline
        textAlignVertical="top"
        maxLength={2000}
        autoCapitalize="sentences"
      />

      <FotoAmpliada
        foto={fotoAmpliada}
        onFechar={() => setFotoAmpliada(undefined)}
        onRemover={(foto) =>
          void executar(async () => {
            await removerFoto(foto.id);
          })
        }
      />
    </View>
  );
}

/** Rótulos curtos da legenda, como no protótipo. */
const ROTULO_NA_LEGENDA: Record<TipoAvaria, string> = {
  batido: 'batido',
  riscado: 'riscado',
  danificado: 'danif.',
  falta: 'falta',
};

/** Os quatro tipos de avaria em botões com a cor e a letra do marcador. */
function EscolhaDeTipo({
  tipos,
  valor,
  onEscolher,
  desabilitado,
}: {
  tipos: OpcaoCatalogo[];
  valor?: TipoAvaria;
  onEscolher: (tipo: TipoAvaria) => void;
  desabilitado: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={estilos.tipos}>
      {tipos.map((opcao) => {
        const tipo = opcao.valor as TipoAvaria;
        const escolhido = tipo === valor;

        return (
          <Pressable
            key={tipo}
            accessibilityRole="radio"
            accessibilityState={{ selected: escolhido, disabled: desabilitado }}
            disabled={desabilitado}
            onPress={() => onEscolher(tipo)}
            style={[
              estilos.tipo,
              {
                backgroundColor: escolhido ? theme.backgroundSelected : theme.backgroundElement,
                borderColor: escolhido ? theme.marinho : theme.bordaCampo,
                borderWidth: escolhido ? 2 : 1,
              },
              desabilitado && estilos.desabilitado,
            ]}>
            <View style={[estilos.letraPequena, { backgroundColor: COR_DO_TIPO[tipo] }]}>
              <ThemedText style={[estilos.letraTexto, { color: COR_DA_LETRA_DO_TIPO[tipo] }]}>{LETRA_DO_TIPO[tipo]}</ThemedText>
            </View>
            <ThemedText type="small">{opcao.rotulo}</ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const estilos = StyleSheet.create({
  passo: { gap: Spacing.three },
  cartaoDoDesenho: { gap: Spacing.three, paddingVertical: Spacing.three },
  legenda: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  itemDaLegenda: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartao: { gap: Spacing.two },
  tipos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  tipo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: Alturas.alvoMinimo,
    paddingHorizontal: Spacing.three,
    borderRadius: Raios.campo,
  },
  desabilitado: { opacity: 0.5 },
  fotos: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  lista: { gap: Spacing.two },
  linha: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  linhaConteudo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: Alturas.alvoMinimo },
  linhaTexto: { flex: 1, gap: Spacing.half },
  nomeDaParte: { fontSize: 15, lineHeight: 20 },
  letra: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  letraPequena: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  letraTexto: { fontFamily: Fontes.tituloNegrito, fontSize: 13, lineHeight: 16 },
});
