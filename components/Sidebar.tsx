import React, { useState } from 'react';
import { TimeFrame, SearchResult } from '../types';
import { ICONS } from '../constants';
import { searchSymbols } from '../services/stockService';

interface SidebarProps {
  onAnalyze: (ticker: string, timeframe: TimeFrame) => void;
  isLoading: boolean;
  isSimulated?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ onAnalyze, isLoading, isSimulated }) => {
  const [tickerInput, setTickerInput] = useState('AAPL');
  const [timeframe, setTimeframe] = useState<TimeFrame>('6m');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Handle the initial search request
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tickerInput.trim()) return;

    setIsSearching(true);
    setSearchResults([]);
    setShowResults(true);

    try {
      const results = await searchSymbols(tickerInput);
      setSearchResults(results);
      
      // Automatic selection logic if only 1 exact match
      // We check if the symbol is an exact match to the input
      if (results.length === 1) {
          handleSelectResult(results[0]);
      }
    } catch (error) {
      console.error("Search failed", error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectResult = (result: SearchResult) => {
      setTickerInput(result.symbol); // Update input to show selected
      setShowResults(false); // Hide list
      onAnalyze(result.symbol, timeframe); // Trigger analysis
  };

  const timeframes: TimeFrame[] = ['1m', '6m', '1y', '5y'];

  return (
    <aside className="w-full md:w-80 bg-slate-800 border-r border-slate-700 flex flex-col h-auto md:h-screen p-6 sticky top-0 z-10">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
          TM
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">TradeMind AI</h1>
      </div>

      <div className="space-y-6">
        <div>
          <label className="block text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">
            Cerca Titolo o Azienda
          </label>
          <div className="relative">
            <form onSubmit={handleSearchSubmit}>
                <input
                type="text"
                value={tickerInput}
                onChange={(e) => {
                    // Remove forced uppercase to allow natural typing for names (e.g. "Ferrari")
                    setTickerInput(e.target.value);
                }}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 pl-10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-semibold tracking-wide"
                placeholder="es. Google, Ferrari, US02..."
                />
                <button 
                    type="submit" 
                    className="absolute right-2 top-2 p-1.5 bg-slate-800 text-slate-300 hover:text-white rounded-md border border-slate-600 hover:border-slate-500 transition-all"
                >
                    {ICONS.SEARCH}
                </button>
            </form>
            <div className="absolute left-3 top-3.5 text-slate-500 pointer-events-none">
              {ICONS.SEARCH}
            </div>
          </div>
        </div>

        {/* Search Results List */}
        {showResults && (
            <div className="bg-slate-900 border border-slate-700 rounded-xl overflow-hidden shadow-2xl animate-fade-in-down max-h-[300px] overflow-y-auto">
                {isSearching ? (
                    <div className="p-4 text-center text-slate-400 text-sm">Ricerca in corso...</div>
                ) : searchResults.length > 0 ? (
                    <div>
                        <div className="px-4 py-2 bg-slate-800 text-xs text-slate-400 font-bold uppercase tracking-wider flex justify-between">
                            <span>Simbolo</span>
                            <span>Borsa</span>
                        </div>
                        {searchResults.map((res, idx) => (
                            <button
                                key={`${res.symbol}-${idx}`}
                                onClick={() => handleSelectResult(res)}
                                className="w-full text-left px-4 py-3 border-b border-slate-800 hover:bg-indigo-900/20 hover:border-indigo-500/30 transition-all group last:border-0"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-white group-hover:text-indigo-400 transition-colors">
                                        {res.symbol}
                                    </span>
                                    <span className="text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-300 border border-slate-700">
                                        {res.exchange}
                                    </span>
                                </div>
                                <div className="text-xs text-slate-400 truncate pr-2">
                                    {res.shortname}
                                </div>
                            </button>
                        ))}
                    </div>
                ) : (
                    <div className="p-4 text-center text-slate-400 text-sm">
                        Nessun risultato trovato. <br/>
                        <button 
                            onClick={() => {
                                setShowResults(false);
                                onAnalyze(tickerInput, timeframe);
                            }}
                            className="mt-2 text-indigo-400 hover:underline"
                        >
                            Forza analisi "{tickerInput}"
                        </button>
                    </div>
                )}
            </div>
        )}

        <div>
          <label className="block text-slate-400 text-sm font-medium mb-2 uppercase tracking-wider">
            Periodo Temporale
          </label>
          <div className="grid grid-cols-4 gap-2">
            {timeframes.map((tf) => (
              <button
                key={tf}
                type="button"
                onClick={() => {
                    setTimeframe(tf);
                    // If we have a valid ticker and are not searching, update immediately
                    if (!showResults && tickerInput) {
                        onAnalyze(tickerInput, tf);
                    }
                }}
                className={`py-2 px-1 rounded-md text-sm font-medium transition-all ${
                  timeframe === tf
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                    : 'bg-slate-700 text-slate-400 hover:bg-slate-600 hover:text-slate-200'
                }`}
              >
                {tf.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-auto pt-8 border-t border-slate-700 text-xs text-slate-500">
        <p className="mb-2">Basato su Gemini 3 Flash</p>
        <p>
          {isSimulated === undefined 
            ? "Cerca un Ticker o ISIN per iniziare." 
            : isSimulated 
              ? "Dati simulati (Fallback attivo)." 
              : "Dati reali (Yahoo Finance)."}
        </p>
      </div>
    </aside>
  );
};

export default Sidebar;