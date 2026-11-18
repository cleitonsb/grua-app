import { ImageManipulator, SaveFormat, type ImageRef } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { api } from '@/services/api';
import type { FotoResposta } from '@/types/api';

/** Tamanhos e qualidade das imagens enviadas: a API só confere os tetos, quem reduz é o aparelho. */
export const LADO_MAXIMO_FOTO_PX = 1600;
export const QUALIDADE_FOTO = 0.7;
export const LADO_MINIATURA_PX = 320;
export const QUALIDADE_MINIATURA = 0.6;
/** Uma foto grande em rede móvel fraca leva bem mais que as chamadas comuns. */
const TEMPO_LIMITE_DO_ENVIO_MS = 60000;

export type OrigemDaFoto = 'camera' | 'galeria';

export type ResultadoDaCaptura =
  | { situacao: 'foto'; uri: string }
  | { situacao: 'cancelada' }
  | {
      situacao: 'sem-permissao';
      /** Falso quando o sistema não pergunta mais: o motorista precisa habilitar nos ajustes do aparelho. */
      podePedirDeNovo: boolean;
      mensagem: string;
    };

export interface ArquivoLocal {
  uri: string;
  largura: number;
  altura: number;
}

export interface ArquivosDaFoto {
  foto: ArquivoLocal;
  miniatura: ArquivoLocal;
}

/** A foto pertence a uma avaria ou a um item do checklist (item entra na US3). */
export type AlvoDaFoto = { avariaId: number } | { item: string };

/**
 * Abre a câmera ou a galeria. A permissão da câmera é pedida na hora; a galeria usa o seletor do sistema, que não
 * exige permissão. Devolve só o endereço da imagem original, que `prepararFoto` reduz antes do envio.
 */
export async function capturarFoto(origem: OrigemDaFoto): Promise<ResultadoDaCaptura> {
  if (origem === 'camera') {
    const permissao = await ImagePicker.requestCameraPermissionsAsync();

    if (!permissao.granted) {
      return {
        situacao: 'sem-permissao',
        podePedirDeNovo: permissao.canAskAgain,
        mensagem: 'Para fotografar, permita o acesso à câmera. Se o aparelho não perguntar de novo, habilite nos ajustes.',
      };
    }
  }

  // Qualidade máxima aqui: a redução e a recompressão acontecem em `prepararFoto`.
  const opcoes: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 1, allowsEditing: false, exif: false };
  const resultado =
    origem === 'camera' ? await ImagePicker.launchCameraAsync(opcoes) : await ImagePicker.launchImageLibraryAsync(opcoes);

  if (resultado.canceled || resultado.assets.length === 0) {
    return { situacao: 'cancelada' };
  }

  return { situacao: 'foto', uri: resultado.assets[0].uri };
}

/** Reduz a imagem ao maior lado informado (sem ampliar) e regrava como JPEG num arquivo novo. */
async function reduzir(origem: ImageRef, lado: number, qualidade: number): Promise<ArquivoLocal> {
  const maior = Math.max(origem.width, origem.height);
  const contexto = ImageManipulator.manipulate(origem);

  if (maior > lado) {
    contexto.resize(origem.width >= origem.height ? { width: lado } : { height: lado });
  }

  const reduzida = await contexto.renderAsync();
  const salva = await reduzida.saveAsync({ format: SaveFormat.JPEG, compress: qualidade });

  return { uri: salva.uri, largura: salva.width, altura: salva.height };
}

/**
 * Prepara a foto para o envio: carrega a imagem uma vez (já com a orientação aplicada) e gera a versão reduzida
 * (maior lado de 1600 px, JPEG 0,7) e a miniatura (320 px, JPEG 0,6). Os arquivos são regravados do zero, então não
 * carregam os metadados do original; confirmar no aparelho que o GPS não vai junto (quickstart da spec).
 */
export async function prepararFoto(uri: string): Promise<ArquivosDaFoto> {
  const original = await ImageManipulator.manipulate(uri).renderAsync();

  const [foto, miniatura] = await Promise.all([
    reduzir(original, LADO_MAXIMO_FOTO_PX, QUALIDADE_FOTO),
    reduzir(original, LADO_MINIATURA_PX, QUALIDADE_MINIATURA),
  ]);

  return { foto, miniatura };
}

/** Monta o arquivo para o `FormData` do React Native (que aceita `{ uri, name, type }`). */
function parteDoFormulario(arquivo: ArquivoLocal, nome: string): Blob {
  return { uri: arquivo.uri, name: nome, type: 'image/jpeg' } as unknown as Blob;
}

/**
 * Envia a foto e a miniatura para `POST /checklists/{id}/fotos`. O `clientUuid` torna o reenvio seguro: se a
 * primeira tentativa chegou mas a resposta se perdeu, repetir devolve a mesma foto em vez de duplicar.
 */
export function enviarFoto(
  checklistId: string | number,
  alvo: AlvoDaFoto,
  arquivos: ArquivosDaFoto,
  clientUuid: string,
  versaoBase: number,
): Promise<FotoResposta> {
  const formulario = new FormData();

  formulario.append('client_uuid', clientUuid);
  formulario.append('foto', parteDoFormulario(arquivos.foto, `${clientUuid}.jpg`));
  formulario.append('miniatura', parteDoFormulario(arquivos.miniatura, `${clientUuid}-mini.jpg`));

  if ('avariaId' in alvo) {
    formulario.append('avaria_id', String(alvo.avariaId));
  } else {
    formulario.append('item', alvo.item);
  }

  if (versaoBase > 0) {
    formulario.append('versao_base', String(versaoBase));
  }

  return api<FotoResposta>(`/checklists/${checklistId}/fotos`, {
    method: 'POST',
    body: formulario,
    tempoLimiteMs: TEMPO_LIMITE_DO_ENVIO_MS,
  });
}
