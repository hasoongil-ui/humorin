import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import WriteClient from './WriteClient';

export default async function WritePage() {
  const cookieStore = await cookies();
  const userCookie = cookieStore.get('ojemi_user');
  const currentUser = userCookie ? userCookie.value : null;

  // 💡 미나의 철통 방어막: 출입증이 없으면 얄짤없이 로그인 페이지로 쫓아냅니다!
  if (!currentUser) {
    redirect('/login');
  }

  // 출입증이 확인되면, 가짜 이름을 쓰지 못하도록 진짜 이름(currentUser)을 손에 쥐여서 들여보냅니다.
  return <WriteClient currentUser={currentUser} />;
}