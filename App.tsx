import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import StockChart from './components/StockChart';
import IndicatorCard from './components/IndicatorCard';
import SignalAlert from './components/SignalAlert';
import OscillatorChart from './components/OscillatorChart';
import { generateMarketData } from './services/stockService';
import { generateStockInsight } from './services/geminiService';
import { AnalysisResult, TimeFrame } from './types';
import { ICONS } from './constants';

const App: React.FC = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Load initial data on mount
  useEffect(() => {
    handleAnalyze('AAPL', '6m');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAnalyze = async (ticker: string, timeframe: TimeFrame) => {
    setLoading(true);
    setAiInsight(null);
    
    // We can call directly. The service handles async.
    try {
        const data = await generateMarketData(ticker, timeframe);
        setResult(data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handleGenerateInsight = async () => {
    if (!result) return;
    setAiLoading(true);
    const insight = await generateStockInsight(
      result.ticker, 
      result.currentPrice, 
      result.latestIndicators
    );
    setAiInsight(insight);
    setAiLoading(false);
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-900 text-slate-50 overflow-hidden">
      <Sidebar 
        onAnalyze={handleAnalyze} 
        isLoading={loading} 
        isSimulated={result?.isSimulated}
      />

      <main className="flex-1 overflow-y-auto h-screen p-4 md:p-8 relative">
        {!result && !loading && (
          <div className="h-full flex items-center justify-center text-slate-500">
            Seleziona un titolo da analizzare
          </div>
        )}

        {result && (
          <div className="max-w-6xl mx-auto space-y-6 pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-2">
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-2">
                  {result.ticker}
                </h1>
                <p className="text-slate-400 font-medium">Analisi di Mercato {result.isSimulated ? '(Simulazione)' : ''}</p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-bold font-mono text-white">
                  ${result.currentPrice.toFixed(2)}
                </div>
                <div className={`font-mono font-medium flex items-center justify-end gap-1 ${
                  result.changePercent >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}>
                  {result.changePercent >= 0 ? '+' : ''}{result.changePercent.toFixed(2)}%
                  {result.changePercent >= 0 ? ICONS.TrendingUp : ICONS.TrendingDown}
                </div>
              </div>
            </div>

            {/* Signal Alert */}
            <SignalAlert rsi={result.latestIndicators.rsi14} />

            {/* Main Chart with Volume */}
            <StockChart data={result.data} />
            
            {/* Oscillators History */}
            <OscillatorChart data={result.data} />

            {/* Indicators Grid */}
            <div>
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                Sintesi Indicatori
              </h3>
              <IndicatorCard indicators={result.latestIndicators} />
            </div>

            {/* AI Insight Section */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-800 rounded-2xl p-6 border border-indigo-500/30 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                {ICONS.Sparkles}
              </div>
              
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <span className="text-indigo-400">{ICONS.Sparkles}</span>
                  Analista AI Gemini
                </h3>
                {!aiInsight && !aiLoading && (
                  <button 
                    onClick={handleGenerateInsight}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-lg shadow-indigo-600/20"
                  >
                    Genera Analisi
                  </button>
                )}
              </div>

              {aiLoading && (
                <div className="flex items-center gap-3 text-indigo-300 animate-pulse py-4">
                  <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin"></div>
                  Analisi dei pattern di mercato in corso...
                </div>
              )}

              {aiInsight && (
                <div className="prose prose-invert max-w-none">
                  {/* Added whitespace-pre-wrap to respect new lines from AI response */}
                  <div className="text-slate-200 leading-relaxed text-lg whitespace-pre-wrap">
                    {aiInsight}
                  </div>
                  <button 
                    onClick={handleGenerateInsight}
                    className="mt-4 text-xs text-indigo-400 hover:text-indigo-300 underline"
                  >
                    Aggiorna Analisi
                  </button>
                </div>
              )}
              
              {!aiInsight && !aiLoading && (
                 <p className="text-slate-400">
                   Sblocca un report strategico completo (Buy/Sell/Hold) basato su RSI, MACD e Volatilità.
                 </p>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;