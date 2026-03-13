'use client';

// 💡 [미나 마법] 모든 관리자 방에서 재활용할 단 하나의 완벽한 클라이언트 안전 버튼입니다!
export default function SafeButton({ label, confirmMessage, formAction, name, value, className }: any) {
  return (
    <button
      type="submit"
      formAction={formAction}
      name={name}
      value={value}
      onClick={(e) => {
        if (!confirm(confirmMessage)) e.preventDefault();
      }}
      className={className}
    >
      {label}
    </button>
  );
}