import { OHLCData, TechnicalIndicators } from '../types';

// Calcola la distanza Lorentziana tra due punti (basata su features specifiche)
const getLorentzianDistance = (f1_cur: number, f2_cur: number, f1_hist: number, f2_hist: number): number => {
    return Math.log(1 + Math.abs(f1_cur - f1_hist)) + Math.log(1 + Math.abs(f2_cur - f2_hist));
};

export const calculateLorentzianSignal = (data: (OHLCData & TechnicalIndicators)[]): 'COMPRA' | 'VENDI' | 'NEUTRALE' => {
    if (data.length < 20) return 'NEUTRALE';

    // Usiamo RSI e la variazione di prezzo (Close - Open) come features semplificate
    const features = data.map(d => ({
        f1: d.rsi14 || 50,
        f2: d.close - d.open,
        close: d.close
    }));

    const currentBar = features[features.length - 1];
    
    // Nearest Neighbors (k=8)
    const k = 8;
    const distances = [];

    // Cerchiamo le distanze storiche (escludendo le barre più recenti per evitare overfitting)
    for (let i = 0; i < features.length - 4; i++) {
        const histBar = features[i];
        
        // La "label" storica è definita guardando 4 barre nel futuro
        // Se il prezzo è salito dopo 4 barre, era un segnale LONG (1), altrimenti SHORT (-1)
        const futureBar = features[Math.min(i + 4, features.length - 1)];
        const label = futureBar.close > histBar.close ? 1 : -1;

        const distance = getLorentzianDistance(currentBar.f1, currentBar.f2, histBar.f1, histBar.f2);
        
        distances.push({ distance, label });
    }

    // Ordina per distanza crescente (i più simili)
    distances.sort((a, b) => a.distance - b.distance);

    // Prendi i primi k
    const nearestNeighbors = distances.slice(0, k);

    // Calcola la previsione sommando le label dei vicini
    const prediction = nearestNeighbors.reduce((acc, neighbor) => acc + neighbor.label, 0);

    if (prediction > 0) return 'COMPRA';
    if (prediction < 0) return 'VENDI';
    return 'NEUTRALE';
};
