import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { EventParticipationTable } from '../../components/admin/EventParticipationTable';

export const GuideAnalyticsPage: React.FC = () => {
  const { user, profile } = useAuth();

  const hasAccess = Boolean(user && profile?.is_guide);

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-[#fafafa] pt-32 md:pt-40 pb-40">
        <div className="max-w-7xl mx-auto px-6">
          <h1 className="text-3xl font-light text-neutral-900 mb-4">Event Participation</h1>
          <p className="text-neutral-500 text-sm">
            Please sign in with a guide account to view event participation.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa] pt-32 md:pt-40 pb-40">
      <div className="max-w-7xl mx-auto px-6">
        <h1 className="text-3xl font-light text-neutral-900 mb-8">Event Participation</h1>
        <EventParticipationTable />
      </div>
    </div>
  );
};
