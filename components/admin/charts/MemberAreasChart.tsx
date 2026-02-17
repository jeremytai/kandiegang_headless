import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AreaCount } from '../../../types/analytics';

interface MemberAreasChartProps {
  data: AreaCount[];
}

const COLORS = ['#ff611a', '#171717', '#a3a3a3', '#d4d4d4', '#737373', '#525252'];

export function MemberAreasChart({ data }: MemberAreasChartProps) {
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <h3 className="text-neutral-400 text-xs font-medium mb-4 uppercase tracking-[0.15em]">
        Member Areas
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }: { name?: string; percent?: number }) =>
              `${name ?? ''}: ${((percent ?? 0) * 100).toFixed(0)}%`
            }
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((_entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#fff',
              border: '1px solid #e5e5e5',
              borderRadius: '8px',
              color: '#171717',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              color: '#737373',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
