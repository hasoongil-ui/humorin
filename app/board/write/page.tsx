"use client"; // 1. 버튼을 살리는 마법!

import { useState } from 'react';

export default function WritePage() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = async () => {
    // 2. 제목이나 내용이 없으면 야단치기!
    if (!title || !content) return alert('대표님! 제목과 내용을 입력해 주세요!');

    try {
      const response = await fetch('/api/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content, category: '유머' }),
      });

      if (response.ok) {
        alert('🎉 축하합니다! 글이 창고에 완벽하게 저장되었습니다!');
        window.location.href = '/board'; // 성공하면 게시판으로 이동!
      } else {
        alert('창고 배달 실패! (서버 에러)');
      }
    } catch (error) {
      alert('에러 발생! 미나를 불러주세요.');
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-4">
        <input 
          className="w-full p-3 border rounded" 
          placeholder="제목!!" 
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="mb-4">
        <textarea 
          className="w-full p-3 border rounded h-64" 
          placeholder="제미나이랑 코드 짜다 암걸리겠다!!!"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button className="px-6 py-2 bg-gray-100 rounded">취소</button>
        {/* 3. 여기서 handleSubmit을 연결하는 게 핵심! */}
        <button 
          onClick={handleSubmit} 
          className="px-6 py-2 bg-blue-600 text-white rounded font-bold"
        >
          등록
        </button>
      </div>
    </div>
  );
}