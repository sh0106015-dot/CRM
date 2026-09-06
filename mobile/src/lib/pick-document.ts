import * as DocumentPicker from 'expo-document-picker';

export interface PickedDoc {
  base64: string;
  mimeType: 'application/pdf' | 'image/png' | 'image/jpeg';
  name: string;
}

async function uriToBase64(uri: string): Promise<string> {
  const res = await fetch(uri);
  const blob = await res.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.onload = () => {
      const s = String(reader.result);
      resolve(s.slice(s.indexOf(',') + 1));
    };
    reader.readAsDataURL(blob);
  });
}

/** PDF 또는 이미지 파일을 선택해 base64 로 반환한다. 취소 시 null. */
export async function pickPolicyDocument(): Promise<PickedDoc | null> {
  const res = await DocumentPicker.getDocumentAsync({
    type: ['application/pdf', 'image/png', 'image/jpeg'],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (res.canceled || !res.assets?.[0]) return null;

  const asset = res.assets[0];
  const mime = asset.mimeType ?? '';
  const mimeType: PickedDoc['mimeType'] = mime.includes('pdf')
    ? 'application/pdf'
    : mime.includes('png')
      ? 'image/png'
      : 'image/jpeg';

  const base64 = await uriToBase64(asset.uri);
  if (!base64) throw new Error('빈 파일입니다.');
  return { base64, mimeType, name: asset.name ?? 'document' };
}
