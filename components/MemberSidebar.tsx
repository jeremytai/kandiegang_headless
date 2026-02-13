import React from "react";
import { useAuth } from "../context/AuthContext";

export const MemberSidebar: React.FC = () => {
  const { user, profile } = useAuth();
  const cyclingMember = Array.isArray(profile?.membership_plans)
    ? profile.membership_plans.some((p) =>
        p.toLowerCase().includes("cycling") &&
        (p.toLowerCase().includes("member") || p.toLowerCase().includes("membership"))
      )
    : false;
  const guide = Boolean(profile?.is_guide) ||
    (Array.isArray(profile?.membership_plans) && profile.membership_plans.some((p) => p.toLowerCase().includes("guide")));

  return (
    <aside className="w-full flex flex-col items-center p-4">
      <h2 className="text-lg font-semibold tracking-wide uppercase text-slate-500 dark:text-slate-400 mb-1">Account</h2>
      <div className="text-base text-slate-700 dark:text-slate-200 mb-2">
        Logged in as <span className="font-bold">{profile?.display_name || user?.email || 'User'}</span>
      </div>
      {(cyclingMember || guide) && (
        <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-4 py-3 mb-2 w-full max-w-xs flex flex-col items-center">
          <div className="text-sm text-slate-700 dark:text-slate-200 mb-1">
            Member since{' '}
            <span className="font-medium">{profile?.member_since ? profile.member_since : '—'}</span>
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400">
            — &middot; synced from{' '}
            <span className="font-medium">{profile?.membership_source || 'unknown'}</span>
          </div>
        </div>
      )}
    </aside>
  );
};
