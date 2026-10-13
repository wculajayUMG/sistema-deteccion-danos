'use client';
import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import TopHeader from './TopHeader';

interface Props {
  children: React.ReactNode;
  breadcrumb?: string[];
}

export default function AppLayout(
  { children, breadcrumb }: Props
) {
  const [mobileOpen, setMobileOpen] =
    useState(false);

  const handleClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  const handleToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden
      bg-brand-bg">
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={handleClose}
      />
      <div className="flex flex-col flex-1
        min-w-0 overflow-hidden">
        <TopHeader
          breadcrumb={breadcrumb}
          onMenuToggle={handleToggle}
        />
        <main className="flex-1 overflow-y-auto
          p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
