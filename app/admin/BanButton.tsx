'use client';

export default function BanButton({ ip, isBannedIp }: { ip: string, isBannedIp: boolean }) {
  return (
    <button
      type="submit"
      disabled={!ip || ip === '알수없음' || ip === '::1' || isBannedIp}
      className="px-2 py-1 text-[10px] font-black bg-red-50 border border-red-300 rounded-sm hover:bg-red-100 text-red-600 disabled:opacity-30 disabled:cursor-not-allowed shadow-sm transition-colors"
      onClick={(e) => {
        if (!window.confirm(`정말로 이 IP(${ip})를 영구 차단하시겠습니까?\n이 IP를 쓰는 모든 사용자의 가입이 원천 차단됩니다.`)) {
          e.preventDefault();
        }
      }}
    >
      {isBannedIp ? '차단 완료' : '🚨 IP 차단'}
    </button>
  );
}