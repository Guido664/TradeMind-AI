import React from 'react';
import { TechnicalIndicators } from '../types';

interface IndicatorCardProps {
  indicators: TechnicalIndicators;
}

const IndicatorCard: React.FC<IndicatorCardProps> = ({ indicators }) => {
  const format = (num: number | null | undefined) => num ? num.toFixed(2) : '--';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* RSI Card */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">RSI (14)</h4>
        <div className="flex items-baseline gap-2">
          <span className={`text-3xl font-bold ${
            (indicators.rsi14 || 50) > 70 ? 'text-rose-400' : 
            (indicators.rsi14 || 50) < 30 ? 'text-emerald-400' : 'text-white'
          }`}>
            {format(indicators.rsi14)}
          </span>
          <span className="text-xs text-slate-500">Indice di Forza</span>
        </div>
      </div>

      {/* MACD Card */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">MACD (12, 26, 9)</h4>
        <div className="flex flex-col">
           <div className="flex justify-between text-sm mb-1">
             <span className="text-slate-400">Linea:</span>
             <span className={indicators.macd && indicators.macd.macdLine > 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {format(indicators.macd?.macdLine)}
             </span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-slate-400">Segnale:</span>
             <span className="text-slate-200">
                {format(indicators.macd?.signalLine)}
             </span>
           </div>
        </div>
      </div>

      {/* SMA Card */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
         <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Medie Mobili</h4>
         <div className="flex flex-col">
           <div className="flex justify-between text-sm mb-1">
             <span className="text-slate-400">SMA 20:</span>
             <span className="text-amber-400 font-mono">{format(indicators.sma20)}</span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-slate-400">SMA 50:</span>
             <span className="text-orange-400 font-mono">{format(indicators.sma50)}</span>
           </div>
        </div>
      </div>

      {/* Bollinger Width */}
      <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
        <h4 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">Range Bollinger</h4>
        <div className="flex flex-col">
           <div className="flex justify-between text-sm mb-1">
             <span className="text-slate-400">Superiore:</span>
             <span className="text-sky-400 font-mono">{format(indicators.bollinger?.upper)}</span>
           </div>
           <div className="flex justify-between text-sm">
             <span className="text-slate-400">Inferiore:</span>
             <span className="text-sky-400 font-mono">{format(indicators.bollinger?.lower)}</span>
           </div>
        </div>
      </div>
    </div>
  );
};

export default IndicatorCard;