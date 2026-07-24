'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function QueueClient() {
  const [queue, setQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const [editModal, setEditModal] = useState({ isOpen: false, id: '', title: '' });
  const [newTime, setNewTime] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // 🚨 2중 방어 및 디버깅 레이더가 장착된 광속 Fetch 엔진
  const fetchQueue = async () => {
    try {
      const res = await fetch(`/api/admin/queue?_t=${Date.now()}`, { 
        cache: 'no-store',
        headers: { 
          'Pragma': 'no-cache', 
          'Cache-Control': 'no-cache' 
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        
        // 🚨 디버깅 레이더: 브라우저 F12 (콘솔 탭)에서 백엔드가 준 원본 데이터를 직접 확인하십시오!
        console.log("📡 백엔드 응답 원본 데이터:", data);
        
        // 🚨 2중 방어 로직: 백엔드가 배열을 바로 주든, { data: [...] } 형태로 주든 무조건 낚아챔
        const queueData = Array.isArray(data) ? data : (data?.data || []);
        
        setQueue(queueData);
        sessionStorage.setItem('admin_queue_cache', JSON.stringify(queueData));
      } else {
        alert('관리자 권한이 만료되었거나 접근할 수 없습니다.');
        router.push('/');
      }
    } catch (error) {
      console.error("데이터 로딩 중 에러 발생:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const cached = sessionStorage.getItem('admin_queue_cache');
    if (cached) {
      setQueue(JSON.parse(cached));
      setIsLoading(false);
    }
    fetchQueue();
  }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`정말 예약 대기 중인 [ ${title} ] 글을 취소하시겠습니까?\n취소된 글은 영구 삭제됩니다.`)) return;
    
    try {
      const res = await fetch(`/api/admin/queue?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('예약이 성공적으로 취소되었습니다.');
        const newQueue = queue.filter(post => post.id !== id);
        setQueue(newQueue);
        sessionStorage.setItem('admin_queue_cache', JSON.stringify(newQueue));
      } else {
        alert('예약 취소에 실패했습니다.');
      }
    } catch (error) {
      alert('서버 에러가 발생했습니다.');
    }
  };

  const openEditModal = (post: any) => {
    const dateObj = new Date(post.scheduled_at);
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(dateObj.getTime() - tzOffset)).toISOString().slice(0, 16);
    
    setNewTime(localISOTime);
    setEditModal({ isOpen: true, id: post.id, title: post.title });
  };

  const handleTimeUpdate = async () => {
    if (!newTime) { alert('변경할 시간을 선택해 주세요.'); return; }
    
    setIsUpdating(true);
    try {
      const standardTime = new Date(newTime + '+09:00').toISOString();

      const res = await fetch('/api/admin/queue', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: editModal.id, new_scheduled_at: standardTime })
      });

      if (res.ok) {
        alert('예약 시간이 성공적으로 변경되었습니다!');
        const newQueue = queue.map(p => p.id === editModal.id ? { ...p, scheduled_at: standardTime } : p);
        setQueue(newQueue);
        sessionStorage.setItem('admin_queue_cache', JSON.stringify(newQueue));
        setEditModal({ isOpen: false, id: '', title: '' });
      } else {
        alert('시간 변경에 실패했습니다.');
      }
    } catch (error) {
      alert('서버 에러가 발생했습니다.');
    } finally {
      setIsUpdating(false);
    }
  };

  const formatScheduledTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth();
    const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).getDate() === date.getDate();
    
    const timeStr = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (diffMs < 0) return { text: `${timeStr} (발행 처리 중)`, type: 'processing' };
    
    let dayStr = `${date.getMonth() + 1}월 ${date.getDate()}일`;
    if (isToday) dayStr = '오늘';
    else if (isTomorrow) dayStr = '내일';

    if (isToday && diffMs < 3 * 60 * 60 * 1000) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      return { text: `${dayStr} ${timeStr} (${diffHours > 0 ? diffHours + '시간 뒤' : '곧 발행'})`, type: 'urgent' };
    }
    
    return { text: `${dayStr} ${timeStr}`, type: 'normal' };
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800">
      <div className="bg-[#1a1f36] text-white p-4 shadow-md flex justify-between items-center">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <span className="text-yellow-400">유머 in</span> | Vercel Cron 무인 예약 관제탑
        </h1>
        <div className="text-sm font-bold text-gray-300">
          👤 상실의 시대 (Master)
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 mt-6">
        <div className="flex border-b border-gray-300 mb-6">
          <div className="px-6 py-3 font-bold text-gray-800 bg-white border border-b-0 border-gray-300 rounded-t-md shadow-sm">
            📋 예약 대기열 관제탑
          </div>
          <Link href="/board/write" className="px-6 py-3 font-bold text-gray-500 hover:text-gray-800 transition-colors">
            ✍️ 관리자 전용 예약 에디터
          </Link>
        </div>

        <div className="bg-white border border-gray-200 shadow-sm rounded-md p-6">
          <div className="flex justify-between items-end border-b border-gray-300 pb-4 mb-4">
            <div>
              <h2 className="text-2xl font-black text-gray-800 flex items-center gap-2">
                ⏱️ 대기 중인 예약 게시글 <span className="text-indigo-600">{queue.length}건</span>
              </h2>
              <p className="text-[13px] text-gray-500 font-bold mt-1">
                설정된 시간이 되면 Vercel Cron 봇이 SEO에 완벽하게 최적화된 방식으로 글을 자동 발행합니다.
              </p>
            </div>
            <Link href="/board/write" className="px-6 py-2.5 bg-[#414a66] text-white font-bold rounded-sm shadow-sm hover:bg-[#2a3042] transition-all">
              + 새 예약글 작성
            </Link>
          </div>

          {isLoading ? (
            <div className="text-center py-20 text-gray-400 font-bold animate-pulse">관제탑 레이더 가동 중... (데이터 로딩)</div>
          ) : queue.length === 0 ? (
            <div className="text-center py-20 text-gray-400 font-bold">현재 대기 중인 예약 글이 없습니다.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-800 text-[13px] text-gray-700 bg-gray-50">
                    <th className="py-2 px-2 text-center w-12 font-bold">번호</th>
                    <th className="py-2 px-2 text-center w-20 font-bold">상태</th>
                    <th className="py-2 px-4 font-bold">예약 발행 시간</th>
                    <th className="py-2 px-4 w-28 font-bold">게시판</th>
                    <th className="py-2 px-4 font-bold">제목</th>
                    <th className="py-2 px-4 font-bold w-36">발행할 계정</th>
                    <th className="py-2 px-2 text-center w-32 font-bold">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.sort((a, b) => new Date(a.scheduled_at).getTime() - new Date(b.scheduled_at).getTime()).map((post, index) => {
                    const timeInfo = formatScheduledTime(post.scheduled_at);
                    return (
                      <tr key={post.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-[13px]">
                        <td className="py-2 px-2 text-center font-bold text-gray-500">
                          {index + 1}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 font-bold text-[11px] rounded-sm">
                            대기 중
                          </span>
                        </td>
                        <td className={`py-2 px-4 font-bold ${timeInfo.type === 'urgent' ? 'text-rose-600' : 'text-gray-700'}`}>
                          {timeInfo.text}
                        </td>
                        <td className="py-2 px-4 text-gray-600 font-bold">
                          {post.category}
                        </td>
                        <td className="py-2 px-4 font-bold text-gray-800 truncate max-w-[200px] md:max-w-md">
                          {post.title}
                        </td>
                        <td className="py-2 px-4 text-indigo-600 font-bold">
                          {post.author} <span className="text-[11px] text-gray-400 block md:inline">({post.author_id})</span>
                        </td>
                        <td className="py-2 px-2 text-center flex justify-center gap-1.5">
                          <button onClick={() => openEditModal(post)} className="px-2 py-1 bg-blue-50 border border-blue-200 text-blue-600 text-[11px] font-bold rounded-sm hover:bg-blue-100 transition-colors">
                            시간변경
                          </button>
                          <button onClick={() => handleDelete(post.id, post.title)} className="px-2 py-1 border border-rose-300 text-rose-500 text-[11px] font-bold rounded-sm hover:bg-rose-50 transition-colors">
                            취소(삭제)
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {editModal.isOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-md shadow-2xl w-full max-w-md overflow-hidden">
            <div className="bg-[#1a1f36] px-5 py-4 flex justify-between items-center">
              <h3 className="text-white font-bold text-lg">⏱️ 예약 시간 변경</h3>
              <button onClick={() => setEditModal({ isOpen: false, id: '', title: '' })} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <p className="text-[13px] text-gray-500 font-bold mb-1">선택된 게시글</p>
                <p className="font-black text-gray-800 bg-gray-50 p-2 rounded-sm border border-gray-200 line-clamp-2 text-sm">
                  {editModal.title}
                </p>
              </div>
              <div className="mb-6">
                <label className="block text-[13px] text-blue-700 font-bold mb-2">새로운 예약 발행 시간 설정</label>
                <input 
                  type="datetime-local" 
                  value={newTime} 
                  onChange={(e) => setNewTime(e.target.value)} 
                  className="w-full p-3 border border-blue-300 rounded-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-blue-50/30 text-sm"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button 
                  onClick={() => setEditModal({ isOpen: false, id: '', title: '' })} 
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-sm rounded-sm hover:bg-gray-200"
                >
                  닫기
                </button>
                <button 
                  onClick={handleTimeUpdate} 
                  disabled={isUpdating}
                  className="px-6 py-2 bg-blue-600 text-white font-bold text-sm rounded-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating ? '변경 중...' : '변경 완료'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}