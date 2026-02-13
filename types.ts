
export type TimeFrame = '1m' | '6m' | '1y' | '5y';

export interface OHLCData {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalIndicators {
  sma20: number | null;
  sma50: number | null;
  rsi14: number | null;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  } | null;
  bollinger: {
    upper: number;
    middle: number;
    lower: number;
  } | null;
}

export interface AnalysisResult {
  ticker: string;
  currentPrice: number;
  changePercent: number;
  data: (OHLCData & TechnicalIndicators)[];
  latestIndicators: TechnicalIndicators;
  isSimulated: boolean;
}

export interface GeminiInsight {
  summary: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  recommendation: string;
}

export interface SearchResult {
  symbol: string;
  shortname: string;
  exchange: string;
  type: string;
}
