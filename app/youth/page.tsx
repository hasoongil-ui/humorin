export default function YouthPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 border border-gray-200 shadow-sm rounded-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b-2 border-gray-900">청소년 보호정책</h1>
        
        <div className="space-y-8 text-gray-700 leading-relaxed text-[15px]">
          <p className="text-lg font-medium text-gray-800">
            "오재미"는 모든 연령대가 자유롭게 이용할 수 있는 공간으로써, 유해 정보로부터 청소년을 보호하고 깨끗한 인터넷 환경을 조성하기 위해 [정보통신망 이용촉진 및 정보보호 등에 관한 법률]에 의거하여 청소년 보호정책을 시행하고 있습니다.
          </p>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. 청소년 보호를 위한 목표 및 기본 원칙</h2>
            <p>"오재미"는 청소년이 정신적·신체적으로 유해한 환경으로부터 보호받고 유익한 환경을 조성하도록 불법·유해 콘텐츠의 유통을 엄격히 금지합니다.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. 청소년 보호를 위한 게시물 차단 및 관리</h2>
            <p>"오재미"는 청소년의 올바른 성장을 저해할 수 있는 음란물, 아동·청소년 성착취물, 불법촬영물, 폭력적·비윤리적 게시물에 대해 '무관용 원칙'을 적용합니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-2">
              <li>유해 게시물 발견 및 신고 접수 시 사전 통보 없이 즉시 삭제 조치됩니다.</li>
              <li>해당 불건전 행위를 한 회원은 서비스 이용이 영구 제한되며, 관련 법령에 따라 민·형사상의 강력한 처벌을 받을 수 있습니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. 청소년보호책임자 및 담당자 지정</h2>
            <p>청소년 유해정보로 인한 피해 상담 및 고충 처리를 위해 아래와 같이 책임자를 지정하고 있습니다.</p>
            <ul className="list-none mt-3 space-y-1 bg-gray-50 p-4 border border-gray-200">
              <li><strong>청소년 보호 책임자 :</strong> 오재미 최고관리자</li>
              <li><strong>이메일 :</strong> ruffian71@naver.com</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}