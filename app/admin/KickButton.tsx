'use client';

export default function KickButton({ userId, nickname, kickAction }: any) {
  return (
    <button
      onClick={async () => {
        // 💡 화면 요원 전용 기능: 브라우저 알림창을 띄웁니다!
        if (confirm(`정말 '${nickname}' 회원을 영구 탈퇴 처리하시겠습니까?\n이 작업은 되돌릴 수 없습니다!`)) {
          // 확인을 누르면 서버의 강제 탈퇴 엔진을 가동시킵니다!
          await kickAction(userId);
        }
      }}
      className="px-3 py-1.5 bg-white border border-gray-300 text-red-600 font-bold rounded-sm hover:bg-red-50 hover:border-red-200 transition-colors text-xs"
    >
      강제 탈퇴
    </button>
  );
}