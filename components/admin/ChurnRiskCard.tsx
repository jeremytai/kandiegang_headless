import React from 'react';
import { MemberAnalytics } from '../../types/analytics';

interface ChurnRiskCardProps {
  members: MemberAnalytics[];
}

export function ChurnRiskCard({ members }: ChurnRiskCardProps) {
  const atRiskMembers = members
    .filter((m) => m.is_at_risk)
    .sort((a, b) => (a.days_until_expiration || 0) - (b.days_until_expiration || 0))
    .slice(0, 5);

  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-6">
      <h3 className="text-neutral-400 text-xs font-medium mb-4 uppercase tracking-[0.15em]">
        Churn Risk (Expiring Within 30 Days)
      </h3>

      {atRiskMembers.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl font-light text-emerald-500 mb-2">✓</div>
          <div className="text-neutral-900 text-sm">No members at risk</div>
        </div>
      ) : (
        <div className="space-y-3">
          {atRiskMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-[#fafafa] rounded-lg border border-red-100"
            >
              <div className="flex-1 min-w-0">
                <div className="text-neutral-900 text-sm font-medium truncate">
                  {member.display_name || member.email}
                </div>
                <div className="text-neutral-400 text-xs truncate">{member.email}</div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <div className="text-red-500 text-sm font-bold">
                    {member.days_until_expiration} days
                  </div>
                  <div className="text-neutral-400 text-xs">
                    €{(member.lifetime_value || 0).toFixed(0)} LTV
                  </div>
                </div>
              </div>
            </div>
          ))}

          {members.filter((m) => m.is_at_risk).length > 5 && (
            <div className="text-center text-neutral-400 text-xs pt-2">
              + {members.filter((m) => m.is_at_risk).length - 5} more at risk
            </div>
          )}
        </div>
      )}
    </div>
  );
}
