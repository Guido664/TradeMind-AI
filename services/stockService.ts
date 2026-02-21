import { OHLCData, TechnicalIndicators, TimeFrame, AnalysisResult, SearchResult } from '../types';

// --- MATH HELPERS ---

const calculateSMA = (data: number[], window: number): number | null => {
  if (data.length < window) return null;
  const slice = data.slice(data.length - window);
  const sum = slice.reduce((a, b) => a + b, 0);
  return sum / window;
};

const calculateStandardDeviation = (data: number[], window: number): number | null => {
  if (data.length < window) return null;
  const sma = calculateSMA(data, window);
  if (sma === null) return null;
  
  const slice = data.slice(data.length - window);
  const squaredDiffs = slice.map(val => Math.pow(val - sma, 2));
  const variance = squaredDiffs.reduce((a, b) => a + b, 0) / window;
  return Math.sqrt(variance);
};

const calculateRSI = (data: number[], window: number = 14): number | null => {
  if (data.length <= window) return null;

  let gains = 0;
  let losses = 0;

  // First RSI calculation
  for (let i = 1; i <= window; i++) {
    const change = data[i] - data[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / window;
  let avgLoss = losses / window;

  // Smooth subsequent steps
  for (let i = window + 1; i < data.length; i++) {
    const change = data[i] - data[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;
    
    avgGain = (avgGain * (window - 1) + gain) / window;
    avgLoss = (avgLoss * (window - 1) + loss) / window;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateEMA = (data: number[], window: number): number[] => {
  const k = 2 / (window + 1);
  const emaArray: number[] = [];
  
  // Start with SMA for first point
  if (data.length < window) return [];
  
  let initialSum = 0;
  for(let i=0; i<window; i++) initialSum += data[i];
  let prevEma = initialSum / window;
  
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      emaArray.push(NaN); 
      continue;
    }
    if (i === window - 1) {
       emaArray.push(prevEma);
       continue;
    }
    const val = (data[i] * k) + (prevEma * (1 - k));
    emaArray.push(val);
    prevEma = val;
  }
  return emaArray;
};

// --- ROBUST PROXY FETCHER ---

const fetchStrategies = [
    // 1. AllOrigins RAW: Usually the most compatible for large JSON
    async (url: string) => {
        const res = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(`AllOrigins status: ${res.status}`);
        return res.json();
    },
    // 2. CodeTabs: Good alternative
    async (url: string) => {
        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(`CodeTabs status: ${res.status}`);
        return res.json();
    },
    // 3. CorsProxy: Backup
    async (url: string) => {
        const res = await fetch(`https://corsproxy.io/?${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(`CorsProxy status: ${res.status}`);
        return res.json();
    }
];

const fetchWithRetries = async (targetUrl: string): Promise<any> => {
    // Try each strategy in order
    for (const strategy of fetchStrategies) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

            const result = await Promise.race([
                strategy(targetUrl),
                new Promise((_, reject) => {
                    // This promise handles the timeout logic if fetch doesn't support signal or hangs
                    controller.signal.addEventListener('abort', () => reject(new Error("Timeout")));
                })
            ]);
            clearTimeout(timeoutId);
            
            // Validate result structure for Yahoo
            if (result && (result.chart || result.quotes || result.optionChain || result.quoteResponse)) {
                return result;
            }
        } catch (err) {
            // console.warn(`Strategy failed for ${targetUrl}:`, err);
        }
    }
    throw new Error(`All proxies failed for URL: ${targetUrl}`);
};

// --- SEARCH FUNCTIONALITY ---

export const searchSymbols = async (query: string): Promise<SearchResult[]> => {
  const cleanQuery = query.trim();
  const upperQuery = cleanQuery.toUpperCase();
  const results: SearchResult[] = [];

  // 1. Always add Manual Entry FIRST (Fallback Immediate)
  if (cleanQuery.length > 0) {
      results.push({
          symbol: upperQuery,
          shortname: `${upperQuery} (Ricerca Manuale)`,
          exchange: 'Global',
          type: 'EQUITY'
      });
      
      // Suggest .MI if simple ticker
      if (!upperQuery.includes('.') && /^[A-Z0-9]+$/.test(upperQuery)) {
          results.push({
              symbol: `${upperQuery}.MI`,
              shortname: `${upperQuery} (Piazza Affari)`,
              exchange: 'MIL',
              type: 'EQUITY'
          });
      }
  }

  // 2. Try Yahoo Search API (Enhancement)
  try {
      const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanQuery)}&quotesCount=5&newsCount=0&region=IT&lang=it-IT`;
      const data = await fetchWithRetries(url);

      if (data && data.quotes && Array.isArray(data.quotes)) {
          const apiResults = data.quotes
              .filter((q: any) => 
                  q.symbol && 
                  (q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND' || q.quoteType === 'INDEX' || q.quoteType === 'CURRENCY' || q.quoteType === 'CRYPTOCURRENCY')
              )
              .map((q: any) => ({
                  symbol: q.symbol,
                  shortname: q.shortname || q.longname || q.symbol,
                  exchange: q.exchange || 'Unknown',
                  type: q.quoteType
              }));
          
          results.push(...apiResults);
      }
  } catch (e) {
      console.warn("Search API failed, using manual fallback only.");
  }

  // Deduplicate
  const uniqueResults = results.filter((v, i, a) => a.findIndex(t => t.symbol === v.symbol) === i);
  
  return uniqueResults;
};


const fetchYahooData = async (symbol: string, timeframe: TimeFrame): Promise<{data: OHLCData[], usedTicker: string} | null> => {
    let range = '6mo';
    let interval = '1d';

    switch (timeframe) {
      case '1m': range = '1mo'; interval = '1d'; break;
      case '6m': range = '6mo'; interval = '1d'; break;
      case '1y': range = '1y'; interval = '1d'; break;
      case '5y': range = '5y'; interval = '1wk'; break;
    }

    const tryFetch = async (tickerToTry: string) => {
        try {
            // Simplified URL: Removed events and other params to reduce encoding errors
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?range=${range}&interval=${interval}&includePrePost=false`;
            
            const data = await fetchWithRetries(url);
            const result = data.chart?.result?.[0];

            if (result && result.timestamp && result.indicators?.quote?.[0]) {
                const timestamps = result.timestamp;
                const quote = result.indicators.quote[0];
                
                if (!quote.close || quote.close.length === 0) return null;
                
                const ohlc: OHLCData[] = [];
                for (let i = 0; i < timestamps.length; i++) {
                    // Strict null check
                    if (quote.close[i] == null || quote.open[i] == null) continue;
                    
                    ohlc.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        open: quote.open[i],
                        high: quote.high[i],
                        low: quote.low[i],
                        close: quote.close[i],
                        volume: quote.volume[i] || 0
                    });
                }
                
                if (ohlc.length > 5) { // Ensure we have enough data points
                    return { data: ohlc, usedTicker: tickerToTry };
                }
            }
        } catch (e) {
            // fail silently
        }
        return null;
    }

    // 1. Try Exact Match
    let result = await tryFetch(symbol);
    if (result) return result;

    // 2. Retry with common suffixes
    if (!symbol.includes('.')) {
        const suffixes = ['.MI', '.US', '.L', '.DE', '.PA'];
        for (const suffix of suffixes) {
             result = await tryFetch(`${symbol}${suffix}`);
             if (result) return result;
        }
    }

    return null;
}

const generateSimulatedHistory = (ticker: string, timeframe: TimeFrame): OHLCData[] => {
  const now = new Date();
  const dataPoints = timeframe === '1m' ? 30 : timeframe === '6m' ? 180 : timeframe === '1y' ? 365 : 365 * 5;
  const startPrice = Math.random() * 100 + 50; 
  
  let currentPrice = startPrice;
  const history: OHLCData[] = [];

  for (let i = 0; i < dataPoints; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (dataPoints - i));
    
    // Random walk with drift
    const volatility = 0.02; 
    const change = currentPrice * (Math.random() * volatility * 2 - volatility);
    const open = currentPrice;
    const close = currentPrice + change;
    const high = Math.max(open, close) + Math.random() * (currentPrice * 0.01);
    const low = Math.min(open, close) - Math.random() * (currentPrice * 0.01);
    const volume = Math.floor(Math.random() * 1000000) + 500000;

    history.push({
      date: date.toISOString().split('T')[0],
      open, high, low, close, volume
    });
    currentPrice = close;
  }
  return history;
}

// --- FMP FETCHER ---

const fetchFMPData = async (symbol: string, timeframe: TimeFrame): Promise<{data: OHLCData[], usedTicker: string} | null> => {
    const apiKey = process.env.FMP_API_KEY;
    if (!apiKey) return null;

    // FMP Free tier supports daily data well. Intraday is often restricted.
    // We will use daily data for 6m/1y/5y and try 1min/5min for 1m if available, else fallback to daily.
    
    // Map timeframe to FMP "timeseries" logic roughly
    // For free tier, 'historical-price-full' gives daily data up to 5 years.
    
    try {
        const response = await fetch(`https://financialmodelingprep.com/api/v3/historical-price-full/${symbol}?apikey=${apiKey}`);
        const json = await response.json();

        if (json && json.historical && Array.isArray(json.historical) && json.historical.length > 0) {
             // FMP returns data sorted by date descending (newest first)
             // We need ascending for our charts
             const sortedData = json.historical.reverse();
             
             // Filter based on timeframe if needed, but FMP returns last 5 years usually
             let filteredData = sortedData;
             const now = new Date();
             let cutoffDate = new Date();

             switch (timeframe) {
                case '1m': cutoffDate.setMonth(now.getMonth() - 1); break;
                case '6m': cutoffDate.setMonth(now.getMonth() - 6); break;
                case '1y': cutoffDate.setFullYear(now.getFullYear() - 1); break;
                case '5y': cutoffDate.setFullYear(now.getFullYear() - 5); break;
             }

             filteredData = sortedData.filter((d: any) => new Date(d.date) >= cutoffDate);

             const ohlc: OHLCData[] = filteredData.map((d: any) => ({
                 date: d.date,
                 open: d.open,
                 high: d.high,
                 low: d.low,
                 close: d.close,
                 volume: d.volume
             }));

             if (ohlc.length > 5) {
                 return { data: ohlc, usedTicker: symbol };
             }
        }
    } catch (e) {
        console.warn("FMP API failed:", e);
    }
    return null;
}

// --- MAIN ANALYSIS FUNCTION ---

export const generateMarketData = async (ticker: string, timeframe: TimeFrame): Promise<AnalysisResult> => {
  // 1. Try Yahoo Finance (via Proxy)
  let fetchResult = await fetchYahooData(ticker, timeframe);
  
  // 2. If Yahoo fails, try Financial Modeling Prep (FMP)
  if (!fetchResult) {
      console.log(`Yahoo failed for ${ticker}, trying FMP...`);
      fetchResult = await fetchFMPData(ticker, timeframe);
  }

  let isSimulated = false;
  let usedTicker = ticker;
  let history: OHLCData[];

  if (fetchResult) {
    history = fetchResult.data;
    usedTicker = fetchResult.usedTicker;
  } else {
    // 3. FAILED to fetch real data
    console.warn(`Failed to fetch real data for ${ticker}, switching to simulation.`);
    history = generateSimulatedHistory(ticker, timeframe);
    isSimulated = true;
  }

  const prices = history.map(h => h.close);

  // Calculate Indicators
  const fullIndicators = history.map((_, idx) => {
    const slice = prices.slice(0, idx + 1);
    
    const sma20 = calculateSMA(slice, 20);
    const sma50 = calculateSMA(slice, 50);
    const rsi14 = calculateRSI(slice, 14);
    
    const stdDev = calculateStandardDeviation(slice, 20);
    const bollinger = (sma20 !== null && stdDev !== null) ? {
      upper: sma20 + (stdDev * 2),
      middle: sma20,
      lower: sma20 - (stdDev * 2)
    } : null;

    return {
      sma20,
      sma50,
      rsi14,
      bollinger,
      macd: null as TechnicalIndicators['macd']
    };
  });

  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macdLine = prices.map((_, i) => (isNaN(ema12[i]) || isNaN(ema26[i])) ? NaN : ema12[i] - ema26[i]);
  
  const validMacdIndices: number[] = [];
  const validMacdValues: number[] = [];
  
  macdLine.forEach((val, idx) => {
    if(!isNaN(val)) {
        validMacdIndices.push(idx);
        validMacdValues.push(val);
    }
  });

  const signalLineValues = calculateEMA(validMacdValues, 9);
  
  fullIndicators.forEach((ind, idx) => {
    const val = macdLine[idx];
    if (isNaN(val)) {
      ind.macd = null;
      return;
    }
    const signalIndexInValid = validMacdIndices.indexOf(idx);
    if (signalIndexInValid === -1 || isNaN(signalLineValues[signalIndexInValid])) {
        ind.macd = null;
        return;
    }
    const signal = signalLineValues[signalIndexInValid];
    ind.macd = {
        macdLine: val,
        signalLine: signal,
        histogram: val - signal
    };
  });

  const mergedData = history.map((h, i) => ({
    ...h,
    ...fullIndicators[i]
  }));

  const lastPrice = prices[prices.length - 1];
  const prevPrice = prices[prices.length - 2] || lastPrice;
  const changePercent = ((lastPrice - prevPrice) / prevPrice) * 100;

  return {
    ticker: isSimulated ? ticker.toUpperCase() : usedTicker,
    currentPrice: lastPrice,
    changePercent,
    data: mergedData,
    latestIndicators: fullIndicators[fullIndicators.length - 1],
    isSimulated
  };
};