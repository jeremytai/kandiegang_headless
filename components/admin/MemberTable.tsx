import React, { useState, useMemo } from 'react';
import { MemberAnalytics } from '../../types/analytics';

interface MemberTableProps {
  members: MemberAnalytics[];
}

type SortColumn = keyof MemberAnalytics | null;
type SortDirection = 'asc' | 'desc';

export function MemberTable({ members }: MemberTableProps) {
  const [sortColumn, setSortColumn] = useState<SortColumn>('lifetime_value');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSort = (column: SortColumn) => {
    if (column === sortColumn) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const filteredAndSortedMembers = useMemo(() => {
    let filtered = members.filter(member => {
      if (!searchQuery) return true;
      const query = searchQuery.toLowerCase();
      return (
        member.display_name?.toLowerCase().includes(query) ||
        member.email?.toLowerCase().includes(query)
      );
    });

    if (sortColumn) {
      filtered.sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        if (typeof aVal === 'string' && typeof bVal === 'string') {
          return sortDirection === 'asc'
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return 0;
      });
    }

    return filtered;
  }, [members, searchQuery, sortColumn, sortDirection]);

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (column !== sortColumn) return null;
    return (
      <span className="ml-1 text-[#ff611a]">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  return (
    <div className="bg-[#1a2730] border border-[#2a3840] rounded-lg p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-[#8899a6] text-sm font-medium uppercase tracking-wider">
          Members
        </h3>
        <input
          type="text"
          placeholder="Search members..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-[#0f1419] border border-[#2a3840] text-white px-4 py-2 rounded-lg text-sm focus:outline-none focus:border-[#ff611a] transition-colors"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#2a3840]">
              <th
                className="text-left py-3 px-4 text-[#8899a6] font-medium cursor-pointer hover:text-[#ff611a] transition-colors"
                onClick={() => handleSort('display_name')}
              >
                Name <SortIcon column="display_name" />
              </th>
              <th
                className="text-left py-3 px-4 text-[#8899a6] font-medium cursor-pointer hover:text-[#ff611a] transition-colors"
                onClick={() => handleSort('email')}
              >
                Email <SortIcon column="email" />
              </th>
              <th
                className="text-right py-3 px-4 text-[#8899a6] font-medium cursor-pointer hover:text-[#ff611a] transition-colors"
                onClick={() => handleSort('lifetime_value')}
              >
                LTV <SortIcon column="lifetime_value" />
              </th>
              <th
                className="text-right py-3 px-4 text-[#8899a6] font-medium cursor-pointer hover:text-[#ff611a] transition-colors"
                onClick={() => handleSort('order_count')}
              >
                Orders <SortIcon column="order_count" />
              </th>
              <th className="text-left py-3 px-4 text-[#8899a6] font-medium">
                Status
              </th>
              <th
                className="text-left py-3 px-4 text-[#8899a6] font-medium cursor-pointer hover:text-[#ff611a] transition-colors"
                onClick={() => handleSort('last_order_date')}
              >
                Last Order <SortIcon column="last_order_date" />
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredAndSortedMembers.map((member) => (
              <tr
                key={member.id}
                className="border-b border-[#2a3840] hover:bg-[#0f1419] transition-colors"
              >
                <td className="py-3 px-4 text-white">
                  {member.display_name || 'N/A'}
                </td>
                <td className="py-3 px-4 text-[#8899a6]">
                  {member.email}
                </td>
                <td className="py-3 px-4 text-white text-right font-mono">
                  €{(member.lifetime_value || 0).toFixed(2)}
                </td>
                <td className="py-3 px-4 text-white text-right">
                  {member.order_count || 0}
                </td>
                <td className="py-3 px-4">
                  {member.stripe_subscription_status === 'active' && (
                    <span className="inline-block px-2 py-1 bg-[#10B981] bg-opacity-20 text-[#10B981] rounded text-xs font-medium">
                      Active
                    </span>
                  )}
                  {member.stripe_subscription_status === 'trialing' && (
                    <span className="inline-block px-2 py-1 bg-[#ff611a] bg-opacity-20 text-[#ff611a] rounded text-xs font-medium">
                      Trial
                    </span>
                  )}
                  {member.stripe_subscription_status === 'canceled' && (
                    <span className="inline-block px-2 py-1 bg-[#8899a6] bg-opacity-20 text-[#8899a6] rounded text-xs font-medium">
                      Canceled
                    </span>
                  )}
                  {!member.stripe_subscription_status && (
                    <span className="inline-block px-2 py-1 bg-[#8899a6] bg-opacity-20 text-[#8899a6] rounded text-xs font-medium">
                      No Sub
                    </span>
                  )}
                </td>
                <td className="py-3 px-4 text-[#8899a6]">
                  {member.last_order_date
                    ? new Date(member.last_order_date).toLocaleDateString()
                    : 'N/A'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredAndSortedMembers.length === 0 && (
          <div className="text-center py-8 text-[#8899a6]">
            No members found
          </div>
        )}
      </div>

      <div className="mt-4 text-[#8899a6] text-sm">
        Showing {filteredAndSortedMembers.length} of {members.length} members
      </div>
    </div>
  );
}
