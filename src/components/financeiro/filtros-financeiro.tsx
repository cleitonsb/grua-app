import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Botao } from '@/components/botao';
import { SeletorRegistro } from '@/components/checklist/seletor-registro';
import { Icone } from '@/components/icone';
import { Pilula } from '@/components/pilula';
import { SeletorOpcoes, type Opcao } from '@/components/seletor-opcoes';
import { ThemedText } from '@/components/themed-text';
import { Alturas, Raios, Spacing } from '@/constants/theme';
import { useCadastro } from '@/hooks/use-cadastro';
import type { SituacaoDoFiltro } from '@/hooks/use-financeiro';
import { useTheme } from '@/hooks/use-theme';
import type { Caminhao, Cliente, Motorista } from '@/types/api';
import { formatarPlaca } from '@/utils/formatadores';

const SITUACOES: { valor: SituacaoDoFiltro; rotulo: string }[] = [
  { valor: 'a_receber', rotulo: 'A receber' },
  { valor: 'pago', rotulo: 'Pago' },
  { valor: 'cancelado', rotulo: 'Cancelado' },
  { valor: 'todos', rotulo: 'Todos' },
];

interface FiltrosFinanceiroProps {
  busca: string;
  aoBuscar: (texto: string) => void;
  situacao?: SituacaoDoFiltro;
  aoEscolherSituacao: (situacao?: SituacaoDoFiltro) => void;
  clienteId?: number;
  aoEscolherCliente: (cliente?: { id: number; nome: string }) => void;
  caminhaoId?: number;
  aoEscolherCaminhao: (id?: number) => void;
  motoristaId?: number;
  aoEscolherMotorista: (id?: number) => void;
  /** Caminhão e motorista só para o administrador (o motorista já vê só os próprios serviços). */
  ehAdministrador: boolean;
  temFiltro: boolean;
  aoLimpar: () => void;
}

/**
 * Filtros do Financeiro: busca por placa ou cliente, situação em pílulas (sem nenhuma escolhida, A receber e Pago) e,
 * em "Mais filtros", cliente, caminhão e motorista. Todos combinam com o mês e com os totais.
 */
export function FiltrosFinanceiro({
  busca,
  aoBuscar,
  situacao,
  aoEscolherSituacao,
  clienteId,
  aoEscolherCliente,
  caminhaoId,
  aoEscolherCaminhao,
  motoristaId,
  aoEscolherMotorista,
  ehAdministrador,
  temFiltro,
  aoLimpar,
}: FiltrosFinanceiroProps) {
  const theme = useTheme();
  const [aberto, setAberto] = useState(false);
  const [clienteEscolhido, setClienteEscolhido] = useState<string>();

  return (
    <View style={estilos.bloco}>
      <View style={[estilos.busca, { backgroundColor: theme.backgroundElement, borderColor: theme.bordaCampo }]}>
        <Icone nome="busca" cor={theme.placeholder} />
        <TextInput
          accessibilityLabel="Buscar por placa ou cliente"
          autoCapitalize="none"
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={aoBuscar}
          placeholder="Buscar por placa ou cliente"
          placeholderTextColor={theme.placeholder}
          returnKeyType="search"
          style={[estilos.campoBusca, { color: theme.text }]}
          value={busca}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={estilos.pilulas}>
        {SITUACOES.map(({ valor, rotulo }) => (
          <Pilula key={valor} rotulo={rotulo} ativa={situacao === valor} aoTocar={() => aoEscolherSituacao(situacao === valor ? undefined : valor)} />
        ))}
      </ScrollView>

      <View style={estilos.acoes}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: aberto }} onPress={() => setAberto((valor) => !valor)} style={estilos.alvo}>
          <ThemedText type="linkPrimary" style={estilos.sublinhado}>
            {aberto ? 'Menos filtros' : 'Mais filtros'}
          </ThemedText>
        </Pressable>
        {temFiltro ? (
          <Pressable accessibilityRole="button" onPress={aoLimpar} style={estilos.alvo}>
            <ThemedText type="linkPrimary" style={estilos.sublinhado}>
              Limpar filtros
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {aberto ? (
        <View style={estilos.bloco}>
          <SeletorRegistro
            tipo="cliente"
            rotulo="Cliente"
            resumo={clienteId ? clienteEscolhido : undefined}
            onSelecionar={(registro) => {
              const cliente = registro as Cliente;

              setClienteEscolhido(cliente.nome);
              aoEscolherCliente({ id: cliente.id, nome: cliente.nome });
            }}
          />
          {clienteId ? <Botao titulo="Remover filtro de cliente" variante="secundario" onPress={() => aoEscolherCliente(undefined)} /> : null}

          {ehAdministrador ? (
            <>
              <FiltroDeCaminhao valor={caminhaoId} aoEscolher={aoEscolherCaminhao} />
              <FiltroDeMotorista valor={motoristaId} aoEscolher={aoEscolherMotorista} />
            </>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function FiltroDeCaminhao({ valor, aoEscolher }: { valor?: number; aoEscolher: (id?: number) => void }) {
  const caminhoes = useCadastro<Caminhao>('caminhoes', { filtroInicial: 'todos' });
  const opcoes: Opcao<number | null>[] = [
    { valor: null, rotulo: 'Todos' },
    ...caminhoes.itens.map((caminhao) => ({ valor: caminhao.id as number | null, rotulo: `${caminhao.modelo} · ${formatarPlaca(caminhao.placa)}` })),
  ];

  return <SeletorOpcoes rotulo="Caminhão" opcoes={opcoes} valor={valor ?? null} onChange={(id) => aoEscolher(id ?? undefined)} />;
}

function FiltroDeMotorista({ valor, aoEscolher }: { valor?: number; aoEscolher: (id?: number) => void }) {
  const motoristas = useCadastro<Motorista>('motoristas', { filtroInicial: 'todos' });
  const opcoes: Opcao<number | null>[] = [{ valor: null, rotulo: 'Todos' }, ...motoristas.itens.map((motorista) => ({ valor: motorista.id as number | null, rotulo: motorista.nome }))];

  return <SeletorOpcoes rotulo="Motorista" opcoes={opcoes} valor={valor ?? null} onChange={(id) => aoEscolher(id ?? undefined)} />;
}

const estilos = StyleSheet.create({
  bloco: { gap: Spacing.two },
  busca: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, borderWidth: 1, borderRadius: Raios.campo, paddingHorizontal: Spacing.three, minHeight: Alturas.campo },
  campoBusca: { flex: 1, minHeight: Alturas.campo, fontSize: 16 },
  pilulas: { gap: Spacing.two },
  acoes: { flexDirection: 'row', gap: Spacing.four },
  alvo: { minHeight: Alturas.alvoMinimo, justifyContent: 'center' },
  sublinhado: { textDecorationLine: 'underline' },
});
