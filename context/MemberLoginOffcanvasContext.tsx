/**
 * MemberLoginOffcanvasContext.tsx
 * Global member login offcanvas: open from Footer "Members", event CTA, or anywhere.
 * Single shared panel so the member flow stays in one place.
 */

import React, { createContext, useCallback, useContext, useState } from 'react';
import { OffCanvas } from '../components/OffCanvas';
import { MemberLoginForm } from '../components/MemberLoginForm';

type MemberLoginOffcanvasContextValue = {
  openMemberLogin: () => void;
  closeMemberLogin: () => void;
};

const MemberLoginOffcanvasContext = createContext<MemberLoginOffcanvasContextValue | null>(null);

export function useMemberLoginOffcanvas(): MemberLoginOffcanvasContextValue {
  const ctx = useContext(MemberLoginOffcanvasContext);
  if (!ctx) {
    throw new Error('useMemberLoginOffcanvas must be used within MemberLoginOffcanvasProvider');
  }
  return ctx;
}

export const MemberLoginOffcanvasProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);

  const openMemberLogin = useCallback(() => setOpen(true), []);
  const closeMemberLogin = useCallback(() => setOpen(false), []);

  return (
    <MemberLoginOffcanvasContext.Provider value={{ openMemberLogin, closeMemberLogin }}>
      {children}
      <OffCanvas
        open={open}
        onClose={closeMemberLogin}
        title="Members login"
      >
        <MemberLoginForm compact onSuccess={closeMemberLogin} />
      </OffCanvas>
    </MemberLoginOffcanvasContext.Provider>
  );
};
