"use client";
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';

export default function OnboardingSuccessPage() {
  const { user } = useAuth();
  const router = useRouter();
  useEffect(() => {
    router.push(`/my-settings/${user?.id}`);
  }, [router, user?.id]);
  return (
    <div>
      <h1>Onboarding Success</h1>
    </div>
  );
}