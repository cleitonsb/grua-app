import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { CadastroLista, type ItemDaLista } from '@/components/cadastro-lista';
import { Icone } from '@/components/icone';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Fontes, MaxContentWidth, Raios, Spacing } from '@/constants/theme';
import { useCadastro } from '@/hooks/use-cadastro';
import { useTheme } from '@/hooks/use-theme';
import type { Cliente, Veiculo } from '@/types/api';
import { descricaoDoVeiculo, formatarCpfCnpj, formatarTelefone, juntarPreenchidos, NAO_INFORMADO, nomeDoCliente } from '@/utils/formatadores';

type Tipo = 'cliente' | 'veiculo';

interface SeletorRegistroProps {
  tipo: Tipo;
  rotulo: string;
  /** Linha principal do registro escolhido (nome do cliente ou "Modelo · PLACA"). */
  resumo?: string;
  /** Linha de apoio (documento e telefone, ou cor). */
  detalhe?: string;
  erro?: string;
  onSelecionar: (registro: Cliente | Veiculo) => void;
  /** Quando existe, a lista ganha a opção "Não informado", que desfaz a escolha (o cadastro é opcional). */
  onLimpar?: () => void;
  /** Abre o formulário de cadastro; o registro salvo volta selecionado (ver `selecao-pendente`). Sem ele, a lista só escolhe. */
  onCadastrarNovo?: () => void;
}

const TEXTOS: Record<Tipo, { escolher: string; novo: string; busca: string; vazio: string; titulo: string }> = {
  cliente: {
    escolher: 'Escolher cliente',
    novo: '+ Cadastrar novo cliente',
    busca: 'Buscar por nome, CPF/CNPJ ou telefone',
    vazio: 'Nenhum cliente ativo encontrado.',
    titulo: 'Escolher cliente',
  },
  veiculo: {
    escolher: 'Escolher veículo',
    novo: '+ Cadastrar novo veículo',
    busca: 'Buscar por placa, modelo ou cor',
    vazio: 'Nenhum veículo ativo encontrado.',
    titulo: 'Escolher veículo',
  },
};

/** Campo que mostra o cliente ou veículo escolhido e abre uma lista com busca (só cadastros ativos). */
export function SeletorRegistro({ tipo, rotulo, resumo, detalhe, erro, onSelecionar, onLimpar, onCadastrarNovo }: SeletorRegistroProps) {
  const theme = useTheme();
  const [aberto, setAberto] = useState(false);
  // Sem nada escolhido, o campo opcional mostra "Não informado" (e não um convite a escolher).
  const vazio = onLimpar ? NAO_INFORMADO : TEXTOS[tipo].escolher;

  return (
    <View style={estilos.campo}>
      <ThemedText style={estilos.rotulo}>{rotulo}</ThemedText>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${rotulo}: ${resumo ?? vazio}`}
        onPress={() => setAberto(true)}
        style={[
          estilos.entrada,
          { backgroundColor: theme.backgroundElement, borderColor: erro ? theme.danger : theme.bordaCampo },
        ]}>
        <View style={estilos.entradaTexto}>
          <ThemedText style={[estilos.valor, { color: resumo ? theme.text : theme.placeholder }]}>
            {resumo ?? vazio}
          </ThemedText>
          {detalhe ? (
            <ThemedText type="small" themeColor="textSecondary">
              {detalhe}
            </ThemedText>
          ) : null}
        </View>
        <Icone nome="baixo" cor={theme.textSecondary} />
      </Pressable>

      {erro ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {erro}
        </ThemedText>
      ) : null}

      <Modal visible={aberto} animationType="slide" onRequestClose={() => setAberto(false)}>
        {aberto ? (
          <EscolhaDeRegistro
            tipo={tipo}
            onFechar={() => setAberto(false)}
            onEscolher={(registro) => {
              setAberto(false);
              onSelecionar(registro);
            }}
            onLimpar={
              onLimpar
                ? () => {
                    setAberto(false);
                    onLimpar();
                  }
                : undefined
            }
            onNovo={
              onCadastrarNovo
                ? () => {
                    setAberto(false);
                    onCadastrarNovo();
                  }
                : undefined
            }
          />
        ) : null}
      </Modal>
    </View>
  );
}

interface EscolhaDeRegistroProps {
  tipo: Tipo;
  onFechar: () => void;
  onEscolher: (registro: Cliente | Veiculo) => void;
  onLimpar?: () => void;
  onNovo?: () => void;
}

function EscolhaDeRegistro({ tipo, onFechar, onEscolher, onLimpar, onNovo }: EscolhaDeRegistroProps) {
  const textos = TEXTOS[tipo];
  // Montado só com o modal aberto; começa filtrando os ativos, que são os únicos que podem ser escolhidos.
  const cadastro = useCadastro<Cliente | Veiculo>(tipo === 'cliente' ? 'clientes' : 'veiculos', { filtroInicial: 'ativos' });

  const itens: ItemDaLista[] = cadastro.itens.map((registro) =>
    tipo === 'cliente'
      ? {
          id: registro.id,
          titulo: nomeDoCliente((registro as Cliente).nome),
          subtitulo: juntarPreenchidos([formatarCpfCnpj((registro as Cliente).documento), formatarTelefone((registro as Cliente).telefone)]),
          ativo: registro.ativo,
        }
      : {
          id: registro.id,
          titulo: descricaoDoVeiculo(registro as Veiculo),
          subtitulo: (registro as Veiculo).cor ?? '',
          ativo: registro.ativo,
        },
  );

  const theme = useTheme();

  return (
    <View style={[estilos.modal, { backgroundColor: theme.background }]}>
      <CabecalhoTela titulo={textos.titulo} aoVoltar={onFechar} />

      <View style={estilos.conteudo}>
        {onLimpar ? <Botao titulo={NAO_INFORMADO} variante="secundario" onPress={onLimpar} /> : null}
        {onNovo ? <Botao titulo={textos.novo} variante="secundario" onPress={onNovo} /> : null}

        <CadastroLista
          {...cadastro}
          mostrarFiltro={false}
          itens={itens}
          onBusca={cadastro.setBusca}
          onFiltro={cadastro.setFiltro}
          onCarregarMais={cadastro.carregarMais}
          onRecarregar={cadastro.recarregar}
          onSelecionar={(id) => {
            const escolhido = cadastro.itens.find((registro) => registro.id === id);

            if (escolhido) {
              onEscolher(escolhido);
            }
          }}
          placeholderBusca={textos.busca}
          mensagemVazia={textos.vazio}
        />
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  campo: { gap: 6 },
  rotulo: { fontFamily: Fontes.corpoSemiNegrito, fontSize: 14, lineHeight: 20 },
  entrada: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    borderWidth: 1,
    borderRadius: Raios.campo,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    minHeight: Alturas.campo,
  },
  entradaTexto: { flex: 1, gap: Spacing.half },
  valor: { fontFamily: Fontes.corpo, fontSize: 16, lineHeight: 22 },
  modal: { flex: 1 },
  conteudo: {
    flex: 1,
    padding: Spacing.three,
    gap: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
