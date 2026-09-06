import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';

import { api, type CardDraft } from './api';

/**
 * 갤러리에서 명함 이미지를 선택 → 축소 → 백엔드로 전송해 고객 정보 초안을 받는다.
 * 취소 시 null.
 */
export async function scanBusinessCard(): Promise<CardDraft | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    throw new Error('사진 접근 권한이 필요합니다.');
  }

  const picked = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 1,
  });
  if (picked.canceled || !picked.assets?.[0]) return null;

  const resized = await manipulateAsync(
    picked.assets[0].uri,
    [{ resize: { width: 1400 } }],
    { compress: 0.6, format: SaveFormat.JPEG, base64: true },
  );
  if (!resized.base64) throw new Error('이미지 처리에 실패했습니다.');

  return api.customerFromCard(resized.base64, 'image/jpeg');
}
