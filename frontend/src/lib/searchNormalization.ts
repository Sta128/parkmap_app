const ROMAJI_TABLE: Record<string, string> = {
  kya:'きゃ', kyu:'きゅ', kyo:'きょ', sha:'しゃ', shu:'しゅ', sho:'しょ',
  cha:'ちゃ', chu:'ちゅ', cho:'ちょ', nya:'にゃ', nyu:'にゅ', nyo:'にょ',
  hya:'ひゃ', hyu:'ひゅ', hyo:'ひょ', mya:'みゃ', myu:'みゅ', myo:'みょ',
  rya:'りゃ', ryu:'りゅ', ryo:'りょ', gya:'ぎゃ', gyu:'ぎゅ', gyo:'ぎょ',
  ja:'じゃ', ju:'じゅ', jo:'じょ', bya:'びゃ', byu:'びゅ', byo:'びょ',
  pya:'ぴゃ', pyu:'ぴゅ', pyo:'ぴょ',
  shi:'し', chi:'ち', tsu:'つ', fu:'ふ', ji:'じ',
  ka:'か', ki:'き', ku:'く', ke:'け', ko:'こ',
  sa:'さ', si:'し', su:'す', se:'せ', so:'そ',
  ta:'た', ti:'ち', tu:'つ', te:'て', to:'と',
  na:'な', ni:'に', nu:'ぬ', ne:'ね', no:'の',
  ha:'は', hi:'ひ', hu:'ふ', he:'へ', ho:'ほ',
  ma:'ま', mi:'み', mu:'む', me:'め', mo:'も',
  ya:'や', yu:'ゆ', yo:'よ',
  ra:'ら', ri:'り', ru:'る', re:'れ', ro:'ろ',
  wa:'わ', wo:'を',
  ga:'が', gi:'ぎ', gu:'ぐ', ge:'げ', go:'ご',
  za:'ざ', zi:'じ', zu:'ず', ze:'ぜ', zo:'ぞ',
  da:'だ', di:'ぢ', du:'づ', de:'で', do:'ど',
  ba:'ば', bi:'び', bu:'ぶ', be:'べ', bo:'ぼ',
  pa:'ぱ', pi:'ぴ', pu:'ぷ', pe:'ぺ', po:'ぽ',
  a:'あ', i:'い', u:'う', e:'え', o:'お', n:'ん',
}

export const katakanaToHiragana = (value: string) =>
  value.replace(/[ァ-ヶ]/g, char => String.fromCharCode(char.charCodeAt(0) - 0x60))

export const romajiToHiragana = (input: string) => {
  const value = input.toLowerCase()
  let result = ''
  let index = 0

  while (index < value.length) {
    const current = value[index]
    const next = value[index + 1]

    if (current && next && current === next && /[bcdfghjklmpqrstvwxyz]/.test(current) && current !== 'n') {
      result += 'っ'
      index += 1
      continue
    }

    if (current === 'n' && (!next || !/[aiueoyn]/.test(next))) {
      result += 'ん'
      index += 1
      continue
    }

    let matched = false
    for (const length of [3, 2, 1]) {
      const token = value.slice(index, index + length)
      const kana = ROMAJI_TABLE[token]
      if (kana) {
        result += kana
        index += length
        matched = true
        break
      }
    }

    if (!matched) {
      result += current
      index += 1
    }
  }

  return result
}

export const normalizeSearchText = (value: string) =>
  katakanaToHiragana(value.normalize('NFKC').toLowerCase())
    .replace(/[\s\-‐‑‒–—―・･ー]/g, '')

export const createSearchVariants = (value: string) => {
  const normalized = normalizeSearchText(value)
  const kana = normalizeSearchText(romajiToHiragana(value.normalize('NFKC')))
  return Array.from(new Set([normalized, kana].filter(Boolean)))
}

export const matchesJapaneseText = (target: string, query: string) => {
  const normalizedTarget = normalizeSearchText(target)
  return createSearchVariants(query).some(variant => normalizedTarget.includes(variant))
}
