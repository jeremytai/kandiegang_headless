import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MemberLoginForm } from '../components/MemberLoginForm';

export const MemberLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/members';

  return (
    <main className="px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Members login
        </h1>
        <MemberLoginForm onSuccess={() => navigate(from, { replace: true })} />
      </div>
    </main>
  );
};
