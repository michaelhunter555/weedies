"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function OnboardingCancelledPage() {
  const router = useRouter();
  const { user } = useAuth();
  useEffect(() => {
    router.push(`/my-settings/${user?.id}`);
  }, [router, user?.id]);
  return (
    <div>
      <h1>Onboarding Cancelled</h1>
    </div>
  );
}