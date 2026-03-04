"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function WritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('유머');

  const handleSubmit = async () => {
    // 1. 버튼이 살아있는지 확인하는 알림창입니다!
    alert('대표님, 등록 버튼이 정상적으로 눌렸습니다! 창고로 배달을 시작할게요.');

    if (!title || !content) {
      alert('제목과 내용을 모두 입력해 주세요!');
      return;
    }

    try {
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category }),
      });

      if (response.ok) {
        alert('🎉 대박! 글이 창고에 완벽하게 저장되었습니다!');
        window.location.href = '/board'; 
      } else {
        alert('창고 배달에 문제가 생겼습니다. (에러 발생)');
      }
    } catch (error) {
      alert('네트워크 연결이 좋지 않습니다. 다시 시도해 주세요!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 font-sans">
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto">
          <Link href="/" className="text-2xl font-black text-blue-600">OJEMI</Link>
        </div>
      </header>

      <nav className="bg-blue-600 text-white overflow-x-auto">
        <div className="max-w-5xl mx-auto flex">
          {['💯 백베스트', '👑 천베스트', '투데이 베스트', '전체글 보기', '유머', '감동', '공포', '일상', '그냥 혼잣말', '핫뉴스'].map((menu) => (
            <div key={menu} className="px-4 py-3 hover:bg-blue-700 font-bold text-sm cursor-pointer">{menu}</div>
          ))}
        </div>
      </nav>

      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex gap-2 mb-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="border p-2 rounded bg-gray-50">
              <option>유머</option><option>일상</option><option>핫뉴스</option>
            </select>
            <input 
              className="w-full p-2 border rounded focus:outline-blue-500" 
              placeholder="제목을 입력하세요" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="border rounded-t bg-gray-50 p-2 flex gap-4 text-sm text-gray-600 border-b-0">
            <span>🖼️ 사진</span> <span>🎬 영상</span> | <b>B</b> <i>I</i> <u>U</u> <s>S</s> | <span className="text-red-500">🔴 색상</span>
          </div>
          <textarea 
            className="w-full p-4 border rounded-b h-96 focus:outline-blue-500 resize-none" 
            placeholder="내용을 입력하세요"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          <div className="mt-4 flex justify-end gap-2">
            <button className="px-6 py-2 bg-gray-100 rounded hover:bg-gray-200" onClick={() => window.location.href='/board'}>취소</button>
            <button 
              onClick={handleSubmit}
              className="px-8 py-2 bg-blue-600 text-white rounded font-extrabold hover:bg-blue-700 shadow-lg"
            >
              등록
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}