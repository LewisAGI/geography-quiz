import { describe, expect, it } from 'vitest'
import { questions } from '../src/lib/catalog'
import { gradeQuestion } from '../src/lib/grade'

/** Explicit accept/reject forms for every pack answer that contains a slash or parentheses. */
const ALTERNATES: Record<string, { accept: string[]; reject: string[] }> = {
  q00064: { accept: ['Tripoli', 'Tarabulus'], reject: [] },
  q00066: { accept: ['Tripoli', 'Tarabulus'], reject: [] },
  q00166: { accept: ['Suva'], reject: ['on Viti Levu'] },
  q00168: { accept: ['Suva'], reject: ['on Viti Levu'] },
  q00172: { accept: ['Papeete'], reject: ['located on Tahiti'] },
  q00174: { accept: ['Papeete'], reject: ['located on Tahiti'] },
  q00175: { accept: ['Hagatna', 'Agana'], reject: [] },
  q00177: { accept: ['Hagatna', 'Agana'], reject: [] },
  q00181: { accept: ['The Settlement', 'Settlement', 'Flying Fish Cove'], reject: [] },
  q00183: { accept: ['The Settlement', 'Settlement', 'Flying Fish Cove'], reject: [] },
  q00193: { accept: ['Port-Vila'], reject: ['on Efate'] },
  q00195: { accept: ['Port-Vila'], reject: ['on Efate'] },
  q00214: { accept: ['Mata-Utu'], reject: ['on Ile Uvea'] },
  q00216: { accept: ['Mata-Utu'], reject: ['on Ile Uvea'] },
  q00238: { accept: ['George Town'], reject: ['on Grand Cayman'] },
  q00240: { accept: ['George Town'], reject: ['on Grand Cayman'] },
  q00301: { accept: ['Grand Turk', 'Cockburn Town'], reject: [] },
  q00303: { accept: ['Grand Turk', 'Cockburn Town'], reject: [] },
  q00316: { accept: ['Baku', 'Baki', 'Baky', 'Bakı'], reject: [] },
  q00318: { accept: ['Baku', 'Baki', 'Baky', 'Bakı'], reject: [] },
  q00337: { accept: ['Ashgabat', 'Ashkhabad'], reject: [] },
  q00339: { accept: ['Ashgabat', 'Ashkhabad'], reject: [] },
  q00340: { accept: ['Tashkent', 'Toshkent'], reject: [] },
  q00342: { accept: ['Tashkent', 'Toshkent'], reject: [] },
  q00364: { accept: ['Vientiane', 'Viangchan'], reject: [] },
  q00366: { accept: ['Vientiane', 'Viangchan'], reject: [] },
  q00391: { accept: ['Hanoi', 'Ha Noi'], reject: [] },
  q00393: { accept: ['Hanoi', 'Ha Noi'], reject: [] },
  q00394: { accept: ['Tirana', 'Tirane'], reject: [] },
  q00396: { accept: ['Tirana', 'Tirane'], reject: [] },
  q00415: { accept: ['Nicosia', 'Lefkosia', 'Lefkosa'], reject: [] },
  q00417: { accept: ['Nicosia', 'Lefkosia', 'Lefkosa'], reject: [] },
  q00469: { accept: ['Pristina', 'Prishtine', 'Prishtina'], reject: [] },
  q00471: { accept: ['Pristina', 'Prishtine', 'Prishtina'], reject: [] },
  q00508: { accept: ['Belgrade', 'Beograd'], reject: [] },
  q00510: { accept: ['Belgrade', 'Beograd'], reject: [] },
  q00517: { accept: ['San Marino'], reject: ['city'] },
  q00519: { accept: ['San Marino'], reject: ['city'] },
  q00586: { accept: ['Mexico City', 'Ciudad de Mexico'], reject: [] },
  q00588: { accept: ['Mexico City', 'Ciudad de Mexico'], reject: [] },
  q00935: { accept: ['Saint Martin', 'France'], reject: [] },
  q01025: { accept: ['Holy See', 'Vatican City'], reject: [] },
  q01560: { accept: ['Pic Marguerite', 'Mount Stanley'], reject: ['Mont Ngaliema', 'Pic Marguerite on Mont Ngaliema'] },
  q01564: { accept: ['Mt. Fogo'], reject: ['a volcano on Fogo Island'] },
  q01579: { accept: ['Sapitwa', 'Mount Mlanje'], reject: [] },
  q01591: { accept: ['Ntheledi', 'Mafadi'], reject: [] },
  q01593: { accept: ['Loma Mansa', 'Bintimani'], reject: [] },
  q01599: { accept: ['Kilimanjaro'], reject: ['highest point in Africa'] },
  q01630: { accept: ['Mont Singavi'], reject: ['on Futuna'] },
  q01664: { accept: ['Jengish Chokusu', 'Pik Pobedy'], reject: [] },
  q01665: { accept: ["Gora El'brus"], reject: ['highest point in Europe'] },
  q01679: { accept: ['Nayramadlin Orgil', 'Khuiten Peak'], reject: [] },
  q01688: { accept: ['Maja e Korabit', 'Golem Korab'], reject: [] },
  q01708: { accept: ['Hvannadalshnukur'], reject: ['at Vatnajokull Glacier'] },
  q01711: { accept: ['Gjeravica', 'Deravica'], reject: [] },
  q01719: { accept: ['Golem Korab', 'Maja e Korabit'], reject: [] },
  q01728: { accept: ['Pico de Teide', 'Teide', 'Mount Teide'], reject: ['Canary Islands', 'Pico de Teide on Canary Islands', 'Tenerife'] },
  q01734: { accept: ['Vatican Gardens', 'Vatican Hill'], reject: [] },
  q01738: { accept: ['Cheekha Dar'], reject: ['Kurdish for "Black Tent"'] },
  q01745: { accept: ['Mount Hermon', 'Jabal a-Shayk'], reject: [] },
  q01763: { accept: ['Mount Paget'], reject: ['South Georgia'] },
  q01773: { accept: ['K2', 'Mt. Godwin-Austen'], reject: [] },
  q01840: { accept: ['Río de la Plata', 'Paraná'], reject: [] },
  q01843: { accept: ['Río de la Plata', 'Paraná'], reject: [] },
  q01845: { accept: ['Rio de la Plata', 'Parana'], reject: [] },
  q01997: { accept: ['Aoraki', 'Mount Cook'], reject: [] },
}

describe('pack alternates', () => {
  it('grades every alternate form of the 66 pack answers', () => {
    const packed = questions.filter((question) => /[()/]/.test(question.answer))
    expect(packed).toHaveLength(66)
    expect(Object.keys(ALTERNATES).sort()).toEqual(packed.map((question) => question.id).sort())

    let forms = 0
    for (const question of packed) {
      const row = ALTERNATES[question.id]
      expect(row, question.id).toBeTruthy()
      for (const form of row.accept) {
        forms += 1
        expect(gradeQuestion(question, form), `${question.id} accepts ${form}`).toBe(true)
      }
      for (const form of row.reject) {
        forms += 1
        expect(gradeQuestion(question, form), `${question.id} rejects ${form}`).toBe(false)
      }
      for (const distractor of question.distractors ?? []) {
        expect(gradeQuestion(question, distractor), `${question.id} distractor ${distractor}`).toBe(false)
      }
    }
    expect(forms).toBe(148)
  })
})
