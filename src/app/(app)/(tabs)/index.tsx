import { useRouter, type Href } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';

import { AvatarIniciais } from '@/components/avatar-iniciais';
import { Botao } from '@/components/botao';
import { CabecalhoTela } from '@/components/cabecalho-tela';
import { Cartao } from '@/components/cartao';
import { ChecklistRecenteItem } from '@/components/checklist-recente-item';
import { ContaAcoes } from '@/components/conta-acoes';
import { ContadorCard } from '@/components/contador-card';
import { ThemedText } from '@/components/themed-text';
import { Alturas, MaxContentWidth, Spacing } from '@/constants/theme';
import { useInicio } from '@/hooks/use-inicio';
import { useSession } from '@/hooks/use-session';
import { useTheme } from '@/hooks/use-theme';
import { formatarPlaca, formatarQuando } from '@/utils/formatadores';

/** Quanto o botão "Novo checklist" sobe sobre a faixa azul-marinho do cabeçalho. */
const SOBREPOSICAO_DO_BOTAO = 34;

export default function InicioScreen() {
  const router = useRouter();
  const theme = useTheme();
  const { usuario } = useSession();
  const { dados, carregando, atualizando, erro, atualizar } = useInicio();
  const administrador = usuario?.papel === 'administrador';

  const nome = dados?.nome ?? usuario?.name ?? '';
  const caminhao = dados?.caminhao
    ? `Caminhão ${dados.caminhao.tipo_plataforma.toLowerCase()} · ${formatarPlaca(dados.caminhao.placa)}`
    : 'Sem caminhão associado';
  const descricao = administrador ? 'Administrador' : `Motorista · ${caminhao}`;

  return (
    <View style={[estilos.tela, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={estilos.conteudo}
        refreshControl={<RefreshControl refreshing={atualizando} onRefresh={atualizar} />}>
        {/* O cabeçalho rola junto com o conteúdo: assim o botão pode se sobrepor à faixa sem ser cortado. */}
        <CabecalhoTela
          titulo={nome}
          grande
          subtitulo={dados ? `${dados.saudacao},` : 'Olá,'}
          descricao={descricao}
          acao={<AvatarIniciais nome={nome} tamanho={44} tom="ambar" />}
          sobreposicao={administrador ? 0 : SOBREPOSICAO_DO_BOTAO}
        />

        <View style={[estilos.coluna, !administrador && { marginTop: -SOBREPOSICAO_DO_BOTAO }]}>
          {administrador ? null : (
            <View style={estilos.bloco}>
              <Botao
                titulo="Novo checklist"
                icone="mais"
                grande
                onPress={() => router.push('/checklists/novo')}
                desabilitado={!dados?.pode_criar_checklist}
              />
              {dados && !dados.pode_criar_checklist ? (
                <ThemedText type="small" themeColor="textSecondary">
                  Você ainda não tem caminhão associado. Fale com o administrador para criar um checklist.
                </ThemedText>
              ) : null}
            </View>
          )}

          {erro ? (
            <View style={estilos.bloco}>
              <ThemedText style={{ color: theme.danger }}>{erro}</ThemedText>
              <Botao titulo="Tentar de novo" variante="secundario" onPress={atualizar} />
            </View>
          ) : null}

          {carregando && !dados ? <ActivityIndicator /> : null}

          {dados ? (
            <>
              <View style={estilos.contadores}>
                <ContadorCard valor={dados.contadores.hoje} rotulo="Hoje" />
                <ContadorCard valor={dados.contadores.aguardando_assinatura} rotulo="Aguardando assinatura" />
                <ContadorCard valor={dados.contadores.concluidos} rotulo="Concluídos" />
              </View>

              {dados.rascunhos.length > 0 ? (
                <View style={estilos.bloco}>
                  <ThemedText type="subtitle">Rascunhos</ThemedText>
                  {dados.rascunhos.map((rascunho) => (
                    <Cartao
                      key={rascunho.id}
                      rotulo="Continuar checklist"
                      aoTocar={() => router.push(`/checklists/${rascunho.id}/editar` as Href)}
                      style={estilos.rascunho}>
                      <View style={estilos.rascunhoTexto}>
                        <ThemedText type="smallBold" style={estilos.rascunhoTitulo}>
                          {rascunho.tipo === 'entrega' ? 'Entrega' : 'Retirada'}
                          {rascunho.veiculo ? ` · ${rascunho.veiculo}${rascunho.placa ? ` · ${formatarPlaca(rascunho.placa)}` : ''}` : ''}
                        </ThemedText>
                        <ThemedText type="small" themeColor="textSecondary">
                          Passo {rascunho.passo_atual} de 4 · alterado {formatarQuando(rascunho.atualizado_em)}
                        </ThemedText>
                      </View>
                      <ThemedText type="smallBold">Continuar checklist ›</ThemedText>
                    </Cartao>
                  ))}
                </View>
              ) : null}

              <View style={estilos.bloco}>
                <View style={estilos.tituloSecao}>
                  <ThemedText type="subtitle">Checklists recentes</ThemedText>
                  <Pressable accessibilityRole="link" onPress={() => router.push('/checklists')} style={estilos.verTodos}>
                    <ThemedText type="smallBold" style={estilos.sublinhado}>
                      Ver todos
                    </ThemedText>
                  </Pressable>
                </View>

                {dados.recentes.length === 0 ? (
                  <ThemedText themeColor="textSecondary">Nenhum checklist ainda.</ThemedText>
                ) : (
                  dados.recentes.map((checklist) => (
                    <ChecklistRecenteItem
                      key={checklist.id}
                      checklist={checklist}
                      onPress={() => router.push(`/checklists/${checklist.id}` as Href)}
                    />
                  ))
                )}
              </View>
            </>
          ) : null}

          <ContaAcoes />
        </View>
      </ScrollView>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1 },
  conteudo: { paddingBottom: Spacing.five },
  coluna: { width: '100%', maxWidth: MaxContentWidth, alignSelf: 'center', gap: Spacing.four, padding: Spacing.three },
  bloco: { gap: Spacing.two },
  contadores: { flexDirection: 'row', gap: Spacing.two },
  tituloSecao: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  verTodos: { minHeight: Alturas.alvoMinimo, justifyContent: 'center' },
  sublinhado: { textDecorationLine: 'underline' },
  rascunho: { gap: Spacing.one },
  rascunhoTexto: { gap: Spacing.half },
  rascunhoTitulo: { fontSize: 15, lineHeight: 20 },
});
