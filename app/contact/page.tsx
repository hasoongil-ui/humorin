export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto bg-white p-8 md:p-12 border border-gray-200 shadow-sm rounded-sm text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">버그 신고 및 문의</h1>
        <p className="text-gray-600 mb-8">
          "유머인"는 저작권, 권리 침해 방지 및 쾌적한 환경을 위해 신속한 조치를 시행하고 있습니다.<br />
          아래 이메일로 내용을 보내주시면 관리자가 확인 후 신속하게 처리해 드리겠습니다.
        </p>
        
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-6 mb-8 inline-block w-full max-w-md">
          <p className="text-sm text-indigo-800 font-bold mb-1">접수 이메일</p>
          <p className="text-2xl font-black text-indigo-600 select-all">ruffian71@naver.com</p>
          <p className="text-xs text-indigo-500 mt-2">(위 이메일 주소를 복사해 주세요)</p>
        </div>

        <div className="text-left text-sm text-gray-600 bg-gray-50 p-6 border border-gray-200 rounded-sm">
          <p className="font-bold text-gray-800 mb-2">📌 신고 및 문의 시 필수 기재 사항</p>
          <ul className="list-disc pl-5 space-y-1 mb-4">
            <li><strong>게시중단(권리침해):</strong> 사유, 해당 게시물 URL 주소, 권리자 증명 자료</li>
            <li><strong>버그 및 오류 신고:</strong> 발생한 기기/브라우저, 오류 페이지 주소 및 상황 설명</li>
          </ul>
          <p className="text-xs text-gray-500">※ 접수된 메일은 순차적으로 확인 후 조치되며, 허위 신고로 인한 업무 방해 시 법적 조치를 받을 수 있습니다.</p>
        </div>
      </div>
    </div>
  );
}