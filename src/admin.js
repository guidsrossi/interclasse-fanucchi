import './style.css';
import './school.css';
import './admin.css';
import './admin-presentation-fixes.css';
import {modalities} from './modalities.js';
import {mountDrawAdmin} from './admin-draw.js';

const app=document.querySelector('#app');
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const modalityById=Object.fromEntries(modalities.map(m=>[m.id,m]));
let rows=[];

function shell(content){app.innerHTML=`<header class="admin-header"><a class="brand" href="/"><span class="school-badge"><img src="/mascote-fanucchi.webp" alt="" width="52" height="52"></span><span class="school-wordmark">interclasse <strong>Fanucchi</strong><small>PAINEL ADMINISTRATIVO</small></span></a></header><main class="admin-main">${content}</main>`;}

function login(message=''){shell(`<section class="admin-login"><span class="eyebrow dark">ACESSO RESTRITO</span><h1>Área administrativa</h1><p>Entre com a senha de administração para consultar os inscritos.</p><form id="admin-login"><label>Senha<input type="password" name="password" autocomplete="current-password" required autofocus></label><p class="admin-error" role="alert">${esc(message)}</p><button class="submit">Entrar <span>↗</span></button></form></section>`);document.querySelector('#admin-login').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const r=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:new FormData(e.target).get('password')})});if(!r.ok)throw Error((await r.json()).error||'Não foi possível entrar.');await load();}catch(err){login(err.message);}};}

function dashboard(){const categories=[...new Set(modalities.map(m=>m.category))];shell(`<section class="admin-dashboard"><div class="admin-title"><div><span class="eyebrow dark">ORGANIZA??O DO INTERCLASSE</span><h1>Inscritos</h1><p><strong id="total">${rows.length}</strong> inscri??es encontradas.</p></div><button id="logout" class="admin-secondary">Sair</button></div><div class="admin-filters"><label>Categoria<select id="category"><option value="">Todas</option>${categories.map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label>Modalidade<select id="modality"><option value="">Todas</option>${modalities.map(m=>`<option value="${m.id}">${esc(m.name)}</option>`).join('')}</select></label><label>Turma<select id="class"><option value="">Todas</option>${[...new Set(rows.map(r=>r.class_name))].sort().map(c=>`<option>${esc(c)}</option>`).join('')}</select></label><label>Buscar<input id="admin-search" type="search" placeholder="Nome do aluno"></label></div><div id="admin-results"></div></section><dialog id="edit-registration"><button class="close" aria-label="Fechar">?</button><div id="edit-content"></div></dialog>`);mountDrawAdmin(document.querySelector('.admin-dashboard'),{rows,modalities,esc});['category','modality','class','admin-search'].forEach(id=>document.querySelector(`#${id}`).oninput=renderRows);document.querySelector('#logout').onclick=async()=>{await fetch('/api/admin/logout',{method:'POST'});login();};document.querySelector('#edit-registration .close').onclick=()=>document.querySelector('#edit-registration').close();renderRows();}

function renderRows(){const category=document.querySelector('#category').value,modality=document.querySelector('#modality').value,className=document.querySelector('#class').value,search=document.querySelector('#admin-search').value.toLowerCase();const visible=rows.filter(r=>(!category||modalityById[r.modality_id]?.category===category)&&(!modality||r.modality_id===modality)&&(!className||r.class_name===className)&&(!search||r.student_name.toLowerCase().includes(search)));document.querySelector('#total').textContent=visible.length;const grouped=visible.reduce((all,r)=>{const key=`${modalityById[r.modality_id]?.name||r.modality_id} ? ${r.class_name}`;(all[key]??=[]).push(r);return all;},{});document.querySelector('#admin-results').innerHTML=visible.length?Object.entries(grouped).map(([title,items])=>`<section class="admin-group"><h2>${esc(title)} <span>${items.length}</span></h2><div class="admin-table"><table><thead><tr><th>Aluno</th><th>Prova</th><th>Categoria</th><th>Inscri??o</th><th>A??es</th></tr></thead><tbody>${items.map(r=>`<tr><td><strong>${esc(r.student_name)}</strong></td><td>${esc(r.event_name||'?')}</td><td>${esc(r.division||'?')}</td><td>${new Date(r.created_at).toLocaleString('pt-BR')}</td><td class="admin-actions"><button data-edit="${r.id}">Editar</button><button class="danger" data-delete="${r.id}">Excluir</button></td></tr>`).join('')}</tbody></table></div></section>`).join(''):'<div class="empty">Nenhum inscrito encontrado com esses filtros.</div>';document.querySelectorAll('[data-edit]').forEach(button=>button.onclick=()=>openEditor(button.dataset.edit));document.querySelectorAll('[data-delete]').forEach(button=>button.onclick=()=>removeRegistration(button.dataset.delete));}

function athleticsFields(row){return `<div class="athletics-fields"><label>Prova<select name="event_name">${['100 m rasos','Salto em dist?ncia','Salto em altura','Arremesso de peso'].map(value=>`<option ${row.event_name===value?'selected':''}>${value}</option>`).join('')}</select></label><label>Categoria<select name="division">${['Masculino','Feminino'].map(value=>`<option ${row.division===value?'selected':''}>${value}</option>`).join('')}</select></label></div>`;}

function openEditor(id){const row=rows.find(item=>item.id===id),dialog=document.querySelector('#edit-registration');document.querySelector('#edit-content').innerHTML=`<span class="eyebrow dark">EDITAR CADASTRO</span><h2>${esc(row.student_name)}</h2><form id="edit-form"><label>Nome completo<input name="student_name" value="${esc(row.student_name)}" required minlength="3" maxlength="100"></label><label>Turma<input name="class_name" value="${esc(row.class_name)}" required maxlength="4"></label><label>Modalidade<select name="modality_id">${modalities.map(m=>`<option value="${m.id}" ${row.modality_id===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label><div id="dynamic-fields">${row.modality_id==='atletismo'?athleticsFields(row):''}</div><p class="admin-error" role="alert"></p><button class="submit">Salvar altera??es <span>?</span></button></form>`;const form=document.querySelector('#edit-form');form.modality_id.onchange=()=>{document.querySelector('#dynamic-fields').innerHTML=form.modality_id.value==='atletismo'?athleticsFields(row):'';};form.onsubmit=async event=>{event.preventDefault();const data=Object.fromEntries(new FormData(form));data.id=id;const button=form.querySelector('.submit');button.disabled=true;const response=await fetch('/api/admin/registration',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});if(!response.ok){form.querySelector('.admin-error').textContent=(await response.json()).error||'N?o foi poss?vel editar.';button.disabled=false;return;}dialog.close();await load();};dialog.showModal();}

async function removeRegistration(id){const row=rows.find(item=>item.id===id);if(!confirm(`Excluir a inscri??o de ${row.student_name} em ${modalityById[row.modality_id]?.name||row.modality_id}?`))return;const response=await fetch('/api/admin/registration',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id})});if(!response.ok){alert((await response.json()).error||'N?o foi poss?vel excluir o cadastro.');return;}await load();}

async function load(){
 try{
  const r=await fetch('/api/admin/registrations',{headers:{Accept:'application/json'}});
  if(r.status===401){login();return;}
  if(!r.ok)throw Error();
  const contentType=r.headers.get('content-type')||'';
  if(!contentType.includes('application/json'))throw Error();
  const data=await r.json();
  if(!Array.isArray(data))throw Error();
  rows=data;
  dashboard();
 }catch{
  login('Não foi possível conectar ao painel administrativo neste servidor.');
 }
}
load();
