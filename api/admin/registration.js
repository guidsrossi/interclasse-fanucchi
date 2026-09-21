import {authorized} from './_auth.js';
import {isSchoolClass} from '../../src/school-classes.js';

const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const room=/^[123]º [A-Z]$/;
const events=['100 m rasos','Salto em distância','Salto em altura','Arremesso de peso'];
const divisions=['Masculino','Feminino'];
const headers=key=>({'Content-Type':'application/json',apikey:key,Authorization:`Bearer ${key}`});

export default async function handler(req,res){
 if(!authorized(req))return res.status(401).json({error:'Não autorizado.'});
 if(!['PATCH','DELETE'].includes(req.method))return res.status(405).end();
 const url=process.env.VITE_SUPABASE_URL,key=process.env.SUPABASE_SERVICE_ROLE_KEY,id=String(req.body?.id||'');
 if(!url||!key)return res.status(503).json({error:'Administração ainda não configurada.'});
 if(!uuid.test(id))return res.status(400).json({error:'Cadastro inválido.'});
 if(req.method==='DELETE'){
  const response=await fetch(`${url}/rest/v1/interclasse_registrations?id=eq.${id}`,{method:'DELETE',headers:{...headers(key),Prefer:'return=representation'}});
  const data=await response.json();
  if(!response.ok)return res.status(502).json({error:'Não foi possível excluir o cadastro.'});
  if(!data.length)return res.status(404).json({error:'Cadastro não encontrado.'});
  return res.status(200).json({ok:true});
 }
 const student_name=String(req.body?.student_name||'').trim().replace(/\s+/g,' '),class_name=String(req.body?.class_name||'').trim().toUpperCase(),modality_id=String(req.body?.modality_id||''),event_name=req.body?.event_name||null,division=req.body?.division||null;
 if(student_name.length<3||student_name.length>100)return res.status(400).json({error:'Digite um nome entre 3 e 100 caracteres.'});
 if(!room.test(class_name)||!isSchoolClass(class_name))return res.status(400).json({error:'Selecione uma turma existente.'});
 const modalitiesResponse=await fetch(`${url}/rest/v1/interclasse_modalities?id=eq.${encodeURIComponent(modality_id)}&select=capacity`,{headers:headers(key)}),modalities=await modalitiesResponse.json();
 if(!modalitiesResponse.ok||!modalities.length)return res.status(400).json({error:'Modalidade inválida.'});
 if(modality_id==='atletismo'){
  if(!events.includes(event_name)||!divisions.includes(division))return res.status(400).json({error:'Escolha uma prova e categoria válidas.'});
 }else if(event_name||division)return res.status(400).json({error:'Esta modalidade não possui prova ou categoria.'});
 const capacity=modalities[0].capacity;
 if(capacity!==null){
  const athleticsScope=modality_id==='atletismo'?`&event_name=eq.${encodeURIComponent(event_name)}&division=eq.${encodeURIComponent(division)}`:'';
  const countResponse=await fetch(`${url}/rest/v1/interclasse_registrations?modality_id=eq.${encodeURIComponent(modality_id)}&class_name=eq.${encodeURIComponent(class_name)}&id=neq.${id}${athleticsScope}&select=id`,{headers:{...headers(key),Prefer:'count=exact'}});
  const count=Number((countResponse.headers.get('content-range')||'0/0').split('/')[1]);
  if(count>=capacity)return res.status(409).json({error:modality_id==='atletismo'?'As vagas desta prova e categoria para a turma foram preenchidas.':'As vagas desta modalidade para a turma foram preenchidas.'});
 }
 const response=await fetch(`${url}/rest/v1/interclasse_registrations?id=eq.${id}`,{method:'PATCH',headers:{...headers(key),Prefer:'return=representation'},body:JSON.stringify({student_name,class_name,modality_id,event_name:modality_id==='atletismo'?event_name:null,division:modality_id==='atletismo'?division:null})});
 const data=await response.json();
 if(!response.ok){const duplicate=response.status===409||String(data?.message||'').includes('unique');return res.status(duplicate?409:502).json({error:duplicate?(modality_id==='atletismo'?'Este aluno já está inscrito nesta prova e categoria.':'Este aluno já está inscrito nesta modalidade e turma.'):'Não foi possível editar o cadastro.'});}
 if(!data.length)return res.status(404).json({error:'Cadastro não encontrado.'});
 res.status(200).json(data[0]);
}
