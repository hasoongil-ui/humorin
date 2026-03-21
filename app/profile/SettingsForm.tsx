'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
// 💡 [핵심] 마법 요원들과, 방금 만든 '탈퇴 요원(deleteUserAction)'까지 완벽하게 모셔옵니다!
import { checkDuplicate } from '../signup/actions';
import { updateProfileAction, deleteUserAction } from './actions'; 

// 💡 [수술 핵심 1] 껍데기에서 보내준 'isNaverUser' 안테나 장착!
export default function SettingsForm({ 
  currentUserId, 
  currentNickname, 
  isNaverUser 
}: { 
  currentUserId: string, 
  currentNickname: string, 
  isNaverUser?: boolean 
}) {
  const [nickname, setNickname] = useState('');
  const [nickError, setNickError] = useState('');
  const [nickOk, setNickOk] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const nickRegex = /^[가-힣a-zA-Z0-9\s]{2,8}$/;

  const handleNickBlur = async () => {
    const val = nickname.trim();
    if (!val) {
      setNickError(''); setNickOk(false); return;
    }

    const cleanVal = val.replace(/\s{2,}/g, ' '); 

    // 💡 1. 내 현재 닉네임과 똑같이 쳤을 때 (통과!)
    if (cleanVal === currentNickname) {
      setNickError('');
      setNickOk(true);
      return;
    }

    // 💡 2. 글자 수나 특수문자 규칙을 어겼을 때
    if (!nickRegex.test(cleanVal)) {
      setNickError('❌ 닉네임은 특수문자 제외 2~8자로 입력해 주세요.');
      setNickOk(false); return;
    }

    // 💡 3. 서버 요원에게 중복 & 사칭 검사 맡기기
    const status = await checkDuplicate('nickname', cleanVal);
    if (status === 'forbidden') {
      setNickError('❌ 관리자 사칭 방지를 위해 사용할 수 없는 단어입니다.');
      setNickOk(false);
    } else if (status === 'duplicate') {
      setNickError('❌ 이미 다른 사람이 사용 중인 닉네임입니다.');
      setNickOk(false);
    } else {
      setNickError('');
      setNickOk(true);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    if (nickError) return; // 에러가 있으면 수정 못하게 막음
    setIsSubmitting(true);
    await updateProfileAction(formData);
    setIsSubmitting(false);
  };

  // 💡 [구조 변경] 폼(수정)과 폼(탈퇴) 두 개를 나란히 놓기 위해 전체를 div로 한 번 감싸줍니다!
  return (
    <div>
      {/* --- [1] 정보 수정 폼 영역 --- */}
      <form action={handleSubmit} className="space-y-6">
        <input type="hidden" name="currentUserId" value={currentUserId || ''} />
        <input type="hidden" name="currentNickname" value={currentNickname || ''} />

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">새 닉네임</label>
          <input 
            name="newNickname" 
            placeholder={`현재: ${currentNickname}`}
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setNickError(''); 
              setNickOk(false);
            }}
            onBlur={handleNickBlur}
            className={`w-full p-3 border rounded-sm focus:outline-none font-medium ${nickError ? 'border-red-500 bg-red-50' : 'border-gray-300 focus:border-[#3b4890]'}`} 
          />
          {/* 💡 실시간 상태 알림판 */}
          {nickError && <p className="text-red-500 text-[12px] font-bold mt-1.5">{nickError}</p>}
          {nickOk && nickname === currentNickname && <p className="text-gray-500 text-[12px] font-bold mt-1.5">✅ 현재 사용 중인 닉네임을 그대로 유지합니다.</p>}
          {nickOk && nickname !== currentNickname && <p className="text-green-600 text-[12px] font-bold mt-1.5">✅ 멋진 닉네임이네요! 변경 가능합니다.</p>}
        </div>
        
        {/* 💡 [수술 핵심 2] 네이버 유저면 친절한 안내문을, 일반 유저면 비밀번호 변경 칸을 보여줍니다! */}
        {isNaverUser ? (
          <div className="bg-green-50 p-4 border border-green-200 rounded-sm">
            <label className="block text-sm font-bold text-green-800 mb-1">비밀번호 변경 안내</label>
            <p className="text-xs text-green-700 font-medium leading-relaxed">
              네이버로 간편 가입하신 회원님은 오재미에서 비밀번호를 변경하실 수 없습니다.<br/>
              계정 보안 및 비밀번호 관리는 <b>네이버 홈페이지</b>를 이용해 주세요!
            </p>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">새 비밀번호</label>
            <input type="password" name="newPassword" placeholder="변경할 비밀번호 입력 (선택)" className="w-full p-3 border border-gray-300 rounded-sm focus:outline-none focus:border-[#3b4890] font-medium" />
          </div>
        )}
        
        <button 
          type="submit" 
          disabled={isSubmitting || !!nickError} 
          className="w-full flex justify-center items-center gap-2 py-3.5 bg-[#2a3042] text-white rounded-sm font-bold text-[15px] hover:bg-[#1e2335] shadow-sm transition-colors mt-4 disabled:bg-gray-400"
        >
          {isSubmitting && <Loader2 className="animate-spin" size={18} />}
          {isSubmitting ? '수정 중...' : '정보 수정하기'}
        </button>
      </form>

      {/* --- [2] 대망의 회원 탈퇴 버튼 영역 (안전하게 분리) --- */}
      <div className="mt-8 pt-6 border-t border-gray-100 flex justify-end">
        <form action={async (formData) => {
          // 확인 창을 띄워서 '확인'을 누를 때만 서버 요원을 출동시킵니다!
          if (window.confirm('정말로 오재미를 탈퇴하시겠습니까?\n작성하신 모든 정보가 영구적으로 삭제되며 복구할 수 없습니다.')) {
            await deleteUserAction(formData);
          }
        }}>
          <input type="hidden" name="currentUserId" value={currentUserId || ''} />
          <button 
            type="submit" 
            className="text-[12px] font-bold text-gray-400 hover:text-red-500 underline underline-offset-2 transition-colors"
          >
            회원 탈퇴하기
          </button>
        </form>
      </div>
    </div>
  );
}