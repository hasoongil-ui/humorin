export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 border border-gray-200 shadow-sm rounded-sm">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 pb-4 border-b-2 border-gray-900">개인정보처리방침</h1>
        
        <div className="space-y-8 text-gray-700 leading-relaxed text-[15px]">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. 수집하는 개인정보 항목</h2>
            <p>"오재미"는 원활한 커뮤니티 서비스 제공과 안전한 환경 조성을 위해 아래와 같은 최소한의 정보만을 수집하고 있습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>수집항목 :</strong> 아이디, 비밀번호(단방향 암호화), 닉네임</li>
              <li><strong>자동 수집항목 :</strong> 접속 IP 주소, 서비스 이용기록, 쿠키, 불량 이용 제재 이력</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. 개인정보의 수집 및 이용목적</h2>
            <p>"오재미"는 수집한 개인정보를 다음의 목적을 위해 활용하며 다른 용도로는 절대 사용되지 않습니다.</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li><strong>아이디, 비밀번호, 닉네임 :</strong> 서비스 이용에 따른 본인식별, 중복가입 확인</li>
              <li><strong>접속 IP 주소 및 이용기록 :</strong> 악성 봇(Bot) 접근 방지, 불법 광고 도배 및 어뷰징 유저 영구 차단, 해킹 방어 등 사이트 보안과 건전한 커뮤니티 환경 유지를 위한 '보안 및 통제 목적'으로만 엄격하게 사용됩니다.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. 개인정보의 보유 및 이용기간</h2>
            <p>"오재미"는 회원가입일로부터 서비스를 제공하는 기간 동안에 한하여 개인정보를 보유 및 이용합니다. 원칙적으로 회원 탈퇴 등 수집 목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다.</p>
            <div className="bg-gray-100 p-4 mt-3 rounded-sm text-sm border-l-4 border-gray-400">
              <strong>※ 단, 예외 보존 (악성 유저 방어용) :</strong> 불법적인 게시물 작성, 빈번한 가입/탈퇴를 반복하는 어뷰징 행위를 방지하고, 사이트 접근 차단 조치를 유지하기 위해 <strong>접속 IP 주소 및 제재 이력은 내부 방침에 따라 일정 기간 보존 후 파기</strong>합니다.
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. 개인정보의 위탁 및 외부 제공</h2>
            <p>"오재미"는 이용자의 개인정보를 원칙적으로 외부에 제공하거나 위탁하지 않습니다. 다만, 아래의 경우에는 예외로 합니다.</p>
            <ul className="list-disc pl-5 mt-2">
              <li>법령의 규정에 의거하거나, 수사 목적으로 수사기관의 적법한 절차와 요구(압수수색 영장 등)가 있는 경우</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. 개인정보관리책임자</h2>
            <p>회사는 고객의 개인정보를 보호하고 개인정보와 관련한 불만을 처리하기 위하여 아래와 같이 개인정보관리책임자를 지정하고 있습니다.</p>
            <ul className="list-none mt-2 space-y-1 bg-gray-50 p-4 border border-gray-200">
              <li><strong>담당자 :</strong> 오재미 최고관리자</li>
              <li><strong>이메일 :</strong> ruffian71@naver.com</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}