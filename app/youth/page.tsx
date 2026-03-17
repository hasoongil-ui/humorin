export default function YouthPage() {
  return (
    <div className="max-w-[1000px] mx-auto p-6 md:p-10 bg-white mt-10 mb-20 rounded-sm shadow-sm border border-gray-200">
      <h1 className="text-2xl font-black text-gray-800 mb-8 border-b border-gray-200 pb-4">청소년 보호정책</h1>
      
      <div className="text-[14px] text-gray-600 leading-relaxed space-y-8">
        <p className="font-medium text-gray-700 bg-gray-50 p-4 rounded-sm border border-gray-200">
          오재미는 모든 연령대가 자유롭게 이용할 수 있는 공간으로써 유해 정보로부터 청소년을 보호하고 안전한 인터넷 사용을 돕기 위해 청소년 보호정책을 시행하고 있습니다.
        </p>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">1. 청소년 보호를 위한 목표 및 기본 원칙</h2>
          <p>오재미는 청소년이 정신적·신체적으로 유해한 환경으로부터 보호받고 유익한 환경을 조성하도록 노력합니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">2. 청소년 보호를 위한 게시판 관리</h2>
          <p className="mb-2">오재미는 청소년의 올바르고 건전한 성장을 저해할 수 있는 불법 정보, 비윤리적 게시물 등에 대해 엄격히 제재하고 있습니다.</p>
          <p>불건전한 행위를 할 경우 이용제한 또는 민·형사상의 책임을 받을 수 있음을 고지하여 전체 이용자를 보호하고 있습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">3. 청소년보호책임자 및 담당자 지정</h2>
          <p className="mb-2">오재미는 청소년유해정보의 차단 및 관리 업무를 수행하기 위해 아래와 같이 책임자를 지정하고 있습니다.</p>
          <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
            <ul className="space-y-1 font-medium">
              <li><span className="text-gray-500 w-32 inline-block">청소년 보호 책임자</span> : 오재미 최고관리자</li>
              <li><span className="text-gray-500 w-32 inline-block">이메일</span> : <a href="mailto:ruffian71@naver.com" className="text-[#3b4890] hover:underline font-bold">ruffian71@naver.com</a></li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}