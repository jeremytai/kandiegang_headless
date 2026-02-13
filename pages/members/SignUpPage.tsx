import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MemberSignupForm } from '../../components/MemberSignupForm';

export const SignUpPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <main className="px-4 pb-16 pt-32 md:px-8 md:pb-24 md:pt-40">
      <div className="mx-auto max-w-xl">
        <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">
          Create account
        </h1>
        <MemberSignupForm
          onSuccess={() => navigate('/members', { replace: true })}
          onShowLogin={() => navigate('/login/member')}
        />
      </div>
    </main>
  );
};
