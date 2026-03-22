'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase/client';
import { format } from 'date-fns';

interface WorkLog {
  id: string;
  date: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export default function WorkLogList() {
  const { user, signOut } = useAuth();
  const [workLogs, setWorkLogs] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({ date: '', title: '', content: '' });

  useEffect(() => {
    if (user) {
      loadWorkLogs();
    }
  }, [user]);

  const loadWorkLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;
      setWorkLogs(data || []);
    } catch (error) {
      console.error('Error loading work logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setIsEditing(true);
    setSelectedLog(null);
    setEditForm({
      date: format(new Date(), 'yyyy-MM-dd'),
      title: '',
      content: '',
    });
  };

  const handleEdit = (log: WorkLog) => {
    setIsEditing(true);
    setSelectedLog(log);
    setEditForm({
      date: log.date,
      title: log.title,
      content: log.content,
    });
  };

  const handleSave = async () => {
    if (!user) return;

    try {
      if (selectedLog) {
        // Update existing log
        const { error } = await (supabase as any)
          .from('work_logs')
          .update({
            date: editForm.date,
            title: editForm.title,
            content: editForm.content,
          })
          .eq('id', selectedLog.id);

        if (error) throw error;
      } else {
        // Create new log
        const { error } = await supabase
          .from('work_logs')
          .insert({
            user_id: user.id,
            date: editForm.date,
            title: editForm.title,
            content: editForm.content,
          } as any);

        if (error) throw error;
      }

      setIsEditing(false);
      setSelectedLog(null);
      loadWorkLogs();
    } catch (error) {
      console.error('Error saving work log:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      const { error } = await supabase
        .from('work_logs')
        .delete()
        .eq('id', id);

      if (error) throw error;
      loadWorkLogs();
      setSelectedLog(null);
    } catch (error) {
      console.error('Error deleting work log:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto p-4">
        <header className="flex justify-between items-center mb-8 pt-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
              업무 일지
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {user?.email}
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
          >
            로그아웃
          </button>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: List */}
          <div className="space-y-4">
            <button
              onClick={handleCreateNew}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium"
            >
              + 새 일지 작성
            </button>

            <div className="space-y-2">
              {workLogs.map((log) => (
                <div
                  key={log.id}
                  onClick={() => {
                    setSelectedLog(log);
                    setIsEditing(false);
                  }}
                  className={`p-4 bg-white dark:bg-gray-800 rounded-lg cursor-pointer hover:shadow-md transition ${
                    selectedLog?.id === log.id ? 'ring-2 ring-blue-500' : ''
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {log.title}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {format(new Date(log.date), 'M월 d일')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 line-clamp-2">
                    {log.content}
                  </p>
                </div>
              ))}

              {workLogs.length === 0 && (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  아직 작성된 일지가 없습니다.
                </div>
              )}
            </div>
          </div>

          {/* Right: Detail/Edit */}
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 sticky top-4">
            {isEditing ? (
              <div className="space-y-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                  {selectedLog ? '일지 수정' : '새 일지'}
                </h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    날짜
                  </label>
                  <input
                    type="date"
                    value={editForm.date}
                    onChange={(e) => setEditForm({ ...editForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    제목
                  </label>
                  <input
                    type="text"
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-white"
                    placeholder="오늘의 업무"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    내용
                  </label>
                  <textarea
                    value={editForm.content}
                    onChange={(e) => setEditForm({ ...editForm, content: e.target.value })}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-md dark:bg-gray-900 dark:text-white"
                    placeholder="오늘 한 일을 기록하세요..."
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
                  >
                    저장
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setSelectedLog(null);
                    }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white py-2 rounded-md"
                  >
                    취소
                  </button>
                </div>
              </div>
            ) : selectedLog ? (
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                    {selectedLog.title}
                  </h2>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(selectedLog.date), 'yyyy년 M월 d일')}
                  </span>
                </div>
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {selectedLog.content}
                  </p>
                </div>
                <div className="flex gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleEdit(selectedLog)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md"
                  >
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(selectedLog.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md"
                  >
                    삭제
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                일지를 선택하거나 새로 작성하세요
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
