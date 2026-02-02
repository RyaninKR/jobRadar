'use client';

import { useAuth } from '@/lib/auth-context';
import AuthForm from '@/components/AuthForm';
import WorkLogList from '@/components/WorkLogList';

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-gray-600 dark:text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return user ? <WorkLogList /> : <AuthForm />;
}
