// Optional voice input. Degrades gracefully to typing when unsupported.
type SR = { lang: string; interimResults: boolean; onresult: (e: any) => void; onerror: () => void; onend: () => void; start: () => void; stop: () => void };

export function sttSupported(): boolean {
  return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function listenOnce(lang = "en-PK"): Promise<string> {
  return new Promise((resolve, reject) => {
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) { reject(new Error("STT unsupported")); return; }
    const rec: SR = new Ctor();
    rec.lang = lang;
    rec.interimResults = false;
    rec.onresult = (e: any) => resolve(e.results[0][0].transcript as string);
    rec.onerror = () => reject(new Error("STT error"));
    rec.start();
  });
}
