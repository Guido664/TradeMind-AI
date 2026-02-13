import React from 'react';
import { ICONS } from '../constants';

interface SignalAlertProps {
  rsi: number | null;
}

const SignalAlert: React.FC<SignalAlertProps> = ({ rsi }) => {
  if (!rsi) return null;

  let alertType: 'buy' | 'sell' | null = null;
  if (rsi < 30) alertType = 'buy';
  if (rsi > 70) alertType = 'sell';

  if (!alertType) return null;

  return (
    <div className={`rounded-xl p-4 border flex items-start gap-4 mb-6 shadow-lg animate-fade-in-up ${
      alertType === 'buy' 
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
        : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    }`}>
      <div className={`p-2 rounded-lg ${alertType === 'buy' ? 'bg-emerald-500/20' : 'bg-rose-500/20'}`}>
        {ICONS.WARNING}
      </div>
      <div>
        <h3 className="font-bold text-lg mb-1">
          {alertType === 'buy' ? 'Segnale di Ipervenduto Rilevato' : 'Segnale di Ipercomprato Rilevato'}
        </h3>
        <p className="text-sm opacity-90 text-slate-300">
          L'RSI è attualmente <span className="font-bold text-white">{rsi.toFixed(2)}</span>. 
          {alertType === 'buy' 
            ? " Questo suggerisce che l'asset potrebbe essere sottovalutato e un'inversione di prezzo potrebbe verificarsi." 
            : " Questo suggerisce che l'asset potrebbe essere sopravvalutato e un ritracciamento potrebbe essere imminente."}
        </p>
      </div>
    </div>
  );
};

export default SignalAlert;