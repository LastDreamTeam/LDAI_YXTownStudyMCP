// SPDX-License-Identifier: AGPL-3.0-only
import {homedir} from 'node:os';
import {mkdir,writeFile,rename,readFile} from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
const dir=path.join(process.env.YXTOWN_DATA_DIR||path.join(homedir(),'.local','share','yxtown-study'),'reader');await mkdir(dir,{recursive:true});
const name='pypdf-7.0.1-py3-none-any.whl',file=path.join(dir,name),digest='6131b764b046282357037309e7ef2a1b7679d4a5c53eed3db2bfbf7c673ddc2b';
const check=b=>b.length===416136&&createHash('sha256').update(b).digest('hex')===digest;
let present=await readFile(file).catch(()=>null);if(!present||!check(present)){const r=await fetch('https://files.pythonhosted.org/packages/d5/a9/ae11deef21eaac5113f8c3848da1c42423b7abeca0abc349bfec7abf4c4e/'+name,{redirect:'error',signal:AbortSignal.timeout(20000)});if(!r.ok)throw Error('Reader download failed: '+r.status);const b=Buffer.from(await r.arrayBuffer());if(!check(b))throw Error('Reader integrity check failed');await writeFile(file+'.tmp',b);await rename(file+'.tmp',file);}console.log('PDF reader verified: '+name);
