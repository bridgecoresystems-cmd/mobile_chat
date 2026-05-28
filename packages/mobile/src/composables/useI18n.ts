import { ref } from 'vue'

export type Lang = 'ru' | 'en' | 'tk'

const dict = {
  ru: {
    // navbar
    nav_chats:          'Чаты',
    nav_contacts:       'Контакты',
    nav_calls:          'Звонки',
    nav_profile:        'Профиль',
    // chats page
    chats_title:        'Чаты',
    chats_search_ph:    'Поиск чата...',
    chats_empty:        'Нет чатов',
    chats_empty_sub:    'Найди людей через поиск контактов',
    chats_nf:           'Чат не найден',
    chats_nf_sub:       '«{q}» — нет такого чата',
    chats_end:          '— всё —',
    // contacts page
    contacts_title:     'Контакты',
    contacts_search_ph: 'Поиск контакта...',
    contacts_empty:     'Нет контактов',
    contacts_empty_sub: 'Нажми «+» чтобы найти людей',
    contacts_nf:        'Контакт не найден',
    contacts_nf_sub:    '«{q}» не в списке',
    contacts_add:       'Добавить контакт',
    contacts_end:       '— всё —',
    // chat page
    chat_online:        'онлайн',
    chat_offline:       'не в сети',
    chat_empty:         'История сообщений пуста',
    chat_empty_sub:     'Напишите первое сообщение',
    chat_today:         'Сегодня',
    chat_yesterday:     'Вчера',
    chat_placeholder:   'Написать сообщение...',
    chat_edit_ph:       'Редактировать сообщение...',
    chat_deleted:       'Сообщение удалено',
    chat_typing:        '{name} печатает...',
    chat_del_confirm:   'Удалить сообщение?',
    chat_photo_err:     'Не удалось загрузить фото',
    // profile page
    profile_title:      'Профиль',
    profile_edit:       'Изменить',
    profile_cancel:     'Отмена',
    profile_save:       'Сохранить',
    profile_fname:      'Имя',
    profile_lname:      'Фамилия',
    profile_phone:      'Телефон',
    profile_settings:   'Настройки',
    profile_theme:      'Тема',
    profile_dark:       'Тёмная',
    profile_light:      'Светлая',
    profile_lang:       'Язык',
    profile_logout:     'Выйти из аккаунта',
    profile_photo_err:  'Ошибка загрузки фото',
    profile_avatar_err: 'Не удалось сохранить аватар',
  },
  en: {
    nav_chats:          'Chats',
    nav_contacts:       'Contacts',
    nav_calls:          'Calls',
    nav_profile:        'Profile',
    chats_title:        'Chats',
    chats_search_ph:    'Search chats...',
    chats_empty:        'No chats',
    chats_empty_sub:    'Find people in contacts search',
    chats_nf:           'Chat not found',
    chats_nf_sub:       '«{q}» — no such chat',
    chats_end:          '— end —',
    contacts_title:     'Contacts',
    contacts_search_ph: 'Search contacts...',
    contacts_empty:     'No contacts',
    contacts_empty_sub: 'Tap «+» to find people',
    contacts_nf:        'Contact not found',
    contacts_nf_sub:    '«{q}» not in list',
    contacts_add:       'Add contact',
    contacts_end:       '— end —',
    chat_online:        'online',
    chat_offline:       'offline',
    chat_empty:         'Chat history is empty',
    chat_empty_sub:     'Send the first message',
    chat_today:         'Today',
    chat_yesterday:     'Yesterday',
    chat_placeholder:   'Write a message...',
    chat_edit_ph:       'Edit message...',
    chat_deleted:       'Message deleted',
    chat_typing:        '{name} is typing...',
    chat_del_confirm:   'Delete message?',
    chat_photo_err:     'Failed to upload photo',
    profile_title:      'Profile',
    profile_edit:       'Edit',
    profile_cancel:     'Cancel',
    profile_save:       'Save',
    profile_fname:      'First name',
    profile_lname:      'Last name',
    profile_phone:      'Phone',
    profile_settings:   'Settings',
    profile_theme:      'Theme',
    profile_dark:       'Dark',
    profile_light:      'Light',
    profile_lang:       'Language',
    profile_logout:     'Sign out',
    profile_photo_err:  'Photo upload error',
    profile_avatar_err: 'Failed to save avatar',
  },
  tk: {
    nav_chats:          'Çatlar',
    nav_contacts:       'Kontaktlar',
    nav_calls:          'Jaňlar',
    nav_profile:        'Profil',
    chats_title:        'Çatlar',
    chats_search_ph:    'Çat gözle...',
    chats_empty:        'Çat ýok',
    chats_empty_sub:    'Kontakt gözleginde adam tap',
    chats_nf:           'Çat tapylmady',
    chats_nf_sub:       '«{q}» — şeýle çat ýok',
    chats_end:          '— gutardy —',
    contacts_title:     'Kontaktlar',
    contacts_search_ph: 'Kontakt gözle...',
    contacts_empty:     'Kontakt ýok',
    contacts_empty_sub: 'Adam tapmak üçin «+» bas',
    contacts_nf:        'Kontakt tapylmady',
    contacts_nf_sub:    '«{q}» sanawda ýok',
    contacts_add:       'Kontakt goş',
    contacts_end:       '— gutardy —',
    chat_online:        'onlaýn',
    chat_offline:       'tor ýok',
    chat_empty:         'Hat geçmişi boş',
    chat_empty_sub:     'Ilkinji habary ýazyň',
    chat_today:         'Şu gün',
    chat_yesterday:     'Düýn',
    chat_placeholder:   'Habar ýaz...',
    chat_edit_ph:       'Habary düzelt...',
    chat_deleted:       'Habar öçürildi',
    chat_typing:        '{name} ýazýar...',
    chat_del_confirm:   'Habary öçürmeli mi?',
    chat_photo_err:     'Suraty ýükläp bolmady',
    profile_title:      'Profil',
    profile_edit:       'Düzelt',
    profile_cancel:     'Ýatyr',
    profile_save:       'Ýatda sakla',
    profile_fname:      'At',
    profile_lname:      'Familiýa',
    profile_phone:      'Telefon',
    profile_settings:   'Sazlamalar',
    profile_theme:      'Tema',
    profile_dark:       'Garaňky',
    profile_light:      'Ýagty',
    profile_lang:       'Dil',
    profile_logout:     'Hasapdan çyk',
    profile_photo_err:  'Surat ýüklenmedi',
    profile_avatar_err: 'Avatary saklap bolmady',
  },
} satisfies Record<Lang, Record<string, string>>

type Key = keyof typeof dict.ru

// Singleton — все компоненты разделяют один ref
const lang = ref<Lang>((localStorage.getItem('lang') as Lang) ?? 'ru')

export function useI18n() {
  function t(key: Key, vars?: Record<string, string>): string {
    let s = dict[lang.value][key] ?? key
    if (vars) {
      for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, v)
    }
    return s
  }

  function setLang(l: Lang) {
    lang.value = l
    localStorage.setItem('lang', l)
  }

  // 'en-US' для английского, 'ru' для остальных (tk браузеры поддерживают плохо)
  function locale(): string {
    return lang.value === 'en' ? 'en-US' : 'ru'
  }

  return { lang, t, setLang, locale }
}
