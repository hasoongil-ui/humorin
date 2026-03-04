"use client";

import { useState } from 'react';
import Link from 'next/link';

export default function WritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('유머');

  const handleSubmit = async () => {
    if (!title || !content) return alert('대표님! 제목과 내용을 입력해 주세요!');

    try {
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category }),
      });

      if (response.ok) {
        alert('🎉 대박! 명품 게시판의 첫 글이 창고에 저장되었습니다!');
        window.location.href = '/board'; 
      }
    } catch (error) {
      alert('배달 사고 발생! 미나를 불러주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 명품 상단 로고바 */}
      <header className="bg-white p-4 border-b">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-2xl font-black text-blue-600">OJEMI</h1>
        </div>
      </header>

      {/* 파란색 명품 메뉴바 */}
      <nav className="bg-blue-600 text-white overflow-x-auto whitespace-nowrap">
        <div className="max-w-5xl mx-auto flex">
          {['💯 백베스트', '👑 천베스트', '투데이 베스트', '전체글 보기', '유머', '감동', '공포', '일상', '그냥 혼잣말', '핫뉴스'].map((menu) => (
            <button key={menu} className="px-4 py-3 hover:bg-blue-700 font-bold text-sm">{menu}</button>
          ))}
        </div>
      </nav>

      {/* 게시판 에디터 본체 */}
      <main className="max-w-5xl mx-auto p-4 mt-4">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex gap-2 mb-4">
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="border p-2 rounded bg-gray-50">
              <option>유머</option><option>일상</option><option>핫뉴스</option>
            </select>
            <input 
              className="w-full p-2 border rounded focus:outline-blue-500" 
              placeholder="제목!!" 
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          {/* 에디터 툴바 흉내내기 */}
          <div className="border rounded-t bg-gray-50 p-2 flex gap-4 text-sm text-gray-600 border-b-0">
            <span>🖼️ 사진</span> <span>🎬 영상</span> | <b>B</b> <i>I</i> <u>U</u> <s>S</s> | <span className="text-red-500">🔴 색상</span>
          </div>
          <textarea 
            className="w-full p-4 border rounded-b h-96 focus:outline-blue-500 resize-none" 
            placeholder="여기에 명품 글을 작성해 주세요!"
            value={content}
            onChange={(e) => setContent(e.target.value)}
          />

          {/* 하단 버튼 구역 */}
          <div className="mt-4 flex justify-end gap-2">
            <button className="px-6 py-2 bg-gray-100 rounded hover:bg-gray-200">취소</button>
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