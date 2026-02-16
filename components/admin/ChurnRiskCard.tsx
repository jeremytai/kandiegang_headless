import React from 'react';
import { MemberAnalytics } from '../../types/analytics';

interface ChurnRiskCardProps {
  members: MemberAnalytics[];
}

export function ChurnRiskCard({ members }: ChurnRiskCardProps) {
  const atRiskMembers = members
    .filter((m) => m.is_at_risk)
    .sort((a, b) => (a.days_until_expiration || 0) - (b.days_until_expiration || 0))
    .slice(0, 5); // Show top 5 at-risk members

  return (
    <div className="bg-[#1a2730] border border-[#2a3840] rounded-lg p-6">
      <h3 className="text-[#8899a6] text-sm font-medium mb-4 uppercase tracking-wider">
        Churn Risk (Expiring Within 30 Days)
      </h3>

      {atRiskMembers.length === 0 ? (
        <div className="text-center py-8">
          <div className="text-4xl font-light text-[#10B981] mb-2">✓</div>
          <div className="text-white text-sm">No members at risk</div>
        </div>
      ) : (
        <div className="space-y-3">
          {atRiskMembers.map((member) => (
            <div
              key={member.id}
              className="flex items-center justify-between p-3 bg-[#0f1419] rounded-lg border border-[#ef4444]/20"
            >
              <div className="flex-1 min-w-0">
                <div className="text-white text-sm font-medium truncate">
                  {member.display_name || member.email}
                </div>
                <div className="text-[#8899a6] text-xs truncate">{member.email}</div>
              </div>
              <div className="flex items-center gap-3 ml-4">
                <div className="text-right">
                  <div className="text-[#ef4444] text-sm font-bold">
                    {member.days_until_expiration} days
                  </div>
                  <div className="text-[#8899a6] text-xs">
                    €{(member.lifetime_value || 0).toFixed(0)} LTV
                  </div>
                </div>
              </div>
            </div>
          ))}

          {members.filter((m) => m.is_at_risk).length > 5 && (
            <div className="text-center text-[#8899a6] text-xs pt-2">
              + {members.filter((m) => m.is_at_risk).length - 5} more at risk
            </div>
          )}
        </div>
      )}
    </div>
  );
}
