import { GoogleGenAI } from "@google/genai";
import { TechnicalIndicators } from '../types';

export const generateStockInsight = async (
  ticker: string, 
  price: number, 
  indicators: TechnicalIndicators
): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API Key is missing");
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    Agisci come un analista di trading esperto. Analizza i seguenti dati tecnici per il ticker ${ticker}.
    
    DATI DI MERCATO:
    - Prezzo Attuale: $${price.toFixed(2)}
    - RSI (14): ${indicators.rsi14 ? indicators.rsi14.toFixed(2) : 'N/A'} (Sopra 70=Ipercomprato, Sotto 30=Ipervenduto)
    - MACD Line: ${indicators.macd ? indicators.macd.macdLine.toFixed(2) : 'N/A'}
    - MACD Signal: ${indicators.macd ? indicators.macd.signalLine.toFixed(2) : 'N/A'} (Bullish se Line > Signal)
    - Bollinger Upper: ${indicators.bollinger ? indicators.bollinger.upper.toFixed(2) : 'N/A'}
    - Bollinger Lower: ${indicators.bollinger ? indicators.bollinger.lower.toFixed(2) : 'N/A'}
    - SMA 20: ${indicators.sma20 ? indicators.sma20.toFixed(2) : 'N/A'}
    - SMA 50: ${indicators.sma50 ? indicators.sma50.toFixed(2) : 'N/A'}

    COMPITO:
    Basandoti ESCLUSIVAMENTE su questi indicatori tecnici, devi fornire una strategia operativa chiara.

    FORMATO RISPOSTA OBBLIGATORIO:
    
    🎯 **STRATEGIA**: [Scrivi qui SOLO una di queste parole: "ACQUISTARE (Long)", "VENDERE (Short)", o "ATTENDERE (Hold)"]

    📉 **ANALISI**:
    Spiega in breve (max 3 frasi) perché hai scelto quella strategia (es. "L'RSI è in ipervenduto e c'è un incrocio MACD rialzista...").

    ⚠️ **LIVELLI CHIAVE**:
    Identifica un possibile supporto (SMA o Bollinger Lower) e una resistenza immediata.

    Non usare disclaimer generici, vai dritto al punto tecnico. Rispondi in Italiano.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || "Impossibile generare l'analisi.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Errore nella generazione dell'analisi AI. Controlla la configurazione API.";
  }
};