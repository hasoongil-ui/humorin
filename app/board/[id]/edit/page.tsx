import { sql } from '@vercel/postgres';
import { redirect } from 'next/navigation';
import EditClient from './EditClient';

export default async function EditPage(props: any) {
  const params = await props.params;
  const postId = params.id;

  const { rows } = await sql`SELECT * FROM posts WHERE id = ${postId}`;
  const post = rows[0];

  if (!post) {
    return <div className="p-20 text-center text-2xl font-bold">글을 찾을 수 없습니다</div>;
  }

  const updatePost = async (formData: FormData) => {
    'use server';
    const title = formData.get('title') as string;
    const content = formData.get('content') as string;
    
    await sql`
      UPDATE posts 
      SET title = ${title}, content = ${content} 
      WHERE id = ${postId}
    `;
    
    redirect(`/board/${postId}`);
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