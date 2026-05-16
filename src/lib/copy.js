const COPY = {
  correct: [
    'Yes! Questa l hai presa al volo.',
    'Bella! Sta entrando in testa.',
    'Pulita. Risposta giusta.',
    'Boom. Centrata.',
  ],
  wrong: [
    'Ci siamo quasi. La prossima la prendi.',
    'Ops, reset rapido e si riparte.',
    'Non male, ma adesso riscossa immediata.',
    'Errore piccolo, comeback grande.',
  ],
  combo: [
    'Combo da {{combo}}! Mani caldissime.',
    '{{combo}} di fila. Sei in fiamme.',
    'Nessuno ti ferma: combo {{combo}}.',
    'Combo {{combo}}. Qui si vola.',
  ],
  mission: [
    'Missione fatta: {{mission}}.',
    'Obiettivo preso: {{mission}}.',
    'Check! {{mission}} e XP in tasca.',
  ],
  record: [
    'Nuovo record. Qui si sale di livello davvero.',
    'Record personale battuto. Applausi meritati.',
    'Hai alzato l asticella. Record nuovo.',
  ],
  levelUp: [
    'Livello {{level}}! Si sente il power-up.',
    'Level up! Benvenuto al livello {{level}}.',
    'Hai sbloccato il livello {{level}}. Si continua forte.',
  ],
  finishGreat: [
    'Finale da campione. Partita solidissima.',
    'Gran chiusura. Questa run profuma di rivincita immediata.',
    'Hai chiuso fortissimo. Bella run davvero.',
  ],
  finishGood: [
    'Bella run. Ancora un pelo e diventa leggendaria.',
    'Molto bene. Hai trovato ritmo.',
    'Run convincente. Si puo spingere ancora.',
  ],
  finishOk: [
    'Buon riscaldamento. La prossima puo esplodere.',
    'C e margine, ed e la parte divertente.',
    'Partita onesta. Adesso proviamo a fare scintille.',
  ],
}

function fillTemplate(message, context) {
  return message.replace(/\{\{(\w+)\}\}/g, (_, key) => context[key] ?? '')
}

export function pickMessage(category, previousMessage = '', context = {}) {
  const messages = COPY[category] ?? []

  if (messages.length === 0) {
    return ''
  }

  const candidates = messages.length > 1 ? messages.filter((message) => message !== previousMessage) : messages
  const nextMessage = candidates[Math.floor(Math.random() * candidates.length)]

  return fillTemplate(nextMessage, context)
}
