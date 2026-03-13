'use client';

// 💡 [미나 마법] 마우스 클릭(onClick)을 감지하기 위해 따로 분리한 클라이언트 전용 버튼입니다!
export default function DeleteButton({ deleteAction }: { deleteAction: any }) {
  return (
    <button 
      formAction={deleteAction}
      onClick={(e) => { 
        if (!confirm('정말 이 게시판을 삭제하시겠습니까?\n(게시판 메뉴만 삭제되며 작성된 글은 보존됩니다)')) e.preventDefault(); 
      }} 
      className="px-3 py-1 bg-white border border-gray-300 text-red-500 text-[11px] font-bold rounded-sm shadow-sm hover:bg-red-50 hover:border-red-200">
      삭제
    </button>
  );
}