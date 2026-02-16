import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AreaCount } from '../../../types/analytics';

interface MemberAreasChartProps {
  data: AreaCount[];
}

const COLORS = ['#ff611a', '#2A3577', '#ed8008', '#5063B8', '#8899a6', '#3D4A8F'];

export function MemberAreasChart({ data }: MemberAreasChartProps) {
  return (
    <div className="bg-[#1a2730] border border-[#2a3840] rounded-lg p-6">
      <h3 className="text-[#8899a6] text-sm font-medium mb-4 uppercase tracking-wider">
        Member Areas
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ area, percent }) => `${area}: ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="count"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              backgroundColor: '#0f1419',
              border: '1px solid #2a3840',
              borderRadius: '8px',
              color: '#fff',
            }}
          />
          <Legend
            wrapperStyle={{
              fontSize: '12px',
              color: '#8899a6',
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
