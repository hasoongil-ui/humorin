export default function PrivacyPage() {
  return (
    <div className="max-w-[1000px] mx-auto p-6 md:p-10 bg-white mt-10 mb-20 rounded-sm shadow-sm border border-gray-200">
      <h1 className="text-2xl font-black text-gray-800 mb-8 border-b border-gray-200 pb-4">개인정보처리방침</h1>
      
      <div className="text-[14px] text-gray-600 leading-relaxed space-y-8">
        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">1. 수집하는 개인정보 항목</h2>
          <p className="mb-2">오재미는 원활한 커뮤니티 서비스 제공을 위해 아래와 같은 최소한의 개인정보만을 수집하고 있습니다.</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li><span className="font-bold">수집항목</span> : 아이디, 비밀번호, 닉네임</li>
            <li><span className="font-bold">자동 수집항목</span> : 서비스 이용기록, 쿠키, 회원조치이력</li>
          </ul>
          <div className="bg-emerald-50 text-emerald-700 p-3 rounded-sm border border-emerald-100 font-bold text-[13px]">
            ※ 오재미는 회원의 통신 비밀 보호를 위해 IP 주소를 일절 수집하거나 저장하지 않습니다.
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">2. 개인정보의 수집 및 이용목적</h2>
          <p className="mb-2">오재미는 수집한 개인정보를 다음의 목적을 위해 활용하며 다른 용도로는 사용되지 않습니다.</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><span className="font-bold">아이디, 비밀번호, 닉네임</span> : 서비스 이용에 따른 본인식별, 중복가입 확인, 부정이용 방지를 위해 사용됩니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">3. 개인정보의 보유 및 이용기간</h2>
          <p className="mb-2">오재미는 회원가입일로부터 서비스를 제공하는 기간 동안에 한하여 이용자의 개인정보를 보유 및 이용합니다. 원칙적으로 회원 탈퇴 등 수집 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
          <p>단, 빈번한 가입과 탈퇴를 반복하는 악의적 이용 방지를 위해 일부 기록은 내부 방침에 따라 일정 기간 보존 후 파기될 수 있습니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">4. 개인정보의 위탁 및 외부 제공</h2>
          <p>오재미는 이용자의 개인정보를 원칙적으로 외부에 제공하거나 위탁하지 않습니다. 다만, 법령의 규정에 의거하거나 수사기관의 적법한 요구가 있는 경우에는 예외로 합니다.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold text-gray-800 mb-3">5. 개인정보관리책임자</h2>
          <p className="mb-2">회사는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보관리책임자를 지정하고 있습니다.</p>
          <div className="bg-gray-50 p-4 rounded-sm border border-gray-200">
            <ul className="space-y-1 font-medium">
              <li><span className="text-gray-500 w-20 inline-block">담당자</span> : 오재미 최고관리자</li>
              <li><span className="text-gray-500 w-20 inline-block">이메일</span> : <a href="mailto:ruffian71@naver.com" className="text-[#3b4890] hover:underline font-bold">ruffian71@naver.com</a></li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}