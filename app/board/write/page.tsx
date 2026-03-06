{/* 💡 글쓰기 창의 드롭다운 메뉴도 따뜻한 새 게시판들로 교체 완료! */}
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="p-3 border border-gray-300 rounded-sm focus:border-gray-500 outline-none font-bold bg-white text-gray-700 w-full md:w-44"
            >
              <option value="인사 한마디">👋 인사 한마디</option>
              <option value="일상">☕ 일상</option>
              <option value="유머">😊 유머</option>
              <option value="감동">💖 감동</option>
              <option value="그냥 혼잣말">💬 그냥 혼잣말</option>
              <option value="묻지마 격려">👏 묻지마 격려</option>
              <option value="이거 알려주세요">💡 이거 알려주세요</option>
            </select>