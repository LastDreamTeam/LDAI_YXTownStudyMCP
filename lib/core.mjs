// SPDX-License-Identifier: AGPL-3.0-only
import './extract.js';
import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename} from 'node:fs/promises';
import path from 'node:path';
export const X=globalThis.YXExtract;
export const SITE='https://www.yxtown.com';
export const delay=ms=>new Promise(r=>setTimeout(r,ms));
export const hash=v=>createHash('sha256').update(typeof v==='string'?v:JSON.stringify(v)).digest('hex');
export function requireUrl(value){const url=X.safeUrl(value,SITE);if(!url||!X.readAllowed(url))throw Error('URL_NOT_ALLOWED: 只接受游习堂已支持的只读页面');return url;}
export function filename(value){return String(value||'资料').replace(/[<>:"/\\|?*\x00-\x1f]/g,'_').replace(/[. ]+$/g,'').slice(0,100)||'资料';}
export async function atomicJson(file,data){await mkdir(path.dirname(file),{recursive:true});const temp=file+'.'+randomUUID()+'.tmp';await writeFile(temp,JSON.stringify(data,null,2)+'\n',{encoding:'utf8',mode:0o600});await rename(temp,file);}
export async function jsonFile(file,fallback){try{return JSON.parse(await readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return fallback;throw e;}}
export async function limitedText(response,max=3*1024*1024){let size=0,parts=[];for await(const part of response.body){size+=part.length;if(size>max){throw Error('RESPONSE_TOO_LARGE');}parts.push(part);}return Buffer.concat(parts).toString('utf8');}
export async function publicPage(value){let url=requireUrl(value);for(let redirects=0;redirects<4;redirects++){const r=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(18000),headers:{'User-Agent':'LD-YXTown-Study/0.1 (personal learning assistant)','Accept':'text/html'}});if(r.status>=300&&r.status<400){const next=X.safeUrl(r.headers.get('location'),url);if(next&&new URL(next).pathname==='/login')throw Error('LOGIN_REQUIRED: 此页面需要 Chrome 登录');url=requireUrl(next);continue;}if(!r.ok)throw Error('SITE_HTTP_'+r.status);if(!r.headers.get('content-type')?.includes('text/html'))throw Error('EXPECTED_HTML');const result=X.extract(await limitedText(r),url);delete result.downloadLinks;return {...result,access:'public_anonymous'};}throw Error('TOO_MANY_REDIRECTS');}
export function offered(g){if(!g)return null;const prices=(g.specifications||[]).map(s=>s.displayPrice).filter(x=>x!==null&&x!==undefined&&x!=='').map(Number).filter(Number.isFinite);return {title:g.title,listFrom:g.minPrice??null,listTo:g.maxPrice??null,displayFrom:g.minDisplayPrice??(prices.length?Math.min(...prices):null),displayTo:g.maxDisplayPrice??(prices.length?Math.max(...prices):null),currency:g.currency||g.specifications?.[0]?.priceObj?.currency||null,promotion:g.promotion||null};}
export function diffSnapshot(oldValue,newValue){if(!oldValue)return {kind:'baseline_created',changes:[]};const changes=[];for(const key of ['title','courses','goods','announcements','images','text'])if(hash(key==='courses'?(oldValue.courses||[]).map(({title,url,displayPrice})=>({title,url,displayPrice})):oldValue[key]??null)!==hash(key==='courses'?(newValue.courses||[]).map(({title,url,displayPrice})=>({title,url,displayPrice})):newValue[key]??null))changes.push(key);return {kind:changes.length?'changed':'unchanged',changes};}
const str=(description,extra={})=>({type:'string',description,...extra});
const integer=(description,min=1,max=5)=>({type:'integer',description,minimum:min,maximum:max});
const schema=(properties={},required=[])=>({type:'object',properties,required,additionalProperties:false});
const tool=(name,description,properties,required=[],write=false)=>({name,description,inputSchema:schema(properties,required),annotations:{readOnlyHint:!write,destructiveHint:false,idempotentHint:!write,openWorldHint:true}});
export const TOOLS=[
 tool('yxtown_status','连接状态、Chrome 登录可用性、缓存与本地保存位置。',{}),
 tool('yxtown_catalog','浏览/搜索公开课程目录，返回实际价格和分类链接。单次最多 5 页。',{query:str('关键词，可为空'),category:str('分类路径，例如 Unity3D、Unreal、server、GameArt'),order:str('排序',{enum:['latest','hotSeq','recommendedSeq']}),pages:integer('最多读取页数')}),
 tool('yxtown_read_page','读取游习堂公开页面：课程、套餐、公告、优惠、分类。仅 GET，返回来源和时间。',{url:str('游习堂页面 URL')},['url']),
 tool('yxtown_announcements','读取首页公告与优惠页面链接；图片优惠给出图片来源，不推断价格。',{}),
 tool('yxtown_my_courses','通过本机 Chrome 已有登录读取我的学习课程、网站显示的进度与继续学习入口。登录失效时明确返回。',{view:str('课程分类或个人套餐',{enum:['learning','learned','expired','favorites','bundles']}),pages:integer('最多读取页数')}),
 tool('yxtown_read_course','通过已登录 Chrome 读取指定课程/课时的目录、可见正文和官方资料入口。不会播放视频或写学习完成状态。',{url:str('课程、课时或资料页面 URL')},['url']),
 tool('yxtown_current_page','读取当前游习堂页面及可访问视频的播放位置，不播放或暂停。',{}),
 tool('yxtown_open','在 Chrome 打开一个课程/课时页面；可传时间提示，但不会自动播放视频或更改网站进度。',{url:str('游习堂 URL')},['url'],true),
 tool('yxtown_progress','读取本地最近学习位置、手工书签、最近同步的网站进度。本地书签不等于网站完成状态。',{}),
 tool('yxtown_bookmark','保存个人学习书签到本机用户数据目录，不提交网站学习完成状态。',{url:str('课程/课时 URL'),title:str('标题'),seconds:{type:'number',minimum:0,description:'视频位置，秒；未知时不要填'},note:str('下次继续的提示，最多 4000 字')},['url'],true),
 tool('yxtown_downloads','列出此课程/课时页面实际提供的官方附件，生成短期 resourceId，不返回签名下载 URL。',{url:str('课程或课时页面 URL')},['url']),
 tool('yxtown_download','下载上一步列出的官方同站附件到本地资料目录；单文件最多 128 MiB，串行，禁止媒体流/DRM/未知外站。',{resourceId:str('yxtown_downloads 返回的 ID')},['resourceId'],true),
 tool('yxtown_watchlist','管理个人感兴趣的课程/优惠页。只保存本地关注，不点击网站关注按钮。',{action:str('操作',{enum:['list','add','remove']}),url:str('关注的公开课程/优惠 URL'),label:str('个人备注')},['action'],true),
 tool('yxtown_check_changes','按需检查关注页的价格、目录、公告和内容变动。初次只建基线，不称为降价；不自动购买或发消息。',{limit:integer('本次检查上限',1,10)},[],true),
 tool('yxtown_save_note','保存有来源的学习笔记。明确区分实际课程内容、自己的推理和待验证事项。',{title:str('标题'),sourceUrl:str('课程/课时来源 URL'),content:str('Markdown 正文，最多 30000 字'),evidence:str('来源类型',{enum:['visible_course_text','official_attachment','user_notes','inference']})},['title','sourceUrl','content','evidence'],true),
 tool('yxtown_notes','搜索/列出本地学习笔记，可用 id 读取正文。',{query:str('关键词'),id:str('笔记 ID')}),
 tool('yxtown_local_files','列出本插件已下载并有来源记录的官方课件。',{}),
 tool('yxtown_read_attachment','读取本机已下载课件；PDF 按页提取正文，纯文本按容量限制读取。文件名从 yxtown_local_files 取得。',{filename:str('已登记文件的名称，不接受路径'),startPage:integer('PDF 起始页',1,100000),pages:integer('一次读取页数',1,12)},['filename']),
 tool('yxtown_export','导出可供 Codex/Dot 阅读的课程索引、进度、关注和笔记到 Markdown。不包含 Cookie、下载令牌或视频。',{},[],true)
];
export function validateArgs(name,args){const t=TOOLS.find(t=>t.name===name);if(!t)throw Error('UNKNOWN_TOOL');if(!args||typeof args!=='object'||Array.isArray(args))throw Error('INVALID_ARGUMENTS');for(const k of t.inputSchema.required)if(args[k]===undefined)throw Error('MISSING_ARGUMENT: '+k);for(const [k,v]of Object.entries(args)){const p=t.inputSchema.properties[k];if(!p)throw Error('UNKNOWN_ARGUMENT: '+k);if(p.type==='integer'?!Number.isInteger(v):typeof v!==p.type)throw Error('INVALID_TYPE: '+k);if(p.enum&&!p.enum.includes(v))throw Error('INVALID_ENUM: '+k);if(typeof v==='number'&&(!Number.isFinite(v)||v<(p.minimum??-Infinity)||v>(p.maximum??Infinity)))throw Error('OUT_OF_RANGE: '+k);if(typeof v==='string'&&v.length>32000)throw Error('ARGUMENT_TOO_LONG');}return t;}
