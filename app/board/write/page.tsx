{/* 💡 블로그에서 넘어온 이웃님들을 위한 완벽한 카테고리 라인업! */}
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 border border-gray-300 rounded-sm focus:border-gray-500 outline-none font-bold bg-white text-gray-700 w-full md:w-56 shadow-sm"
            >
              <optgroup label="☕ 따뜻한 다락방">
                <option value="인사 한마디">👋 인사 한마디</option>
                <option value="세상사는 이야기">☕ 세상사는 이야기</option>
                <option value="묻지마 격려">👏 묻지마 격려</option>
                <option value="그냥 혼잣말">💬 그냥 혼잣말</option>
              </optgroup>
              <optgroup label="😊 꿀잼 & 감동">
                <option value="유머">😆 웃어요 (유머)</option>
                <option value="감동">💖 나누고 싶은 감동</option>
                <option value="귀여운 동물들">🐾 귀여운 동물들</option>
              </optgroup>
              <optgroup label="💡 지식 & 정보">
                <option value="유용한 상식">📚 유용한 상식</option>
                <option value="이거 알려주세요">🙋 이거 알려주세요</option>
                <option value="부동산 사랑방">🏘️ 부동산 사랑방</option>
              </optgroup>
            </select>