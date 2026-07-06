import { sql } from '@vercel/postgres';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

const SECRET_KEY = process.env.AUTH_SECRET || 'humorin-super-secret-key-2026-very-safe';

async function verifyAdmin() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('humorin_userid')?.value;
  const signature = cookieStore.get('humorin_signature')?.value;
  if (!userId || !signature) return false;
  const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(userId).digest('hex');
  if (signature !== expectedSignature) return false;
  try {
    if (userId === 'admin') return true;
    const { rows } = await sql`SELECT is_admin FROM users WHERE user_id = ${userId}`;
    return rows.length > 0 && rows[0].is_admin;
  } catch { return false; }
}

async function updateVipBlacklist(formData: FormData) {
  'use server';
  if (!(await verifyAdmin())) throw new Error("Unauthorized");

  const newBlacklist = formData.get('vip_blacklist')?.toString().trim() || '';
  try {
    await sql`
      INSERT INTO site_settings (key, value) 
      VALUES ('vip_blacklist', ${newBlacklist}) 
      ON CONFLICT (key) DO UPDATE SET value = ${newBlacklist};
    `;
    revalidatePath('/admin/setup');
  } catch (e) {
    console.error(e);
  }
}

export default async function AdminSetupPage() {
  const isAdmin = await verifyAdmin();
  if (!isAdmin) redirect('/'); 

  let currentVipBlacklist = '';
  try {
    const { rows } = await sql`SELECT value FROM site_settings WHERE key = 'vip_blacklist'`;
    if (rows.length > 0 && rows[0].value) {
      currentVipBlacklist = rows[0].value;
    }
  } catch (e) {}

  return (
    <div className="min-h-screen bg-gray-50 font-sans p-4 md:p-8 flex justify-center">
      <div className="max-w-3xl w-full pt-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800 tracking-tight">🏆 VIP / 고급 설정</h1>
            <p className="text-sm font-bold text-gray-500 mt-1">명예의 전당 VVIP 시스템의 세부 설정을 제어합니다.</p>
          </div>
          <Link 
            href="/admin" 
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#2a3042] text-white text-[13px] font-bold rounded-sm hover:bg-[#1e2330] transition-colors shadow-sm"
          >
            <span>◀</span> 관리자 메인으로 돌아가기
          </Link>
        </div>

        <div className="bg-white p-8 md:p-10 rounded-sm shadow-xl border border-gray-200">
          <h2 className="text-[17px] font-black text-gray-800 mb-2 flex items-center gap-2">
            <span className="text-orange-500">🚫</span> 주간 VIP 선정 제외 (블랙리스트)
          </h2>
          <p className="text-[13px] text-gray-500 mb-6 font-bold leading-relaxed">
            명예의 전당 주간 VIP 선정에서 영구적으로 제외할 운영자 및 테스트 <b className="text-gray-700">로그인 아이디</b>를 쉼표(,)로 구분하여 입력하세요.<br/>
            (예: ruffian71, test1, test2)
          </p>
          <form action={updateVipBlacklist} className="flex flex-col gap-4">
            <textarea
              name="vip_blacklist"
              defaultValue={currentVipBlacklist}
              rows={6}
              className="w-full p-4 bg-gray-50 border border-gray-300 rounded-sm outline-none focus:border-orange-400 font-mono text-[14px] shadow-sm resize-y"
              placeholder="제외할 아이디들을 쉼표로 구분해서 입력..."
            />
            <button 
              type="submit" 
              className="self-end px-8 py-3 bg-orange-600 text-white font-black text-[14px] rounded-sm hover:bg-orange-700 transition-colors shadow-sm whitespace-nowrap"
            >
              블랙리스트 저장
            </button>
          </form>
        </div>

      </div>
    </div>
  );
}