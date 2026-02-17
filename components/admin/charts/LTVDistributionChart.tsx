import React from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { LTVBucket } from '../../../types/analytics';

interface LTVDistributionChartProps {
  data: LTVBucket[];
}

export function LTVDistributionChart({ data }: LTVDistributionChartProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <h3 className="text-neutral-400 text-xs font-medium mb-4 uppercase tracking-[0.15em]">
        Lifetime Value Distribution
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="range" stroke="#a3a3a3" style={{ fontSize: '12px' }} />
          <YAxis stroke="#a3a3a3" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              color: '#171717',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
            cursor={{ fill: 'rgba(255, 97, 26, 0.06)' }}
          />
          <Bar dataKey="count" fill="#ff611a" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
