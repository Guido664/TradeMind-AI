import React from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Legend
} from 'recharts';
import { AnalysisResult } from '../types';

interface OscillatorChartProps {
  data: AnalysisResult['data'];
}

const OscillatorChart: React.FC<OscillatorChartProps> = ({ data }) => {
  const formattedData = data.map(d => ({
    ...d,
    dateShort: d.date.slice(5),
    // Flatten MACD
    macdLine: d.macd?.macdLine,
    signalLine: d.macd?.signalLine,
    histogram: d.macd?.histogram,
    // Flatten RSI
    rsi: d.rsi14
  }));

  return (
    <div className="grid grid-cols-1 gap-6">
      {/* RSI CHART */}
      <div className="w-full h-[200px] bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-xl">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            RSI (Relative Strength Index)
        </h3>
        <ResponsiveContainer width="100%" height="85%">
          <ComposedChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="dateShort" hide />
            <YAxis 
                domain={[0, 100]} 
                ticks={[30, 50, 70]}
                orientation="right"
                stroke="#64748b"
                tick={{fontSize: 10}}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(val: number) => val.toFixed(2)}
                labelStyle={{ display: 'none' }}
            />
            
            {/* Overbought/Oversold Zones */}
            <ReferenceLine y={70} stroke="#f43f5e" strokeDasharray="3 3" label={{ value: '70', position: 'insideLeft', fill: '#f43f5e', fontSize: 10 }} />
            <ReferenceLine y={50} stroke="#94a3b8" strokeDasharray="3 3" strokeOpacity={0.5} label={{ value: '50', position: 'insideLeft', fill: '#94a3b8', fontSize: 10 }} />
            <ReferenceLine y={30} stroke="#10b981" strokeDasharray="3 3" label={{ value: '30', position: 'insideLeft', fill: '#10b981', fontSize: 10 }} />
            
            <Line 
                type="monotone" 
                dataKey="rsi" 
                stroke="#a78bfa" 
                strokeWidth={2} 
                dot={false}
                name="RSI"
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* MACD CHART */}
      <div className="w-full h-[200px] bg-slate-800 rounded-xl border border-slate-700 p-4 shadow-xl">
        <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">
            MACD (Momentum)
        </h3>
        <ResponsiveContainer width="100%" height="85%">
          <ComposedChart data={formattedData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis 
                dataKey="dateShort" 
                stroke="#94a3b8" 
                tick={{fontSize: 10}} 
                minTickGap={30}
            />
            <YAxis 
                orientation="right" 
                stroke="#64748b"
                tick={{fontSize: 10}}
            />
            <Tooltip 
                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#475569', color: '#f8fafc' }}
                itemStyle={{ color: '#e2e8f0' }}
                formatter={(val: number) => val.toFixed(3)}
            />
            <Legend wrapperStyle={{fontSize: '12px'}}/>
            
            <ReferenceLine y={0} stroke="#475569" />

            <Bar dataKey="histogram" name="Hist" fill="#94a3b8" opacity={0.5} barSize={2} />
            <Line type="monotone" dataKey="macdLine" name="MACD" stroke="#38bdf8" strokeWidth={1.5} dot={false} />
            <Line type="monotone" dataKey="signalLine" name="Signal" stroke="#f472b6" strokeWidth={1.5} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default OscillatorChart;