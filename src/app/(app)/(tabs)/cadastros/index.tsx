import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { BotaoFlutuante } from '@/components/botao-flutuante';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { CadastroLista, type ItemDaLista } from '@/components/cadastro-lista';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useCadastro, useRecarregarAoFocar } from '@/hooks/use-cadastro';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import type { Administrador, Caminhao, Cliente, Motorista, Veiculo } from '@/types/api';
import { formatarCpfCnpj, formatarPlaca, formatarTelefone } from '@/utils/formatadores';

type Aba = 'motoristas' | 'caminhoes' | 'clientes' | 'veiculos' | 'administradores';

interface ConfigAba {
  rotulo: string;
  recurso: string;
  rotaFormulario: string;
  textoNovo: string;
  placeholderBusca: string;
  mensagemVazia: string;
  paraItem: (registro: never) => ItemDaLista;
}

const CONFIG: Record<Aba, ConfigAba> = {
  motoristas: {
    rotulo: 'Motoristas',
    recurso: 'motoristas',
    rotaFormulario: '/cadastros/motorista',
    textoNovo: '+ Novo motorista',
    placeholderBusca: 'Buscar por nome ou usuário',
    mensagemVazia: 'Nenhum motorista encontrado.',
    paraItem: (registro: Motorista) => ({
      id: registro.id,
      titulo: registro.nome,
      subtitulo: `${registro.usuario} · CNH ${registro.cnh_categoria} · ${registro.caminhao ? formatarPlaca(registro.caminhao.placa) : 'Sem caminhão'}`,
      ativo: registro.ativo,
    }),
  },
  caminhoes: {
    rotulo: 'Caminhões',
    recurso: 'caminhoes',
    rotaFormulario: '/cadastros/caminhao',
    textoNovo: '+ Novo caminhão',
    placeholderBusca: 'Buscar por placa, modelo ou plataforma',
    mensagemVazia: 'Nenhum caminhão encontrado.',
    paraItem: (registro: Caminhao) => ({
      id: registro.id,
      titulo: `${registro.modelo} · ${formatarPlaca(registro.placa)}`,
      subtitulo: registro.tipo_plataforma,
      ativo: registro.ativo,
    }),
  },
  clientes: {
    rotulo: 'Clientes',
    recurso: 'clientes',
    rotaFormulario: '/cadastros/cliente',
    textoNovo: '+ Novo cliente',
    placeholderBusca: 'Buscar por nome, CPF/CNPJ ou telefone',
    mensagemVazia: 'Nenhum cliente encontrado.',
    paraItem: (registro: Cliente) => ({
      id: registro.id,
      titulo: registro.nome,
      subtitulo: `${formatarCpfCnpj(registro.documento)} · ${formatarTelefone(registro.telefone)}`,
      ativo: registro.ativo,
    }),
  },
  veiculos: {
    rotulo: 'Veículos',
    recurso: 'veiculos',
    rotaFormulario: '/cadastros/veiculo',
    textoNovo: '+ Novo veículo',
    placeholderBusca: 'Buscar por placa, modelo ou cor',
    mensagemVazia: 'Nenhum veículo encontrado.',
    paraItem: (registro: Veiculo) => ({
      id: registro.id,
      titulo: `${registro.modelo} · ${formatarPlaca(registro.placa)}`,
      subtitulo: registro.cor,
      ativo: registro.ativo,
    }),
  },
  administradores: {
    rotulo: 'Administradores',
    recurso: 'administradores',
    rotaFormulario: '/cadastros/administrador',
    textoNovo: '+ Novo administrador',
    placeholderBusca: 'Buscar por nome ou usuário',
    mensagemVazia: 'Nenhum administrador encontrado.',
    paraItem: (registro: Administrador) => ({
      id: registro.id,
      titulo: registro.nome,
      subtitulo: registro.usuario,
      ativo: registro.ativo,
    }),
  },
};

/** Todos veem Clientes e Veículos; o administrador também vê Motoristas, Caminhões e Administradores. */
const ABAS_DO_MOTORISTA: Aba[] = ['clientes', 'veiculos'];
const ABAS_DO_ADMINISTRADOR: Aba[] = ['motoristas', 'caminhoes', 'clientes', 'veiculos', 'administradores'];

export default function CadastrosScreen() {
  const theme = useTheme();
  const { usuario } = useSession();
  const abas = usuario?.papel === 'administrador' ? ABAS_DO_ADMINISTRADOR : ABAS_DO_MOTORISTA;
  const [abaEscolhida, setAba] = useState<Aba>(abas[0]);
  const aba = abas.includes(abaEscolhida) ? abaEscolhida : abas[0];

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <CabecalhoTela
        titulo="Cadastros"
        pilulas={abas.map((chave) => ({ chave, rotulo: CONFIG[chave].rotulo }))}
        pilulaAtiva={aba}
        aoEscolherPilula={(chave) => setAba(chave as Aba)}
      />

      <View style={estilos.conteudo}>
        <ListaDoCadastro key={aba} config={CONFIG[aba]} />
      </View>
    </View>
  );
}

/** Lista de uma aba, com busca, filtro, "carregar mais" e botão de novo registro. */
function ListaDoCadastro({ config }: { config: ConfigAba }) {
  const router = useRouter();
  const cadastro = useCadastro<{ id: number }>(config.recurso);

  // Ao voltar de um formulário, atualiza a lista com o que foi salvo.
  useRecarregarAoFocar(cadastro.recarregar);

  const itens = cadastro.itens.map((registro) => config.paraItem(registro as never));

  return (
    <>
      <CadastroLista
        reservaInferior={96}
        {...cadastro}
        itens={itens}
        onBusca={cadastro.setBusca}
        onFiltro={cadastro.setFiltro}
        onCarregarMais={cadastro.carregarMais}
        onRecarregar={cadastro.recarregar}
        onSelecionar={(id) => router.push(`${config.rotaFormulario}?id=${id}` as Href)}
        placeholderBusca={config.placeholderBusca}
        mensagemVazia={config.mensagemVazia}
      />
      <BotaoFlutuante rotulo={config.textoNovo} aoTocar={() => router.push(config.rotaFormulario as Href)} />
    </>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: {
    flex: 1,
    padding: Spacing.three,
    width: '100%',
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
  },
});
