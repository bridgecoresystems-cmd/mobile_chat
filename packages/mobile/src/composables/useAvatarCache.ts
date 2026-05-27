import { ref } from 'vue'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Preferences } from '@capacitor/preferences'

const FILENAME_KEY   = 'my_avatar_filename'
const REMOTE_URL_KEY = 'my_avatar_remote_url'
const AVATAR_FILE    = 'my_avatar.jpg'

// Модуль-синглтон — все компоненты читают одну и ту же ref
export const myAvatarDataUrl = ref<string | null>(null)

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload  = () => resolve((reader.result as string).split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

/** Загружает кэшированное фото с устройства при старте приложения */
export async function loadLocalAvatar(): Promise<void> {
  const { value: filename } = await Preferences.get({ key: FILENAME_KEY })
  if (!filename) return
  try {
    const file = await Filesystem.readFile({ path: filename, directory: Directory.Data })
    myAvatarDataUrl.value = `data:image/jpeg;base64,${file.data as string}`
  } catch {
    await Preferences.remove({ key: FILENAME_KEY })
    await Preferences.remove({ key: REMOTE_URL_KEY })
  }
}

/** Сравнивает remoteUrl с кэшированным — скачивает только если изменился */
export async function syncAvatar(remoteUrl: string | null): Promise<void> {
  if (!remoteUrl) {
    myAvatarDataUrl.value = null
    await Preferences.remove({ key: FILENAME_KEY })
    await Preferences.remove({ key: REMOTE_URL_KEY })
    return
  }
  const { value: cachedUrl } = await Preferences.get({ key: REMOTE_URL_KEY })
  if (cachedUrl === remoteUrl) return   // уже актуально
  await saveLocalAvatar(remoteUrl)
}

/** Скачивает фото с remoteUrl, сохраняет на устройство, обновляет ref */
export async function saveLocalAvatar(remoteUrl: string): Promise<void> {
  const res    = await fetch(remoteUrl)
  const blob   = await res.blob()
  const base64 = await blobToBase64(blob)

  await Filesystem.writeFile({
    path: AVATAR_FILE,
    data: base64,
    directory: Directory.Data,
    recursive: true,
  })

  await Preferences.set({ key: FILENAME_KEY,   value: AVATAR_FILE })
  await Preferences.set({ key: REMOTE_URL_KEY, value: remoteUrl   })

  myAvatarDataUrl.value = `data:image/jpeg;base64,${base64}`
}

export function useAvatarCache() {
  return { myAvatarDataUrl, loadLocalAvatar, syncAvatar, saveLocalAvatar }
}
