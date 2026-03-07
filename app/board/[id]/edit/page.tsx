import { sql } from '@vercel/postgres';
import EditClient from './EditClient';

export default async function EditPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  const { rows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = rows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다</div>;
  }

  // 화면 이동(redirect) 명령을 빼고, 성공/실패 결과만 반환하도록 수정했습니다.
  const updatePost = async (formData: FormData) => {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    
    try {
      await sql`
        UPDATE posts 
        SET title = ${title}, content = ${content} 
        WHERE id = ${postId}
      `;
      return { success: true };
    } catch (error) {
      console.error(error);
      return { success: false };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <main className="max-w-6xl mx-auto p-4 md:p-6 mt-4">
        <div className="bg-white rounded-sm shadow-sm border border-gray-200 p-6">
          <EditClient post={post} updateAction={updatePost} />
        </div>
      </main>
    </div>
  );
}