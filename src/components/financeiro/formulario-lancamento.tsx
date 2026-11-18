import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Botao } from '@/components/botao';
import { CampoFormulario } from '@/components/campo-formulario';
import { SeletorRegistro } from '@/components/checklist/seletor-registro';
import { FormularioTela } from '@/components/formulario-tela';
import { SeletorOpcoes, type Opcao } from '@/components/seletor-opcoes';
import { ThemedText } from '@/components/themed-text';
import { Fontes, Spacing } from '@/constants/theme';
import { useCadastro } from '@/hooks/use-cadastro';
import type { DadosDoLancamento } from '@/hooks/use-lancamento';
import { useTheme } from '@/hooks/use-theme';
import type { Caminhao, Cliente, Veiculo } from '@/types/api';
import { centavosDeDigitos, formatarReais, LIMITE_EM_CENTAVOS, mascaraDeReais } from '@/utils/dinheiro';
import { formatarPlaca } from '@/utils/formatadores';
import { dataParaIso, hojeEmBrasilia, isoParaData, mascaraDeData } from '@/utils/periodo';

export interface ValoresIniciais {
  cliente?: { id: number; nome: string };
  veiculo?: { id: number; descricao: string } | null;
  caminhaoId?: number | null;
  caminhaoPlaca?: string | null;
  descricao?: string;
  valorCentavos?: number | null;
}

interface FormularioLancamentoProps {
  titulo: string;
  /** `criar`: lançamento avulso novo; `editar-avulso`: tudo menos a data; `editar-automatico`: só valor e descrição. */
  modo: 'criar' | 'editar-avulso' | 'editar-automatico';
  inicial?: ValoresIniciais;
  salvando: boolean;
  erroAcao?: string;
  errosDoCampo: Record<string, string>;
  aoSalvar: (dados: DadosDoLancamento) => void;
}

/**
 * Formulário do lançamento: cria o avulso ou edita valor e descrição (e, no avulso, cliente, veículo e caminhão). O
 * valor tem máscara de reais e vai para a API em centavos inteiros. Valida antes de enviar; a API repete as regras.
 */
export function FormularioLancamento({ titulo, modo, inicial, salvando, erroAcao, errosDoCampo, aoSalvar }: FormularioLancamentoProps) {
  const theme = useTheme();
  const [cliente, setCliente] = useState(inicial?.cliente);
  const [veiculo, setVeiculo] = useState(inicial?.veiculo ?? null);
  const [caminhaoId, setCaminhaoId] = useState<number | null>(inicial?.caminhaoId ?? null);
  const [descricao, setDescricao] = useState(inicial?.descricao ?? '');
  const [valor, setValor] = useState(inicial?.valorCentavos ? String(inicial.valorCentavos) : '');
  const [data, setData] = useState(() => isoParaData(hojeEmBrasilia()));
  const [erros, setErros] = useState<Record<string, string>>({});
  const caminhoes = useCadastro<Caminhao>('caminhoes', { filtroInicial: 'ativos' });

  const edicaoAutomatica = modo === 'editar-automatico';
  const erroDe = (campo: string) => erros[campo] ?? errosDoCampo[campo];
  const limpar = (campo: string) => setErros((atuais) => Object.fromEntries(Object.entries(atuais).filter(([chave]) => chave !== campo)));

  const opcoesDeCaminhao: Opcao<number | null>[] = [
    { valor: null, rotulo: 'Nenhum' },
    ...caminhoes.itens.map((caminhao) => ({ valor: caminhao.id as number | null, rotulo: `${caminhao.modelo} · ${formatarPlaca(caminhao.placa)}` })),
  ];

  // O caminhão já ligado ao lançamento continua aparecendo, mesmo que não venha na primeira página da lista.
  if (caminhaoId !== null && !opcoesDeCaminhao.some((opcao) => opcao.valor === caminhaoId)) {
    opcoesDeCaminhao.push({ valor: caminhaoId, rotulo: inicial?.caminhaoPlaca ? formatarPlaca(inicial.caminhaoPlaca) : `Caminhão #${caminhaoId}` });
  }

  function salvar() {
    const pendencias: Record<string, string> = {};
    const centavos = centavosDeDigitos(valor);
    const texto = descricao.trim();
    const iso = dataParaIso(data);

    if (modo !== 'editar-automatico' && !cliente) pendencias.cliente_id = 'Escolha o cliente.';
    if (texto === '') pendencias.descricao = 'Informe a descrição do lançamento.';
    else if (texto.length > 255) pendencias.descricao = 'A descrição deve ter no máximo 255 caracteres.';
    if (centavos < 1 || centavos > LIMITE_EM_CENTAVOS) pendencias.valor_centavos = `O valor deve ficar entre R$ 0,01 e ${formatarReais(LIMITE_EM_CENTAVOS)}.`;
    if (modo === 'criar' && iso === null) pendencias.data = 'Informe uma data válida (dd/mm/aaaa).';

    setErros(pendencias);

    if (Object.keys(pendencias).length > 0) return;

    if (modo === 'criar') {
      aoSalvar({ clienteId: cliente!.id, veiculoId: veiculo?.id ?? null, caminhaoId, descricao: texto, valorCentavos: centavos, data: iso! });
    } else if (modo === 'editar-avulso') {
      aoSalvar({ clienteId: cliente!.id, veiculoId: veiculo?.id ?? null, caminhaoId, descricao: texto, valorCentavos: centavos });
    } else {
      aoSalvar({ descricao: texto, valorCentavos: centavos });
    }
  }

  return (
    <FormularioTela
      titulo={titulo}
      rodape={{ principal: { titulo: modo === 'criar' ? 'Salvar lançamento' : 'Salvar alterações', aoTocar: salvar, carregando: salvando } }}>
      {edicaoAutomatica ? (
        <View style={estilos.somenteLeitura}>
          <ThemedText type="small" themeColor="textSecondary">
            Cliente, veículo e caminhão vêm do checklist e não podem ser alterados.
          </ThemedText>
          <ThemedText style={estilos.destaque}>{inicial?.cliente?.nome}</ThemedText>
          {inicial?.veiculo ? <ThemedText>{inicial.veiculo.descricao}</ThemedText> : null}
        </View>
      ) : (
        <>
          <SeletorRegistro
            tipo="cliente"
            rotulo="Cliente"
            resumo={cliente?.nome}
            erro={erroDe('cliente_id')}
            onSelecionar={(registro) => {
              const escolhido = registro as Cliente;

              setCliente({ id: escolhido.id, nome: escolhido.nome });
              limpar('cliente_id');
            }}
          />
          <SeletorRegistro
            tipo="veiculo"
            rotulo="Veículo (opcional)"
            resumo={veiculo?.descricao}
            erro={erroDe('veiculo_id')}
            onSelecionar={(registro) => {
              const escolhido = registro as Veiculo;

              setVeiculo({ id: escolhido.id, descricao: `${escolhido.modelo} · ${formatarPlaca(escolhido.placa)}` });
            }}
          />
          {veiculo ? <Botao titulo="Remover veículo" variante="secundario" onPress={() => setVeiculo(null)} /> : null}
          <SeletorOpcoes rotulo="Caminhão (opcional)" opcoes={opcoesDeCaminhao} valor={caminhaoId} onChange={setCaminhaoId} erro={erroDe('caminhao_id')} />
        </>
      )}

      <CampoFormulario
        rotulo="Descrição"
        value={descricao}
        onChangeText={(texto) => {
          setDescricao(texto);
          limpar('descricao');
        }}
        placeholder="Ex.: reboque até a oficina"
        maxLength={255}
        erro={erroDe('descricao')}
      />

      <CampoFormulario
        rotulo="Valor"
        value={valor === '' ? '' : mascaraDeReais(valor)}
        onChangeText={(texto) => {
          setValor(texto.replace(/\D/g, ''));
          limpar('valor_centavos');
        }}
        placeholder="R$ 0,00"
        keyboardType="number-pad"
        erro={erroDe('valor_centavos')}
        ajuda={inicial?.valorCentavos === null ? 'Este lançamento ainda está sem valor.' : undefined}
      />

      {modo === 'criar' ? (
        <CampoFormulario
          rotulo="Data do serviço"
          value={data}
          onChangeText={(texto) => {
            setData(mascaraDeData(texto));
            limpar('data');
          }}
          placeholder="dd/mm/aaaa"
          keyboardType="number-pad"
          maxLength={10}
          erro={erroDe('data')}
          ajuda="O lançamento entra no mês desta data."
        />
      ) : null}

      {erroAcao && Object.keys(errosDoCampo).length === 0 ? (
        <ThemedText type="small" style={{ color: theme.danger }} accessibilityLiveRegion="polite">
          {erroAcao}
        </ThemedText>
      ) : null}
    </FormularioTela>
  );
}

const estilos = StyleSheet.create({
  somenteLeitura: { gap: Spacing.one },
  destaque: { fontFamily: Fontes.corpoSemiNegrito },
});
