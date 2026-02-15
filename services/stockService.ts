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

// Define different strategies for fetching to avoid bottlenecks
const fetchStrategies = [
    // Strategy 1: AllOrigins JSON Wrapper (Highest Reliability)
    // We request a wrapped JSON response. This bypasses many CORS headers issues because we get a 200 OK from AllOrigins
    // and the actual data is inside the "contents" string.
    async (url: string) => {
        const encodedUrl = encodeURIComponent(url);
        const res = await fetch(`https://api.allorigins.win/get?url=${encodedUrl}`);
        if (!res.ok) throw new Error(`AllOrigins status: ${res.status}`);
        const data = await res.json();
        // AllOrigins returns { contents: "string_of_json", status: ... }
        if (!data.contents) throw new Error("AllOrigins returned no content");
        return JSON.parse(data.contents);
    },

    // Strategy 2: CodeTabs (Fast, standard proxy)
    async (url: string) => {
        const res = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`);
        if (!res.ok) throw new Error(`CodeTabs status: ${res.status}`);
        return res.json();
    },

    // Strategy 3: CorsProxy.io (Backup)
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
            // Add a timeout to each request so we don't hang forever on a bad proxy
            const result = await Promise.race([
                strategy(targetUrl),
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), 4000))
            ]);
            
            // If we got here, it worked. Validate basic JSON structure for Yahoo
            if (result && (result.chart || result.quotes || result.optionChain)) {
                return result;
            }
        } catch (err) {
            // console.warn(`Strategy failed for ${targetUrl}:`, err);
            // Continue to next strategy
        }
    }
    throw new Error(`All proxies failed for URL: ${targetUrl}`);
};

// --- SEARCH FUNCTIONALITY ---

export const searchSymbols = async (query: string): Promise<SearchResult[]> => {
  const cleanQuery = query.trim();
  const upperQuery = cleanQuery.toUpperCase();
  const results: SearchResult[] = [];

  // 1. Directa Logic Injection
  if (/^1[A-Z0-9]+$/.test(upperQuery)) {
      const stripped = upperQuery.substring(1);
      results.push({
          symbol: `${stripped}.MI`,
          shortname: `${stripped} (Directa/GEM)`,
          exchange: 'Borsa Italiana',
          type: 'EQUITY'
      });
  }

  // 2. Yahoo Search API
  if (cleanQuery.length > 0) {
      try {
          const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(cleanQuery)}&quotesCount=6&newsCount=0&region=IT&lang=it-IT`;
          const data = await fetchWithRetries(url);

          if (data && data.quotes && Array.isArray(data.quotes)) {
              const apiResults = data.quotes
                  .filter((q: any) => 
                      q.symbol && 
                      (q.quoteType === 'EQUITY' || q.quoteType === 'ETF' || q.quoteType === 'MUTUALFUND' || q.quoteType === 'INDEX' || q.quoteType === 'CURRENCY')
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
          console.warn("Search API failed, falling back to manual entry.");
      }
  }

  // 3. FALLBACK "FORCE RESULT" - GUARANTEED
  // Always include the exact user input if it's not already in the list.
  const hasExactMatch = results.some(r => r.symbol === upperQuery);
  
  if (!hasExactMatch && cleanQuery.length > 0) {
    // Add exact input as top result
    results.unshift({
        symbol: upperQuery,
        shortname: `${upperQuery} (Input Manuale)`,
        exchange: 'Global',
        type: 'EQUITY'
    });
    
    // Smart suggestions for common missing suffixes
    if (!upperQuery.includes('.') && /^[A-Z0-9]+$/.test(upperQuery)) {
        if (!results.some(r => r.symbol === `${upperQuery}.MI`)) {
            results.push({
                symbol: `${upperQuery}.MI`,
                shortname: `${upperQuery} (Piazza Affari)`,
                exchange: 'MIL',
                type: 'EQUITY'
            });
        }
    }
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
            // Using v8 chart API
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${tickerToTry}?range=${range}&interval=${interval}&includePrePost=false&events=div%7Csplit`;
            const data = await fetchWithRetries(url);
            
            const result = data.chart?.result?.[0];

            if (result && result.timestamp && result.indicators?.quote?.[0]) {
                const timestamps = result.timestamp;
                const quote = result.indicators.quote[0];
                
                if (!quote.close || quote.close.length === 0) return null;
                
                const ohlc: OHLCData[] = [];
                for (let i = 0; i < timestamps.length; i++) {
                    if (quote.close[i] === null || quote.open[i] === null) continue;
                    
                    ohlc.push({
                        date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
                        open: quote.open[i],
                        high: quote.high[i],
                        low: quote.low[i],
                        close: quote.close[i],
                        volume: quote.volume[i] || 0
                    });
                }
                
                if (ohlc.length > 0) {
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

    // 2. Retry with common suffixes if plain ticker failed
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

// --- MAIN ANALYSIS FUNCTION ---

export const generateMarketData = async (ticker: string, timeframe: TimeFrame): Promise<AnalysisResult> => {
  let fetchResult = await fetchYahooData(ticker, timeframe);
  
  let isSimulated = false;
  let usedTicker = ticker;
  let history: OHLCData[];

  if (fetchResult) {
    history = fetchResult.data;
    usedTicker = fetchResult.usedTicker;
  } else {
    // FAILED to fetch real data
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