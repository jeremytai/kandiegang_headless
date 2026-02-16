import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { GrowthDataPoint } from '../../../types/analytics';

interface MemberGrowthChartProps {
  data: GrowthDataPoint[];
}

export function MemberGrowthChart({ data }: MemberGrowthChartProps) {
  return (
    <div className="bg-[#1a2730] border border-[#2a3840] rounded-lg p-6">
      <h3 className="text-[#8899a6] text-sm font-medium mb-4 uppercase tracking-wider">
        Member Growth
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#2A3577" stopOpacity={0.8}/>
              <stop offset="95%" stopColor="#2A3577" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3840" />
          <XAxis
            dataKey="month"
            stroke="#8899a6"
            style={{ fontSize: '12px' }}
          />
          <YAxis
            stroke="#8899a6"
            style={{ fontSize: '12px' }}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f1419',
              border: '1px solid #2a3840',
              borderRadius: '8px',
              color: '#fff'
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#2A3577"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorGrowth)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
