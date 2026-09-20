import {modalities} from '../src/modalities.js';

const url=process.env.VITE_SUPABASE_URL;
const key=process.env.SUPABASE_SERVICE_ROLE_KEY;

if(!url||!key){
 console.log('Sincronização ignorada: credenciais administrativas não disponíveis neste ambiente.');
 process.exit(0);
}

const response=await fetch(`${url}/rest/v1/interclasse_modalities?on_conflict=id`,{
 method:'POST',
 headers:{
  'Content-Type':'application/json',
  apikey:key,
  Authorization:`Bearer ${key}`,
  Prefer:'resolution=merge-duplicates,return=minimal'
 },
 body:JSON.stringify(modalities.map(({id,limit})=>({id,capacity:limit})))
});

if(!response.ok)throw new Error(`Falha ao sincronizar modalidades (${response.status}).`);
console.log(`${modalities.length} modalidades sincronizadas com sucesso.`);
