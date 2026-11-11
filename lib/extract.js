// SPDX-License-Identifier: AGPL-3.0-only
/* OpenAI: Pure, dependency-free extraction. HTML is data, never executed. */
(() => {
  const decode=s=>String(s??'').replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi,(m,k)=>{
    if(k[0]==='#'){const n=k[1].toLowerCase()==='x'?parseInt(k.slice(2),16):Number(k.slice(1));return n>0&&n<=0x10ffff?String.fromCodePoint(n):'';}
    return {amp:'&',lt:'<',gt:'>',quot:'"',apos:"'",nbsp:' '}[k.toLowerCase()];
  });
  const compact=s=>decode(s).replace(/\s+/g,' ').trim();
  function tree(html){
    const root={tag:'root',attrs:{},children:[]};const stack=[root];
    const clean=String(html).replace(/<!--[\s\S]*?-->/g,'').replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi,'');
    const re=/<\/?[a-z](?:[^'"<>]|"[^"]*"|'[^']*')*>|[^<]+/gi;
    for(const m of clean.matchAll(re)){
      const token=m[0];if(token[0]!=='<'){stack.at(-1).children.push(decode(token));continue;}
      const tag=token.match(/^<\/?([\w-]+)/)?.[1].toLowerCase();if(!tag)continue;
      if(token[1]==='/'){let i=stack.length-1;while(i>0&&stack[i].tag!==tag)i--;if(i>0)stack.length=i;continue;}
      const attrs={};const body=token.slice(tag.length+1,-1);
      for(const a of body.matchAll(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g))attrs[a[1].toLowerCase()]=decode(a[2]??a[3]??a[4]??'');
      const node={tag,attrs,children:[]};stack.at(-1).children.push(node);
      if(!/^(?:area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)$/.test(tag)&&!token.endsWith('/>'))stack.push(node);
    }return root;
  }
  const all=(node,predicate,out=[])=>{if(typeof node==='string')return out;if(predicate(node))out.push(node);for(const ch of node.children)all(ch,predicate,out);return out;};
  const text=node=>typeof node==='string'?node:/^(?:script|style|template|textarea|input|noscript)$/.test(node.tag)||node.attrs?.hidden!==undefined||/display:\s*none/i.test(node.attrs?.style||'')?'':node.children.map(text).join(' ');
  const has=(node,name)=>(node.attrs.class??'').split(/\s+/).includes(name);
  const safeUrl=(value,base)=>{try{const u=new URL(value,base);if(u.protocol!=='https:'||!['www.yxtown.com','yxtown.com'].includes(u.hostname)||u.username||u.password||u.port)return null;u.hash='';return u.href;}catch{return null;}};
  function readAllowed(value){
    const u=safeUrl(value,'https://www.yxtown.com');if(!u)return false;const p=new URL(u).pathname;
    if([...new URL(u).searchParams.keys()].some(k=>!/^(?:q|page|targetId|orderBy|type|tab|preview|subCategory|selectedthirdLevelCategory|category|filter\[(?:price|type|currentLevelId)\])$/.test(k)))return false;
    if(new URL(u).searchParams.has('targetId')&&(!/^\/goods\/show\/\d+$/.test(p)||!/^\d+$/.test(new URL(u).searchParams.get('targetId'))))return false;
    return p==='/'||/^\/(?:course\/explore(?:\/[\w-]+)?|(?:cloud\/)?search|goods\/show\/\d+|page\/[\w-]+|announcement\/\d+\/opreate\/global\/show|article(?:\/\d+)?|(?:my\/)?classroom\/\d+(?:\/courses)?|(?:my\/)?course\/\d+(?:\/(?:summary|tasks|materials|notes|reviews|task\/\d+\/show))?|my\/(?:courses|course_sets|classrooms)(?:\/(?:learning|learned|teaching|favorited|archived))?)\/?$/.test(p);
  }
  function cleanLink(u){const v=new URL(u);for(const key of [...v.searchParams.keys()])if(/token|sign|auth|secret|password|code|key/i.test(key))v.searchParams.delete(key);return v.href;}
  function extract(html,url){
    const dom=tree(html);const nodes=all(dom,()=>true);const first=p=>nodes.find(p);
    const links=nodes.filter(n=>n.tag==='a'&&n.attrs.href).map(n=>({label:compact(text(n)).slice(0,300),url:safeUrl(n.attrs.href,url),title:n.attrs.title??'',download:'download' in n.attrs})).filter(n=>n.url);
    const cards=nodes.filter(n=>has(n,'course-item')||has(n,'course-wide-list-item')||has(n,'course-item--normal')||has(n,'my-course-item'));
    const courses=[];
    for(const card of cards){const as=all(card,n=>n.tag==='a');const a=as.find(n=>n.attrs.title&&/\/course\/\d+|\/goods\/show\/\d+/.test(n.attrs.href??''))??as.find(n=>compact(text(n))&&/\/course\/\d+|\/goods\/show\/\d+/.test(n.attrs.href??''));if(!a)continue;
      const cu=safeUrl(a.attrs.href,url);if(!cu)continue;const price=all(card,n=>has(n,'course-price-widget')).map(n=>compact(text(n))).join(' ');
      const ct=compact(text(card));const progress=all(card,n=>has(n,'progress-bar')).map(n=>({percent:n.attrs['aria-valuenow']??n.attrs.style?.match(/width:\s*([\d.]+)%/)?.[1]??null}));
      courses.push({title:a.attrs.title||compact(text(a)),url:cleanLink(cu),displayPrice:price||null,progress:ct.match(/学习进度\s*([\d.]+)\s*%/)?.[1]??progress[0]?.percent??null,context:ct.slice(0,900)});
    }
    let goods=null;const gn=first(n=>n.attrs['data-goods']);if(gn){try{const g=JSON.parse(gn.attrs['data-goods']);const select=o=>({id:o.id,title:o.title,price:o.price,displayPrice:o.displayPrice,priceObj:o.priceObj,usageMode:o.usageMode,taskNum:o.taskNum,learnedNum:o.learnedNum});goods={id:g.id,type:g.type,title:g.title,subtitle:g.subtitle,price:g.price,minPrice:g.minPrice,maxPrice:g.maxPrice,minDisplayPrice:g.minDisplayPrice,maxDisplayPrice:g.maxDisplayPrice,currency:g.minDisplayPriceObj?.currency||g.minPriceObj?.currency||null,promotion:g.discount?{name:g.discount.name,type:g.discount.discountType,startTime:g.discount.startTime,endTime:g.discount.endTime}:null,summary:compact(String(g.summary??'').replace(/<[^>]*>/g,'')).slice(0,18000),specifications:(g.specs??g.specifications??[]).map(select)};}catch{}}
    const content=first(n=>n.attrs.id==='content-container')??first(n=>n.tag==='main')??first(n=>has(n,'es-section'))??first(n=>n.tag==='body')??dom;
    const contentText=compact(text(content)).split(/\{\s*"resource"\s*:\s*\{|window\.app\s*=/)[0].slice(0,64000);const login=first(n=>n.tag==='meta'&&n.attrs.name==='is-login')?.attrs.content;
    const downloadLinks=links.filter(n=>(n.download&&new URL(n.url).pathname!==new URL(url).pathname)||/下载|download/i.test(n.label)&&!/浏览器|firefox|chrome/i.test(n.label)).filter(n=>n.url!==url&&!new URL(n.url).hash&&(/download|attachment|material|\/files\//i.test(new URL(n.url).pathname)||n.download)).slice(0,80);
    const controls=nodes.filter(n=>['a','button'].includes(n.tag)&&/^下载(?:资料|文件)?$/.test(compact(text(n)))).map(n=>({tag:n.tag,label:compact(text(n)),keys:Object.keys(n.attrs),routes:Object.entries(n.attrs).filter(([k,v])=>['href','data-url','data-download-url','formaction'].includes(k)&&String(v).startsWith('/')).map(([k,v])=>({key:k,path:new URL(v,url).pathname.replace(/\b[0-9a-f]{22,}\b/gi,'[opaque]')}))}));
    const activity=new URL(url).pathname.match(/^\/course\/(\d+)\/task\/(\d+)\/activity_show$/);if(activity){for(const n of nodes.filter(n=>n.tag==='a'&&compact(text(n))==='下载')){const route=safeUrl(n.attrs['data-url'],url);if(!route||new URL(route).pathname!=='/course/'+activity[1]+'/activiy/'+activity[2]+'/download'||!('data-file-id' in n.attrs))continue;const name=compact(text(dom)).match(/([^<>()[\]{}]{1,120}\.(?:pdf|zip|rar|7z|docx?|pptx?|xlsx?|txt|mp4|webm|mov|m4v|unitypackage))\s*\(\s*[\d.]+\s*[KMG]?B\)/i)?.[1]?.trim().split('Powered By EduSoho ').at(-1)?.trim();downloadLinks.push({url:new URL(route,url).href,label:name||'下载资料',title:name||'下载资料',download:true});}}
    let outlineItems=[];const directory=new URL(url).pathname.match(/^\/course\/(\d+)\/task\/list\/render\/default$/);if(directory){for(const n of nodes){for(const value of n.children.filter(c=>typeof c==='string')){const raw=value.trim();if(!raw.startsWith('[{')||!raw.includes('"itemType"'))continue;try{const items=JSON.parse(raw);outlineItems=items.filter(t=>t.itemType==='task'&&t.status==='published'&&/^\d+$/.test(String(t.taskId))).map(t=>({label:t.title,title:t.title,url:new URL('/course/'+directory[1]+'/task/'+t.taskId+'/show',url).href,type:t.type,duration:t.activityLength||null,siteLearningStatus:t.resultStatus||null,locked:!!t.lock}));}catch{}if(outlineItems.length)break;}if(outlineItems.length)break;}}
    const useful=links.filter(n=>readAllowed(n.url)).map(n=>({...n,url:cleanLink(n.url)}));
    const announcements=nodes.filter(n=>has(n,'alert-link')).map(n=>({text:compact(text(n)),url:safeUrl(n.attrs['data-url']||n.attrs.href,url)}));
    const images=all(content,n=>n.tag==='img'&&(n.attrs['data-echo']||n.attrs.src)).map(n=>({alt:n.attrs.alt??'',url:safeUrl(n.attrs['data-echo']||n.attrs.src,url)})).filter(n=>n.url&&/^\/(?:files|assets|static)[\w/-]*\//.test(new URL(n.url).pathname)&&!/qr(?:code)?|token|ticket|signature|secret/i.test(n.url)).map(n=>({...n,url:n.url.split('?')[0]})).slice(0,30);
    const linkedPaths=(node,keys)=>keys.flatMap(k=>{const v=node.attrs[k];if(!v||!v.startsWith('/'))return [];const u=safeUrl(v,url);return u?[{kind:k,path:new URL(u).pathname}]:[]});
    const framePaths=nodes.filter(n=>n.tag==='iframe').flatMap(n=>linkedPaths(n,['src','data-url','data-src'])).filter(o=>!o.path.includes('token')&&/^\/(?:course|activity)\/\d+[\w/-]*$/.test(o.path));
    const directoryPaths=nodes.filter(n=>/task|catalo|course-detail/i.test((n.attrs.id||'')+' '+(n.attrs.class||''))).flatMap(n=>linkedPaths(n,['data-url','data-course-url','data-list-url'])).filter(o=>/^\/course\/\d+\/task\/list\/render\/default$/.test(o.path)).map(o=>o.path).filter((p,i,a)=>a.indexOf(p)===i);
    const studyNavigation=links.filter(a=>['我的套餐','已学完','已过期','收藏','目录','资料','课程资料'].includes(a.label)).map(a=>({label:a.label,path:new URL(a.url).pathname}));
    return {url:cleanLink(url),title:compact(text(first(n=>n.tag==='title')??{children:[]})),authenticated:login==='1',loginRequired:new URL(url).pathname==='/login',observedAt:new Date().toISOString(),courses,goods,links:useful.slice(0,180),announcements,images,text:contentText.slice(0,32000),textTruncated:contentText.length>32000,downloadLinks,outlineItems,controls,framePaths,directoryPaths,studyNavigation,hasVideo:nodes.some(n=>n.tag==='video'||n.tag==='iframe'||/player|video/.test(n.attrs.id??'')),source:'website_html'};
  }
  globalThis.YXExtract={decode,tree,all,text,compact,extract,safeUrl,readAllowed,cleanLink};
})();
