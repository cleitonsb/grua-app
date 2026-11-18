import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';

import { BotaoCamera } from '@/components/botao-camera';
import { CampoDeNivel } from '@/components/campo-de-nivel';
import { CampoFormulario } from '@/components/campo-formulario';
import { Cartao } from '@/components/cartao';
import { Icone } from '@/components/icone';
import { RegistroOrigem } from '@/components/checklist/registro-origem';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, Raios, Spacing } from '@/constants/theme';
import { useCatalogo } from '@/hooks/use-catalogo';
import type { CamposDoChecklist } from '@/hooks/use-checklist';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/services/api';
import type { Checklist, EstadoPneu, ItemChecklist, NivelCombustivel } from '@/types/api';
import { ITEM_OUTROS, resumoDoItem, type ErrosDoPasso } from '@/utils/checklist';

interface PassoItensProps {
  checklist: Checklist;
  alterar: (campos: CamposDoChecklist, local?: Partial<Checklist>) => void;
  erros: ErrosDoPasso;
  salvarItem: (item: string, presente: boolean, observacao: string | null) => Promise<ItemChecklist>;
  /** Abre a tela do item (fotos e observação). */
  onAbrirItem: (item: string) => void;
}

/** Passo 3: itens do veículo (com fotos e observação), pneus, combustível e observações gerais. */
export function PassoItens({ checklist, alterar, erros, salvarItem, onAbrirItem }: PassoItensProps) {
  const theme = useTheme();
  const { catalogo, carregando, erro } = useCatalogo();
  const [ocupado, setOcupado] = useState<string>();
  const [erroItem, setErroItem] = useState<string>();

  const limiteDeFotos = catalogo?.limites.fotos_por_item ?? 10;

  /** Grava a marcação do item. Devolve se deu certo. */
  async function gravar(item: ItemChecklist, presente: boolean): Promise<boolean> {
    setOcupado(item.item);
    setErroItem(undefined);

    try {
      await salvarItem(item.item, presente, presente ? item.observacao : null);

      return true;
    } catch (excecao) {
      setErroItem(excecao instanceof ApiError ? excecao.message : 'Não foi possível salvar o item. Tente novamente.');

      return false;
    } finally {
      setOcupado(undefined);
    }
  }

  /** Câmera do item: um item ainda não marcado é marcado como presente antes de abrir a tela de fotos. */
  async function abrirCamera(item: ItemChecklist) {
    if (!item.presente && item.item !== ITEM_OUTROS && !(await gravar(item, true))) {
      return;
    }

    onAbrirItem(item.item);
  }

  function alternar(item: ItemChecklist) {
    if (!item.presente) {
      // "Outros" precisa de descrição para ser gravado: ela é digitada na tela do item.
      if (item.item === ITEM_OUTROS) {
        onAbrirItem(item.item);
      } else {
        void gravar(item, true);
      }

      return;
    }

    if (item.fotos.length === 0 && !item.observacao) {
      void gravar(item, false);

      return;
    }

    Alert.alert('Desmarcar item', 'As fotos e a observação deste item serão descartadas. Deseja continuar?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Desmarcar', style: 'destructive', onPress: () => void gravar(item, false) },
    ]);
  }

  return (
    <View style={estilos.passo}>
      <ThemedText themeColor="textSecondary">Marque o que está no veículo e fotografe cada item.</ThemedText>

      {checklist.origem ? <RegistroOrigem origemId={checklist.origem.id} parte="itens" /> : null}

      {carregando ? <ActivityIndicator /> : null}

      {erro ? <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText> : null}

      <View style={estilos.itens}>
        {checklist.itens.map((item) => {
          const noLimite = item.fotos.length >= limiteDeFotos;
          const erroDoItem = item.item === ITEM_OUTROS ? erros.item_outros : undefined;

          return (
            <Cartao key={item.item} style={estilos.item}>
              <View style={estilos.linhaItem}>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: item.presente, disabled: ocupado !== undefined }}
                  accessibilityLabel={item.rotulo}
                  disabled={ocupado !== undefined}
                  onPress={() => alternar(item)}
                  style={estilos.marcavel}>
                  <View
                    style={[
                      estilos.caixa,
                      {
                        borderColor: item.presente ? theme.marinho : theme.bordaCampo,
                        backgroundColor: item.presente ? theme.marinho : theme.backgroundElement,
                      },
                    ]}>
                    {item.presente ? <Icone nome="check" tamanho={18} cor={theme.branco} /> : null}
                  </View>
                  <View style={estilos.textoItem}>
                    <ThemedText type="smallBold" style={estilos.nomeDoItem}>
                      {item.rotulo}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {resumoDoItem(item)}
                    </ThemedText>
                  </View>
                  {ocupado === item.item ? <ActivityIndicator /> : null}
                </Pressable>

                <BotaoCamera
                  rotulo={`Fotos e observação de ${item.rotulo}`}
                  quantidade={item.fotos.length}
                  aoTocar={() => void abrirCamera(item)}
                  desabilitado={ocupado !== undefined}
                />
              </View>

              {item.presente && noLimite ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Você atingiu o limite de {limiteDeFotos} fotos neste item.
                </ThemedText>
              ) : null}

              {erroDoItem ? (
                <Pressable accessibilityRole="button" onPress={() => onAbrirItem(item.item)} style={estilos.erroDoItem}>
                  <ThemedText type="small" style={{ color: theme.danger }}>
                    {erroDoItem}
                  </ThemedText>
                </Pressable>
              ) : null}
            </Cartao>
          );
        })}
      </View>

      {erroItem ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erroItem}
        </ThemedText>
      ) : null}

      {catalogo ? (
        <>
          <ThemedText type="subtitle">Pneus</ThemedText>
          <Cartao style={estilos.pneus}>
            <LinhaDePneu
              rotulo="Dianteiro"
              opcoes={catalogo.estados_pneu}
              valor={checklist.pneus.dianteiro}
              onChange={(valor) => alterar({ pneu_dianteiro: valor as EstadoPneu })}
              erro={erros.pneu_dianteiro}
            />
            <LinhaDePneu
              rotulo="Traseiro"
              opcoes={catalogo.estados_pneu}
              valor={checklist.pneus.traseiro}
              onChange={(valor) => alterar({ pneu_traseiro: valor as EstadoPneu })}
              erro={erros.pneu_traseiro}
            />
            <LinhaDePneu
              rotulo="Estepe"
              opcoes={catalogo.estados_pneu}
              valor={checklist.pneus.estepe}
              onChange={(valor) => alterar({ pneu_estepe: valor as EstadoPneu })}
              erro={erros.pneu_estepe}
            />
          </Cartao>

          <ThemedText type="subtitle">Combustível</ThemedText>
          <Cartao>
            <CampoDeNivel
              rotulo="Combustível"
              rotuloVisivel={false}
              opcoes={catalogo.niveis_combustivel}
              valor={checklist.combustivel}
              aoMudar={(valor) => alterar({ combustivel: valor as NivelCombustivel })}
              erro={erros.combustivel}
            />
          </Cartao>
        </>
      ) : null}

      <CampoFormulario
        rotulo="Observações gerais"
        placeholder="Ex.: cliente acompanha"
        value={checklist.observacoes_gerais ?? ''}
        onChangeText={(texto) => alterar({ observacoes_gerais: texto })}
        multiline
        textAlignVertical="top"
        maxLength={2000}
        autoCapitalize="sentences"
      />
    </View>
  );
}

/** Uma linha do cartão de pneus: o nome à esquerda e os estados (Bom, Médio, Ruim) à direita. */
function LinhaDePneu({
  rotulo,
  opcoes,
  valor,
  onChange,
  erro,
}: {
  rotulo: string;
  opcoes: { valor: string; rotulo: string }[];
  valor: string | null;
  onChange: (valor: string) => void;
  erro?: string;
}) {
  const theme = useTheme();

  return (
    <View style={estilos.linhaDePneu}>
      <View style={estilos.pneuConteudo}>
        <ThemedText type="smallBold" style={estilos.nomeDoPneu}>
          {rotulo}
        </ThemedText>

        <View style={estilos.estados} accessibilityRole="radiogroup" accessibilityLabel={`Pneu ${rotulo.toLowerCase()}`}>
          {opcoes.map((opcao) => {
            const selecionada = opcao.valor === valor;

            return (
              <Pressable
                key={opcao.valor}
                accessibilityRole="radio"
                accessibilityState={{ selected: selecionada }}
                accessibilityLabel={`${rotulo}: ${opcao.rotulo}`}
                onPress={() => onChange(opcao.valor)}
                style={[
                  estilos.estado,
                  {
                    backgroundColor: selecionada ? theme.marinho : theme.backgroundElement,
                    borderColor: erro ? theme.danger : selecionada ? theme.marinho : theme.bordaCampo,
                  },
                ]}>
                <ThemedText style={[estilos.textoDoEstado, { color: selecionada ? theme.branco : theme.text }]}>
                  {opcao.rotulo}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>
      </View>

      {erro ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {erro}
        </ThemedText>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  passo: { gap: Spacing.three },
  itens: { gap: Spacing.two },
  item: { gap: Spacing.two, paddingVertical: Spacing.two },
  linhaItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  marcavel: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three, minHeight: Alturas.alvoMinimo },
  caixa: { width: 26, height: 26, borderRadius: 7, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  textoItem: { flex: 1, gap: Spacing.half },
  nomeDoItem: { fontSize: 15, lineHeight: 20 },
  erroDoItem: { minHeight: Alturas.alvoMinimo, justifyContent: 'center' },
  pneus: { gap: Spacing.three },
  linhaDePneu: { gap: Spacing.one },
  pneuConteudo: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  nomeDoPneu: { width: 78, fontSize: 14, lineHeight: 20 },
  estados: { flex: 1, flexDirection: 'row', gap: Spacing.two },
  estado: { flex: 1, minHeight: Alturas.alvoMinimo, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderRadius: Raios.campo },
  textoDoEstado: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 14, lineHeight: 20 },
});
