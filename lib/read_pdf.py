# SPDX-License-Identifier: AGPL-3.0-only
import json, sys
sys.path.insert(0,sys.argv[1])
from pypdf import PdfReader
reader=PdfReader(sys.argv[2],strict=False)
if reader.is_encrypted: raise SystemExit('ENCRYPTED_PDF: use the official reader')
start=max(1,int(sys.argv[3])); count=max(1,min(12,int(sys.argv[4])))
if start>len(reader.pages): raise SystemExit('PAGE_OUT_OF_RANGE')
rows=[]
for i in range(start-1,min(len(reader.pages),start-1+count)):
    text=(reader.pages[i].extract_text() or '').strip()
    rows.append({'page':i+1,'text':text[:10000],'truncated':len(text)>10000})
print(json.dumps({'totalPages':len(reader.pages),'pages':rows,'evidence':'official_attachment','notice':'仅提取 PDF 文本层；图片、图表及扫描页需要另行看图，不补写未读内容。'},ensure_ascii=False))
