import {readFileSync} from 'node:fs';
import {spawn} from 'node:child_process';

function loadLocalEnvironment(){
 let contents='';
 try{contents=readFileSync(new URL('../.env.local',import.meta.url),'utf8');}catch{}
 for(const line of contents.split(/\r?\n/)){
  const match=line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
  if(!match)continue;
  let value=match[2].trim();
  if(value.length>=2&&value.startsWith('"')&&value.endsWith('"'))value=value.slice(1,-1);
  process.env[match[1]]=value;
 }
}

loadLocalEnvironment();
const isWindows=process.platform==='win32';
const command=isWindows?process.env.ComSpec:'npx';
const args=isWindows?['/d','/s','/c','npx.cmd --yes vercel@latest dev --listen 127.0.0.1:5173']:['--yes','vercel@latest','dev','--listen','127.0.0.1:5173'];
const child=spawn(command,args,{
 stdio:'inherit',
 env:process.env
});

child.on('exit',code=>process.exit(code??1));
child.on('error',error=>{console.error(`Não foi possível iniciar o servidor: ${error.message}`);process.exit(1);});
