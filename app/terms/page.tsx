export default function TermsPage() {
  return (
    <div className="max-w-[1000px] mx-auto p-6 md:p-10 bg-white mt-10 mb-20 rounded-sm shadow-sm border border-gray-200">
      <h1 className="text-2xl font-black text-gray-800 mb-8 border-b border-gray-200 pb-4">이용약관</h1>
      
      <div className="text-[14px] text-gray-600 leading-relaxed space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">제1장 총칙</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-700 mb-1">제1조 (목적)</h3>
              <p>이 약관은 커뮤니티 '오재미'(이하 "회사"라 한다)가 제공하는 온라인 서비스(이하 "서비스"라 한다)의 이용조건 및 절차에 관한 사항을 규정함을 목적으로 합니다.</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-700 mb-1">제2조 (정의)</h3>
              <p className="mb-1">이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
              <ul className="list-disc pl-5 space-y-1">
                <li><span className="font-bold">회원</span> : 회원가입에 필요한 개인정보를 제공하여 사이트에 회원 등록을 한 자.</li>
                <li><span className="font-bold">게시물</span> : 게시판에 등록하는 제목, 내용 및 댓글.</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">제2장 서비스의 이용 및 관리</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-700 mb-1">제3조 (서비스 이용의 제한 및 중지)</h3>
              <p className="mb-1">① 회원이 서비스 내에 게시하거나 전달하는 내용물이 공공질서 및 미풍양속에 위반되거나, 타인의 권리를 침해한다고 판단될 경우 사전 통보 없이 게시중단, 이동, 삭제 등의 조치를 취할 수 있습니다.</p>
              <p>② 오재미는 회원의 공개된 게시물이 사생활 침해 또는 명예훼손 등 제3자의 권리를 침해한다고 인정하는 경우 해당 게시물을 임시 조치하거나 차단할 수 있습니다.</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-700 mb-1">제4조 (권리의 귀속 및 저작물의 이용)</h3>
              <p className="mb-1">① 서비스 내에서 게시된 게시물 등의 저작권은 해당 게시물의 저작자에게 귀속됩니다.</p>
              <p>② 회원이 탈퇴 및 회원자격을 상실한 경우, 탈퇴 전 본인이 직접 삭제하지 않은 공개된 게시물은 자동 삭제되지 않습니다.</p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">제3장 계약당사자의 책임과 의무</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-bold text-gray-700 mb-1">제5조 (회원 및 이용자의 책임)</h3>
              <p className="mb-1">① 회원이 작성한 게시물 등에 대한 모든 권리와 책임은 이를 작성한 회원에게 있습니다.</p>
              <p>② 서비스를 이용하여 해킹, 불법자료의 배포 등 불법행위를 하여서는 아니 되며, 이를 위반하여 발생한 법적 조치 등에 관하여서는 그 이용자가 책임을 집니다.</p>
            </div>
            <div>
              <h3 className="font-bold text-gray-700 mb-1">제6조 (면책 조항)</h3>
              <p className="mb-1">① 오재미는 천재지변 또는 기타 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.</p>
              <p className="mb-1">② 오재미는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.</p>
              <p>③ 오재미는 회원이 서비스에 게재한 정보, 자료, 사실의 신뢰도, 정확성 등의 내용에 관하여는 책임을 지지 않습니다.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}