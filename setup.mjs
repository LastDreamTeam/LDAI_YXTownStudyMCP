// SPDX-License-Identifier: AGPL-3.0-only
import {homedir} from 'node:os';
import {generateKeyPairSync,createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,copyFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {atomicJson,jsonFile} from './lib/core.mjs';
const root=path.dirname(fileURLToPath(import.meta.url));
const data=process.env.YXTOWN_DATA_DIR||path.join(homedir(),'.local','share','yxtown-study');
await mkdir(data,{recursive:true,mode:0o700});
const port=Number(process.env.YXTOWN_PORT||19271);
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('Invalid YXTOWN_PORT');
let config=await jsonFile(path.join(data,'bridge.json'),null);
if(!config){const {publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});const der=publicKey.export({type:'spki',format:'der'});const extensionId=[...createHash('sha256').update(der).digest().subarray(0,16)].map(b=>String.fromCharCode(97+(b>>4),97+(b&15))).join('');config={version:1,port,token:randomBytes(32).toString('base64url'),publicKey:der.toString('base64'),extensionId};await atomicJson(path.join(data,'bridge.json'),config);}
const ext=path.join(data,'chrome-extension');await mkdir(ext,{recursive:true});for(const file of ['background.js','content.js','popup.js','popup.html'])await copyFile(path.join(root,'extension',file),path.join(ext,file));await copyFile(path.join(root,'lib','extract.js'),path.join(ext,'extract.js'));
const manifest=JSON.parse(await readFile(path.join(root,'extension','manifest.json'),'utf8'));manifest.key=config.publicKey;manifest.host_permissions=manifest.host_permissions.map(x=>x.replace(':19271/',':'+config.port+'/'));await atomicJson(path.join(ext,'manifest.json'),manifest);await writeFile(path.join(ext,'config.js'),'globalThis.YX_CONFIG='+JSON.stringify({token:config.token,port:config.port})+';\n',{encoding:'utf8',mode:0o600});
process.stdout.write(JSON.stringify({dataDirectory:data,extensionDirectory:ext,extensionId:config.extensionId,next:'Load this unpacked extension in Chrome. Keep bridge.json and config.js private; never include the data directory in a plugin archive.'},null,2)+'\n');
