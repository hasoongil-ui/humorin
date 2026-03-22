export default function TermsPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 border border-gray-200 shadow-sm rounded-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b-2 border-gray-900">오재미 이용약관</h1>
        
        <div className="space-y-8 text-gray-700 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">제1장 총칙</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">제1조 (목적)</h3>
            <p>이 약관은 커뮤니티 '오재미'(이하 "회사"라 한다)가 제공하는 온라인 서비스(이하 "서비스"라 한다)의 이용조건, 절차, 그리고 회원과 회사 간의 권리, 의무 및 책임 사항을 규정함을 목적으로 합니다.</p>
            
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">제2조 (정의)</h3>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>회원:</strong> 본 약관에 동의하고 개인정보를 제공하여 사이트에 가입을 완료한 자.</li>
              <li><strong>게시물:</strong> 회원이 서비스를 이용함에 있어 게시판에 등록하는 부호, 문자, 음성, 음향, 화상, 동영상 등의 정보 형태의 글, 사진, 동영상 및 각종 파일과 링크, 댓글 등을 의미합니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8">제2장 서비스의 이용 및 관리</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">제3조 (서비스 이용의 제한 및 중지)</h3>
            <p>① 회원이 서비스 내에 게시하거나 전달하는 내용물이 다음 각 호에 해당하는 경우, 회사는 사전 통보 없이 해당 게시물의 숨김(블라인드), 이동, 삭제 및 회원의 이용 제한 조치를 취할 수 있습니다.</p>
            <ul className="list-decimal pl-5 mt-2 space-y-1">
              <li>공공질서 및 미풍양속에 위반되는 내용인 경우 (음란물, 불법촬영물, 아동·청소년 성착취물 등)</li>
              <li>타인의 저작권, 초상권 등 합법적인 권리를 침해하는 경우</li>
              <li>특정 개인이나 단체를 모욕하거나 명예를 훼손하는 경우</li>
              <li>불법 도박, 스팸, 상업적 광고 도배 등 사이트 운영을 방해하는 경우</li>
            </ul>
            <p className="mt-2">② "오재미"는 회원의 공개된 게시물로 인해 사생활 침해나 명예훼손 등 권리가 침해되었다고 주장하는 제3자의 요청(신고)이 있거나, 다수 회원의 누적 신고가 발생한 경우 시스템에 의해 즉시 해당 게시물을 임시 조치(블라인드)할 수 있습니다.</p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">제4조 (권리의 귀속 및 저작물의 이용)</h3>
            <p>① 서비스 내에서 회원이 작성한 게시물의 저작권은 해당 게시물의 작성자 본인에게 귀속됩니다.</p>
            <p>② 회원이 탈퇴하거나 자격을 상실한 경우, 본인이 직접 삭제하지 않은 공개된 게시물 및 댓글은 사이트 내에 존치되며 자동 삭제되지 않습니다. 삭제를 원할 경우 탈퇴 전 본인이 직접 삭제하여야 합니다.</p>
            <p>③ 회사는 사이트 운영, 전시, 홍보를 위해 회원의 게시물을 무상으로 사용할 권리를 가집니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3 mt-8">제3장 계약당사자의 책임과 의무 및 면책 조항</h2>
            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">제5조 (회원 및 이용자의 책임)</h3>
            <p>① 회원이 작성한 게시물(불법 영상물, 저작권 무단 도용 등 포함)로 인해 발생하는 모든 민·형사상의 법적 책임은 전적으로 게시물을 작성한 회원 본인에게 있습니다.</p>
            <p>② 서비스를 이용하여 해킹, 불법자료 배포, 악성코드 유포 등의 불법행위를 하여서는 아니 되며, 이를 위반하여 회사나 제3자에게 손해가 발생한 경우 해당 이용자가 모든 손해를 배상해야 합니다.</p>

            <h3 className="text-lg font-semibold text-gray-800 mt-4 mb-2">제6조 (면책 조항)</h3>
            <p>① "오재미"는 회원 간 또는 회원과 제3자 상호 간에 서비스를 매개로 하여 발생한 분쟁(명예훼손, 저작권 침해 등)에 대하여 개입할 의무가 없으며 이로 인한 손해를 배상할 책임이 없습니다.</p>
            <p>② "오재미"는 온라인서비스제공자(OSP)로서 게시물에 대한 사전 검열 의무가 없으며, 회원이 등록한 게시물의 신뢰도, 정확성, 적법성에 대해 어떠한 보증도 하지 않습니다. 권리 침해 신고 접수 시 적법한 절차에 따라 즉시 삭제 및 차단 조치를 수행함으로써 운영자의 책임을 면합니다.</p>
            <p>③ 천재지변, 디도스(DDoS) 공격, 서버 호스팅 업체의 장애 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 서비스 제공에 관한 책임이 면제됩니다.</p>
          </section>
        </div>
      </div>
    </div>
  );
}