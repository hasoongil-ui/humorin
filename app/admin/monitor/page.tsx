// @ts-nocheck
import { sql } from '@vercel/postgres';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'; 
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

const s3 = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT || '',
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export default async function MonitorControlCenter(props: any) {
  const searchParams = await props.searchParams; 
  const cookieStore = await cookies();
  const userId = cookieStore.get('humorin_userid')?.value;

  if (userId !== 'admin') {
    let isRealAdmin = false;
    if (userId) {
      try {
        const { rows } = await sql`SELECT is_admin FROM users WHERE user_id = ${userId}`;
        if (rows.length > 0 && rows[0].is_admin) isRealAdmin = true;
      } catch(e) {}
    }
    if (!isRealAdmin) return redirect('/'); 
  }

  // ==========================================
  // 1. Neon Compute 엔진 연동
  // ==========================================
  let neonCuHrs = "0.00";
  let neonUsagePercentText = "0.0"; 
  let neonVisualPercent = "0.0";    
  const gaugeMaxCuHrs = 600; 
  const displayLimitText = 360; 

  try {
    if (process.env.NEON_PROJECT_ID && process.env.NEON_API_KEY) {
      const neonRes = await fetch(`https://console.neon.tech/api/v2/projects/${process.env.NEON_PROJECT_ID}`, {
        headers: { Authorization: `Bearer ${process.env.NEON_API_KEY}` },
        cache: 'no-store'
      });
      if (neonRes.ok) {
        const neonData = await neonRes.json();
        const seconds = neonData.project?.compute_time_seconds;
        if (seconds !== undefined) {
          const cuHours = seconds / 3600;
          neonCuHrs = cuHours.toFixed(2);
          neonUsagePercentText = ((cuHours / displayLimitText) * 100).toFixed(1);
          neonVisualPercent = Math.min((cuHours / gaugeMaxCuHrs) * 100, 100).toFixed(1);
        } else { neonCuHrs = "데이터없음"; }
      } else { neonCuHrs = "통신오류"; }
    } else { neonCuHrs = "키없음"; }
  } catch (e) { neonCuHrs = "에러"; } 

  // ==========================================
  // 2. Vercel Postgres DB 용량 연동
  // ==========================================
  let dbSizeBytes = 0;
  try {
    const sizeRes = await sql`SELECT pg_database_size(current_database()) as size_bytes`;
    dbSizeBytes = Number(sizeRes.rows[0].size_bytes) || 0;
  } catch(e: any) {}
  const dbSizeMB = (dbSizeBytes / 1024 / 1024).toFixed(2);

  // ==========================================
  // 3. Cloudflare R2 (게시판 미디어 vs 회원 프사 분리)
  // ==========================================
  let r2BoardSize = 0;
  let r2BoardCount = 0;
  let r2ProfileSize = 0;
  let r2ProfileCount = 0;

  if (process.env.R2_BUCKET_NAME && process.env.R2_ENDPOINT) {
    try {
      const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME });
      const { Contents } = await s3.send(command);
      if (Contents) {
        Contents.forEach(item => {
          if (item.Key && item.Key.startsWith('profiles/')) {
            r2ProfileCount++;
            r2ProfileSize += (item.Size || 0);
          } else {
            r2BoardCount++;
            r2BoardSize += (item.Size || 0);
          }
        });
      }
    } catch(e: any) { console.error("R2 에러:", e); }
  }
  
  const r2ProfileMB = (r2ProfileSize / 1024 / 1024).toFixed(2);
  const r2BoardMB = (r2BoardSize / 1024 / 1024).toFixed(2);
  const r2BoardGB = (r2BoardSize / 1024 / 1024 / 1024).toFixed(3); 

  // 통계 데이터
  let totalPosts = 0, totalComments = 0, blindPosts = 0;
  try {
    const { rows: postRows } = await sql`SELECT count(*) as cnt FROM posts`;
    totalPosts = postRows[0].cnt;
    const { rows: commentRows } = await sql`SELECT count(*) as cnt FROM comments`;
    totalComments = commentRows[0].cnt;
    const { rows: blindRows } = await sql`SELECT count(*) as cnt FROM posts WHERE is_blinded = true`;
    blindPosts = blindRows[0].cnt;
  } catch (e) {}

  const neonEgressGB = "0.00";      
  const neonStorageGB = "0.03";    

  // ==========================================
  // 관리자 액션 함수 1: [게시판] 유령 파일 청소
  // ==========================================
  const cleanUpGhostFiles = async () => {
    'use server';
    let finalCount = 0;
    let finalSizeMB = "0.00";
    try {
      if (process.env.R2_BUCKET_NAME) {
        const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME });
        const { Contents } = await s3.send(command);
        if (Contents) {
          const r2KeysToDelete = [];
          let deletedCount = 0;
          let deletedSizeBytes = 0;
          const chunkSize = 50;
          for (let i = 0; i < Contents.length; i += chunkSize) {
            const chunk = Contents.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (item) => {
              if (!item.Key) return;
              const fileName = item.Key; 
              
              if (fileName.startsWith('profiles/')) return;
              
              const { rows: postCheck } = await sql`SELECT id FROM posts WHERE content LIKE ${'%' + fileName + '%'} LIMIT 1`;
              const { rows: commentCheck } = await sql`SELECT id FROM comments WHERE content LIKE ${'%' + fileName + '%'} OR image_data LIKE ${'%' + fileName + '%'} LIMIT 1`;

              if (postCheck.length === 0 && commentCheck.length === 0) {
                r2KeysToDelete.push({ Key: item.Key }); 
                deletedCount++;
                deletedSizeBytes += (item.Size || 0);
              }
            }));
          }
          if (r2KeysToDelete.length > 0) {
            for (let i = 0; i < r2KeysToDelete.length; i += 1000) {
              const deleteChunk = r2KeysToDelete.slice(i, i + 1000);
              await s3.send(new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: { Objects: deleteChunk }
              }));
            }
          }
          finalCount = deletedCount;
          finalSizeMB = (deletedSizeBytes / 1024 / 1024).toFixed(2);
        }
      }
    } catch (error) {}
    redirect(`/admin/monitor?cleared=true&count=${finalCount}&size=${finalSizeMB}&t=${Date.now()}`);
  };

  // ==========================================
  // 관리자 액션 함수 2: [탈퇴/변경] 유령 프사 청소 
  // ==========================================
  const cleanUpGhostProfiles = async () => {
    'use server';
    let finalCount = 0;
    let finalSizeMB = "0.00";
    try {
      if (process.env.R2_BUCKET_NAME) {
        const command = new ListObjectsV2Command({ Bucket: process.env.R2_BUCKET_NAME, Prefix: 'profiles/' });
        const { Contents } = await s3.send(command);
        if (Contents) {
          const r2KeysToDelete = [];
          let deletedCount = 0;
          let deletedSizeBytes = 0;
          const chunkSize = 50;
          
          for (let i = 0; i < Contents.length; i += chunkSize) {
            const chunk = Contents.slice(i, i + chunkSize);
            await Promise.all(chunk.map(async (item) => {
              if (!item.Key) return;
              const fileName = item.Key; 
              
              try {
                const { rows: userCheck } = await sql`
                  SELECT user_id FROM users 
                  WHERE profile_image LIKE ${'%' + fileName + '%'} 
                  LIMIT 1
                `;
                
                if (userCheck.length === 0) {
                  r2KeysToDelete.push({ Key: item.Key }); 
                  deletedCount++;
                  deletedSizeBytes += (item.Size || 0);
                }
              } catch(dbError) {
                console.error("DB 검사 오류:", dbError);
                throw new Error("안전 중단");
              }
            }));
          }
          
          if (r2KeysToDelete.length > 0) {
            for (let i = 0; i < r2KeysToDelete.length; i += 1000) {
              const deleteChunk = r2KeysToDelete.slice(i, i + 1000);
              await s3.send(new DeleteObjectsCommand({
                Bucket: process.env.R2_BUCKET_NAME,
                Delete: { Objects: deleteChunk }
              }));
            }
          }
          finalCount = deletedCount;
          finalSizeMB = (deletedSizeBytes / 1024 / 1024).toFixed(2);
        }
      }
    } catch (error) {}
    redirect(`/admin/monitor?profileCleared=true&count=${finalCount}&size=${finalSizeMB}&t=${Date.now()}`);
  };

  const emergencyDeleteJunkPosts = async () => {
    'use server';
    try {
      await sql`DELETE FROM posts WHERE likes = 0 AND views < 50 AND (SELECT count(*) FROM comments c WHERE c.post_id = posts.id) = 0 ORDER BY date ASC LIMIT 10`;
      revalidatePath('/admin/monitor');
    } catch(e) {}
  };

  const cleanUpGhostComments = async () => {
    'use server';
    try {
      await sql`DELETE FROM comments WHERE post_id NOT IN (SELECT id FROM posts)`;
      revalidatePath('/admin/monitor');
    } catch(e) {}
  };

  return (
    <div className="min-h-screen bg-[#0f111a] text-gray-100 font-sans p-4 md:p-8">
      <div className="max-w-[1500px] mx-auto">
        
        {searchParams?.cleared === 'true' && (
          <div className="mb-6 bg-emerald-900/40 border border-emerald-500 p-4 rounded-md flex justify-between items-center shadow-[0_0_15px_rgba(16,185,129,0.2)]">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🧹</span>
              <div>
                <h3 className="text-emerald-400 font-black text-lg">게시판 미디어 싹쓸이 완료!</h3>
                <p className="text-emerald-100/70 text-sm font-bold">
                  R2 창고에서 총 <span className="text-white text-base">{searchParams.count}개</span>의 쓰레기 파일 (<span className="text-white text-base">{searchParams.size} MB</span>)을 완벽하게 영구 삭제했습니다.
                </p>
              </div>
            </div>
            <Link href="/admin/monitor" className="px-4 py-2 bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold rounded transition-colors shadow">
              확인 (닫기) ✕
            </Link>
          </div>
        )}

        {searchParams?.profileCleared === 'true' && (
          <div className="mb-6 bg-pink-900/40 border border-pink-500 p-4 rounded-md flex justify-between items-center shadow-[0_0_15px_rgba(236,72,153,0.2)]">
            <div className="flex items-center gap-4">
              <span className="text-3xl">👻</span>
              <div>
                <h3 className="text-pink-400 font-black text-lg">유령 프사 싹쓸이 완료!</h3>
                <p className="text-pink-100/70 text-sm font-bold">
                  R2 창고에서 총 <span className="text-white text-base">{searchParams.count}개</span>의 탈퇴/찌꺼기 프사 (<span className="text-white text-base">{searchParams.size} MB</span>)를 영구 삭제했습니다.
                </p>
              </div>
            </div>
            <Link href="/admin/monitor" className="px-4 py-2 bg-pink-800 hover:bg-pink-700 text-white text-xs font-bold rounded transition-colors shadow">
              확인 (닫기) ✕
            </Link>
          </div>
        )}

        <div className="flex flex-col md:flex-row justify-between items-center mb-8 border-b border-slate-700 pb-4 gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-emerald-400 flex items-center gap-2">🖥️ 유머인 궁극의 종합 관제탑</h1>
            <p className="text-slate-400 text-sm mt-1 font-bold">오직 최고 관리자만 접근할 수 있는 1급 보안 구역 및 서버 상태 모니터링</p>
          </div>
          <Link href="/admin" className="px-5 py-2 bg-slate-800 text-white font-bold rounded-sm border border-slate-600 hover:bg-slate-700 transition-colors shrink-0">&larr; 관리자 메인으로</Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          
          <div className="bg-slate-800/80 border border-slate-600 p-6 rounded-md shadow-lg flex flex-col relative overflow-hidden">
            <h2 className="text-xl font-black text-white mb-6 flex items-center gap-2 pb-3 border-b border-slate-700">
              <span className="text-2xl">🏢</span> Vercel 본관 <span className="text-xs font-normal text-slate-400 ml-auto bg-slate-900 px-2 py-1 rounded">Pro (1000GB 무료)</span>
            </h2>
            
            <div className="mb-6 bg-red-950/40 border border-red-800 p-4 rounded-md">
              <div className="flex items-start gap-3">
                <span className="text-xl mt-0.5">⚠️</span>
                <div className="flex-1">
                  <p className="text-red-400 font-bold text-[14px] mb-2">
                    아래 항목 초과 시 셧다운 주의!(Pro 버전으로 변경으로 여유))
                  </p>
                  <ul className="text-red-200/80 font-medium text-[13px] space-y-1 bg-black/20 p-2.5 rounded border border-red-900/30">
                    <li>• Fluid Active CPU <span className="text-white font-bold">(1000H)</span></li>
                    <li>• Fast Data Transfer <span className="text-white font-bold">(1000GB)</span></li>
                    <li>• Fast Origin Transfer <span className="text-white font-bold">(100GB)</span></li>
                  </ul>
                  <p className="text-slate-400 font-medium text-[12px] mt-2.5 leading-tight">
                    해당 데이터는 외부 연동이 불가하므로<br/>
                    <span className="text-red-300 font-bold">Vercel 공홈 직접 확인 필수</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-2">
              <div className="flex justify-between text-[14px] md:text-[15px] font-black mb-2">
                <span className="text-slate-300">초기 텍스트 DB (Postgres)</span>
                <span className="text-indigo-400">{dbSizeMB} MB <span className="text-xs text-slate-400 font-bold">/ 256 MB</span></span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 overflow-hidden">
                <div className={`h-full ${Number(dbSizeMB) > 200 ? 'bg-red-500' : 'bg-indigo-500'}`} style={{ width: `${Math.min((Number(dbSizeMB) / 256) * 100, 100)}%` }}></div>
              </div>
              <p className="text-xs md:text-[12px] text-slate-400 mt-2 text-right font-bold">✅ 초과 시 DB 마비 (텍스트 전용 방어막)</p>
            </div>

            <div className="mt-auto pt-5 border-t border-slate-700/50 flex justify-end">
              <a href="https://vercel.com/hasoongil-uis-projects/~/usage" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5 bg-slate-900 px-4 py-2 rounded-sm border border-slate-600 hover:bg-slate-700">
                Vercel 3대장 직접 확인하기 ↗
              </a>
            </div>
          </div>

          <div className="bg-[#1a1e26] border border-amber-500/30 p-6 rounded-md shadow-lg flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500 rounded-full blur-[60px] opacity-10"></div>
            <h2 className="text-xl font-black text-amber-400 mb-6 flex items-center gap-2 pb-3 border-b border-amber-900/50">
              <span className="text-2xl">🗄️</span> Neon 메인 DB <span className="text-xs font-normal text-amber-500/70 ml-auto bg-amber-950/50 px-2 py-1 rounded border border-amber-900/50">월 $19 결제중</span>
            </h2>

            <div className="mb-5 relative z-10">
              <div className="flex justify-between text-[14px] md:text-[15px] font-black mb-2">
                <span className="text-amber-200">엔진 구동량 (Compute)</span>
                <span className="text-amber-400">{neonCuHrs} <span className="text-xs text-amber-600 font-bold">/ 360 CU-hrs</span></span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3.5 border border-slate-700 relative overflow-hidden">
                <div className={`h-full transition-all duration-1000 ${Number(neonCuHrs) > 360 ? 'bg-red-500' : 'bg-amber-500'}`} style={{ width: `${neonVisualPercent}%` }}></div>
                <div className="absolute top-0 bottom-0 border-l-[2px] border-dashed border-red-500 z-10" style={{ left: `${(360 / gaugeMaxCuHrs) * 100}%` }}></div>
              </div>
              <p className="text-xs md:text-[12px] text-amber-500/70 mt-2 text-right font-bold">✅ 0.5 CU 자물쇠로 완벽 방어 중 ({neonUsagePercentText}% 소모됨)</p>
            </div>

            <div className="mb-5 relative z-10">
              <div className="flex justify-between text-[14px] md:text-[15px] font-black mb-2">
                <span className="text-rose-200">데이터 유출량 (Egress)</span>
                <span className="text-rose-400">{neonEgressGB} GB <span className="text-xs text-rose-800 font-bold">/ 100 GB</span></span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 overflow-hidden shadow-[0_0_8px_rgba(225,29,72,0.15)]">
                <div className="bg-rose-500 h-full" style={{ width: `${Math.min((Number(neonEgressGB) / 100) * 100, 100)}%` }}></div>
              </div>
              <p className="text-xs md:text-[12px] text-rose-400/80 mt-2 text-right font-bold">🚨 해커 스크래핑 시 수십만원 요금 폭탄 주의</p>
            </div>

            <div className="mb-2 relative z-10">
              <div className="flex justify-between text-[14px] md:text-[15px] font-black mb-2">
                <span className="text-amber-100/70">메인 DB 용량 (Storage)</span>
                <span className="text-amber-100/70">{neonStorageGB} GB <span className="text-xs text-slate-500 font-bold">/ 10 GB</span></span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-2 border border-slate-700 overflow-hidden">
                <div className="bg-amber-600 h-full" style={{ width: `${Math.min((Number(neonStorageGB) / 10) * 100, 100)}%` }}></div>
              </div>
              <p className="text-xs md:text-[12px] text-slate-400 mt-2 text-right font-bold">✅ 텍스트 전용 저장이라 평생 넉넉함</p>
            </div>

            <div className="mt-auto pt-5 border-t border-amber-900/30 flex justify-end relative z-10">
              <a href="https://console.neon.tech/app/projects" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-amber-500 hover:text-amber-300 transition-colors flex items-center gap-1.5 bg-amber-950/30 px-4 py-2 rounded-sm border border-amber-900/50 hover:bg-amber-900/50">
                Neon 대시보드 바로가기 ↗
              </a>
            </div>
          </div>

          <div className="bg-[#121c29] border border-sky-500/30 p-6 rounded-md shadow-lg flex flex-col relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500 rounded-full blur-[60px] opacity-10"></div>
            <h2 className="text-xl font-black text-sky-400 mb-6 flex items-center gap-2 pb-3 border-b border-sky-900/50">
              <span className="text-2xl">🛡️</span> Cloudflare 저장소 <span className="text-xs font-normal text-sky-300/70 ml-auto bg-sky-950/50 px-2 py-1 rounded border border-sky-900/50">R2 (10GB 무료)</span>
            </h2>

            <div className="mb-5 relative z-10">
              <div className="flex justify-between text-[14px] md:text-[15px] font-black mb-2">
                <span className="text-pink-300">회원 프사 전용 보관함 (profiles)</span>
                <span className="text-pink-400">{r2ProfileMB} MB <span className="text-xs text-pink-800 font-bold">/ 1,024 MB</span></span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 overflow-hidden">
                <div className="bg-pink-500 h-full" style={{ width: `${Math.min((Number(r2ProfileMB) / 1024) * 100, 100)}%` }}></div>
              </div>
              <p className="text-xs md:text-[12px] text-pink-400/60 mt-2 text-right font-bold">✅ 현재 총 {r2ProfileCount}개 회원 프사 안전 보관 중</p>
            </div>

            <div className="mb-6 relative z-10">
              <div className="flex justify-between text-[14px] md:text-[15px] font-black mb-2">
                <span className="text-sky-200">게시판 미디어 창고 (본문 이미지)</span>
                <span className="text-sky-400">{r2BoardGB} GB <span className="text-xs text-slate-400 font-bold">/ 10 GB</span></span>
              </div>
              <div className="w-full bg-slate-900 rounded-full h-3 border border-slate-700 overflow-hidden">
                <div className="bg-sky-500 h-full" style={{ width: `${Math.min((Number(r2BoardGB) / 10) * 100, 100)}%` }}></div>
              </div>
              <p className="text-xs md:text-[12px] text-sky-400/60 mt-2 text-right font-bold">✅ 현재 총 {r2BoardCount}개 게시글 파일 저장 중 ({r2BoardMB} MB)</p>
            </div>

            <div className="mt-auto pt-3 border-t border-sky-900/30 flex justify-end relative z-10">
              {/* 🚨 대장님이 주신 Cloudflare R2 직행 링크로 교체! */}
              <a href="https://dash.cloudflare.com/7394bc5926cfa8cc846b26750a3a81ee/r2/overview" target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-sky-500 hover:text-sky-300 transition-colors flex items-center gap-1.5 bg-sky-950/30 px-4 py-2 rounded-sm border border-sky-900/50 hover:bg-sky-900/50">
                Cloudflare R2 직접 확인하기 ↗
              </a>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-bold text-blue-300 mb-4">📈 데이터 세부 현황</h3>
            <ul className="space-y-4 font-bold text-[15px]">
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700"><span>📝 총 게시글</span><span className="text-white">{totalPosts} 개</span></li>
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700"><span>💬 총 댓글</span><span className="text-white">{totalComments} 개</span></li>
              <li className="flex justify-between items-center bg-slate-900 p-3 rounded border border-slate-700"><span className="text-rose-400">🚨 블라인드 글</span><span className="text-rose-400">{blindPosts} 개</span></li>
            </ul>
          </div>

          <div className="bg-rose-900/10 border border-rose-900/50 p-6 rounded-md shadow-lg">
            <h3 className="text-lg font-bold text-rose-400 mb-4">🚨 서버 비상 조치</h3>
            <div className="space-y-3">
              <form action={cleanUpGhostFiles}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-sky-600/50 rounded text-left transition-colors">
                  <div>
                    <div className="text-sky-400 font-black text-[14px]">🌀 미디어 창고 '유령 파일' 싹쓸이 청소</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">DB에 없는 게시판 파일만 삭제 (프사 절대 보호)</div>
                  </div>
                  <span className="text-sky-400">▶</span>
                </button>
              </form>
              <form action={cleanUpGhostProfiles}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-pink-600/50 rounded text-left transition-colors">
                  <div>
                    <div className="text-pink-400 font-black text-[14px]">👻 탈퇴 회원 '유령 프사' 싹쓸이 청소</div>
                    <div className="text-[11px] text-slate-400 mt-1 font-medium">DB 장부에 없는 탈퇴/찌꺼기 프사만 골라 삭제합니다.</div>
                  </div>
                  <span className="text-pink-400">▶</span>
                </button>
              </form>
              <form action={emergencyDeleteJunkPosts}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-left transition-colors">
                  <div className="text-orange-400 font-black text-[14px]">🧹 조회수 낮은 유령 게시글 10개 삭제</div>
                  <span className="text-orange-400">▶</span>
                </button>
              </form>
              <form action={cleanUpGhostComments}>
                <button type="submit" className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-700 border border-indigo-600/50 rounded text-left transition-colors">
                  <div className="text-indigo-400 font-black text-[14px]">👻 부모 잃은 유령 댓글 싹쓸이 청소</div>
                  <span className="text-indigo-400">▶</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}