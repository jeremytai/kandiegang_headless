import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import { GrowthDataPoint } from '../../../types/analytics';

interface MemberGrowthChartProps {
  data: GrowthDataPoint[];
}

export function MemberGrowthChart({ data }: MemberGrowthChartProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <h3 className="text-neutral-400 text-xs font-medium mb-4 uppercase tracking-[0.15em]">
        Member Growth
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ff611a" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#ff611a" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
          <XAxis dataKey="month" stroke="#a3a3a3" style={{ fontSize: '12px' }} />
          <YAxis stroke="#a3a3a3" style={{ fontSize: '12px' }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              color: '#171717',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke="#ff611a"
            strokeWidth={2}
            fillOpacity={1}
            fill="url(#colorGrowth)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
