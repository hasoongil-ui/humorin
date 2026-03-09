'use client';

import { useState } from 'react';

export default function SettingsClient({ 
  currentUser, 
  onUpdatePassword, 
  onDeleteAccount 
}: {
  currentUser: string;
  onUpdatePassword: (newPass: string) => Promise<boolean>;
  onDeleteAccount: () => void;
}) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 💡 비밀번호 변경 엔진 가동!
  const handleSave = async () => {
    if (!newPassword) return alert('새 비밀번호를 입력해주세요.');
    if (newPassword !== confirmPassword) return alert('비밀번호가 일치하지 않습니다.');
    
    setIsSubmitting(true);
    const success = await onUpdatePassword(newPassword);
    
    if (success) {
      alert('비밀번호가 성공적으로 변경되었습니다! 🔒');
      setNewPassword('');
      setConfirmPassword('');
    } else {
      alert('비밀번호 변경에 실패했습니다. 다시 시도해주세요.');
    }
    setIsSubmitting(false);
  };

  // 💡 회원 탈퇴 엔진 가동!
  const handleDelete = () => {
    if (confirm('정말 오재미를 탈퇴하시겠습니까?\n이 작업은 되돌릴 수 없으며, 작성하신 글은 그대로 남습니다.')) {
      onDeleteAccount();
    }
  };

  return (
    <div className="p-6 md:p-10">
      <h3 className="text-lg font-black text-gray-800 mb-6 border-b border-gray-200 pb-3">회원정보 수정</h3>
      
      <div className="max-w-md space-y-6">
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">아이디 (닉네임)</label>
          <input 
            type="text" 
            value={currentUser} 
            disabled 
            className="w-full p-3 bg-gray-100 border border-gray-200 rounded-sm text-gray-500 font-bold cursor-not-allowed" 
          />
          <p className="text-xs text-rose-500 mt-1.5 font-medium">* 현재 아이디는 변경할 수 없습니다.</p>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호</label>
          <input 
            type="password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="변경할 비밀번호를 입력하세요" 
            className="w-full p-3 border border-gray-300 rounded-sm focus:border-[#3b4890] outline-none transition-colors" 
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호 확인</label>
          <input 
            type="password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="비밀번호를 다시 입력하세요" 
            className="w-full p-3 border border-gray-300 rounded-sm focus:border-[#3b4890] outline-none transition-colors" 
          />
        </div>

        <div className="pt-4">
          <button 
            onClick={handleSave} 
            disabled={isSubmitting}
            className="w-full md:w-auto px-8 py-3 bg-[#3b4890] text-white font-bold rounded-sm hover:bg-[#2a3042] transition-colors shadow-sm disabled:bg-gray-400"
          >
            {isSubmitting ? '저장 중...' : '정보 수정 저장하기'}
          </button>
        </div>
      </div>

      <div className="mt-16 pt-6 border-t border-gray-100 flex justify-end">
        <button 
          onClick={handleDelete} 
          className="text-xs font-bold text-gray-400 hover:text-red-500 transition-colors underline underline-offset-2"
        >
          오재미 회원 탈퇴
        </button>
      </div>
    </div>
  );
}