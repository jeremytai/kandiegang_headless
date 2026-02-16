import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LTVBucket } from '../../../types/analytics';

interface LTVDistributionChartProps {
  data: LTVBucket[];
}

export function LTVDistributionChart({ data }: LTVDistributionChartProps) {
  return (
    <div className="bg-[#1a2730] border border-[#2a3840] rounded-lg p-6">
      <h3 className="text-[#8899a6] text-sm font-medium mb-4 uppercase tracking-wider">
        Lifetime Value Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a3840" />
          <XAxis
            dataKey="range"
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
            cursor={{ fill: 'rgba(255, 97, 26, 0.1)' }}
          />
          <Bar
            dataKey="count"
            fill="#ff611a"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
