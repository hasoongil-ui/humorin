import { redirect } from 'next/navigation';

export default function HomePage() {
  // 💡 미나의 마법: ojemi.kr 로 접속하는 모든 유저를, 최신식 게시판인 ojemi.kr/board 로 0.1초 만에 자동 납치(?) 합니다!
  redirect('/board');
}