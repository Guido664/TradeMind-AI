import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { AnalysisResult } from '../types';

interface StockChartProps {
  data: AnalysisResult['data'];
}

const StockChart: React.FC<StockChartProps> = ({ data }) => {
  const formattedData = data.map(d => ({
    ...d,
    dateShort: d.date.slice(5), // "MM-DD"
    bollingerUpper: d.bollinger?.upper,
    bollingerLower: d.bollinger?.lower,
    bollingerMiddle: d.bollinger?.middle,
  }));

  return (
    <div className="w-full h-[450px] bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-xl">
      <h3 className="text-slate-200 font-semibold mb-4 flex items-center gap-2">
        Azione del Prezzo, Bande & Volumi
      </h3>
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart data={formattedData}>
          <defs>
            <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#818cf8" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#818cf8" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
          
          <XAxis 
            dataKey="dateShort" 
            stroke="#94a3b8" 
            tick={{fontSize: 12}} 
            tickMargin={10}
            minTickGap={30}
          />
          
          {/* Main Y Axis for Price (Right side) */}
          <YAxis 
            yAxisId="price"
            orientation="right"
            domain={['auto', 'auto']} 
            stroke="#94a3b8" 
            tick={{fontSize: 12}} 
            tickFormatter={(val) => `$${val.toFixed(0)}`}
            width={60}
          />

          {/* Hidden Y Axis for Volume (Left side) 
              domain={['0', 'dataMax * 4']} pushes the bars to the bottom 1/4 of the chart 
          */}
          <YAxis 
            yAxisId="volume"
            hide
            domain={[0, 'dataMax * 4']}
          />

          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
            itemStyle={{ color: '#e2e8f0' }}
            labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
            formatter={(value: number, name: string) => {
              if (name === 'Volume') return [new Intl.NumberFormat('en-US', { notation: "compact" }).format(value), name];
              return [value.toFixed(2), name];
            }}
          />
          <Legend wrapperStyle={{paddingTop: '10px'}}/>
          
          {/* Volume Bars */}
          <Bar 
            yAxisId="volume"
            dataKey="volume" 
            name="Volume" 
            fill="#94a3b8" 
            opacity={0.3} 
            barSize={4}
          />

          {/* Bollinger Bands */}
          <Line 
            yAxisId="price"
            name="Banda Sup." 
            type="monotone" 
            dataKey="bollingerUpper" 
            stroke="#0ea5e9" 
            strokeDasharray="5 5" 
            strokeWidth={1} 
            dot={false} 
            activeDot={false}
          />
          <Line 
            yAxisId="price"
            name="Banda Inf." 
            type="monotone" 
            dataKey="bollingerLower" 
            stroke="#0ea5e9" 
            strokeDasharray="5 5" 
            strokeWidth={1} 
            dot={false}
            activeDot={false}
          />

          {/* Price Area */}
          <Area 
            yAxisId="price"
            type="monotone" 
            dataKey="close" 
            stroke="#818cf8" 
            strokeWidth={2}
            fillOpacity={1} 
            fill="url(#colorPrice)" 
            name="Prezzo"
          />
          
          {/* SMA 50 */}
          <Line 
            yAxisId="price"
            name="SMA 50" 
            type="monotone" 
            dataKey="sma50" 
            stroke="#f59e0b" 
            strokeWidth={1.5} 
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default StockChart;