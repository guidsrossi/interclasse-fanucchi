import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCompetitions,competitionSignature,createBracket,createGroupTournament,createTournamentDraw} from '../src/draw.js';

const modalities=[
 {id:'futsal',name:'Futsal',category:'Coletivos'},
 {id:'atletismo',name:'Atletismo',category:'Atletismo',events:['100 m rasos','Salto em altura']},
 {id:'xadrez',name:'Xadrez',category:'Jogos de mesa'}
];

test('inclui apenas turmas que possuem estudantes inscritos',()=>{
 const rows=[
  {modality_id:'futsal',class_name:'3º A'},
  {modality_id:'futsal',class_name:'3º A'},
  {modality_id:'futsal',class_name:'3º C'},
  {modality_id:'xadrez',class_name:'2º B'}
 ];
 const competitions=buildCompetitions(modalities,rows);
 const futsal=competitions.find(item=>item.id==='futsal');
 assert.deepEqual(futsal.participants,[
  {className:'3º A',studentCount:2},
  {className:'3º C',studentCount:1}
 ]);
 assert.equal(competitions.find(item=>item.id==='xadrez').participants[0].className,'2º B');
});

test('separa o atletismo por prova e categoria',()=>{
 const rows=[
  {modality_id:'atletismo',class_name:'1º A',event_name:'100 m rasos',division:'Feminino'},
  {modality_id:'atletismo',class_name:'1º B',event_name:'Salto em altura',division:'Masculino'}
 ];
 const athletics=buildCompetitions(modalities,rows).filter(item=>item.modalityId==='atletismo');
 assert.equal(athletics.length,4);
 assert.deepEqual(athletics.find(item=>item.eventName==='100 m rasos'&&item.division==='Feminino').participants.map(item=>item.className),['1º A']);
 assert.deepEqual(athletics.find(item=>item.eventName==='100 m rasos'&&item.division==='Masculino').participants,[]);
});

test('usa o mesmo modelo de sorteio no atletismo masculino e feminino',()=>{
 const competitions=buildCompetitions(modalities,[
  {modality_id:'atletismo',class_name:'1º A',event_name:'100 m rasos',division:'Masculino'},
  {modality_id:'atletismo',class_name:'1º B',event_name:'100 m rasos',division:'Masculino'},
  {modality_id:'atletismo',class_name:'2º A',event_name:'100 m rasos',division:'Feminino'},
  {modality_id:'atletismo',class_name:'2º B',event_name:'100 m rasos',division:'Feminino'}
 ]);
 const draw=createTournamentDraw(competitions,()=>0.5);
 assert.equal(draw.brackets['atletismo:100 m rasos:Masculino'].format,'knockout');
 assert.equal(draw.brackets['atletismo:100 m rasos:Feminino'].format,'knockout');
 assert.equal(draw.brackets['atletismo:100 m rasos:Masculino'].rounds.length,draw.brackets['atletismo:100 m rasos:Feminino'].rounds.length);
});

test('chaveamento de três turmas cria um avanço direto sem confronto vazio',()=>{
 const bracket=createBracket(['1º A','1º B','1º C'],()=>0.25);
 assert.equal(bracket.participantCount,3);
 assert.equal(bracket.rounds.length,2);
 assert.equal(bracket.rounds[0].matches.length,2);
 assert.equal(bracket.rounds[0].matches.filter(match=>match.b===null).length,1);
 const entrants=bracket.rounds[0].matches.flatMap(match=>[match.a,match.b]).filter(Boolean);
 assert.deepEqual([...entrants].sort(),['1º A','1º B','1º C']);
});

test('uma única turma é classificada automaticamente',()=>{
 const bracket=createBracket([{className:'3º D',studentCount:4}]);
 assert.equal(bracket.automaticWinner,'3º D');
 assert.deepEqual(bracket.rounds,[]);
});

test('esportes coletivos são divididos em dois grupos e classificam quatro por grupo',()=>{
 const teams=Array.from({length:10},(_,index)=>({className:`Turma ${index+1}`,studentCount:1}));
 const tournament=createGroupTournament(teams,()=>0.4);
 assert.equal(tournament.format,'groups-knockout');
 assert.equal(tournament.qualifiersPerGroup,4);
 assert.equal(tournament.groups.A.length,5);
 assert.equal(tournament.groups.B.length,5);
 assert.equal(new Set([...tournament.groups.A,...tournament.groups.B]).size,10);
 assert.equal(tournament.revealOrder.length,10);
 assert.deepEqual(tournament.revealOrder.map(item=>item.group),['A','B','A','B','A','B','A','B','A','B']);
 assert.equal(tournament.knockout.rounds[0].name,'Quartas de final');
 assert.deepEqual(tournament.knockout.rounds[0].matches[0],{a:'1º do Grupo A',b:'4º do Grupo B',bye:false});
 assert.deepEqual(tournament.knockout.rounds[0].matches.map(({a,b})=>[a,b]),[
  ['1º do Grupo A','4º do Grupo B'],
  ['2º do Grupo A','3º do Grupo B'],
  ['1º do Grupo B','4º do Grupo A'],
  ['2º do Grupo B','3º do Grupo A']
 ]);
});

test('somente a categoria Coletivos recebe fase de grupos',()=>{
 const competitions=buildCompetitions(modalities,[
  {modality_id:'futsal',class_name:'3º A'},
  {modality_id:'futsal',class_name:'3º B'},
  {modality_id:'xadrez',class_name:'3º A'},
  {modality_id:'xadrez',class_name:'3º B'}
 ]);
 const draw=createTournamentDraw(competitions,()=>0.5);
 assert.equal(draw.brackets.futsal.format,'groups-knockout');
 assert.equal(draw.brackets.xadrez.format,'knockout');
});

test('sorteio registra todas as competições e só invalida ao mudar as turmas participantes',()=>{
 const first=buildCompetitions(modalities,[{modality_id:'futsal',class_name:'3º A'}]);
 const withAnotherStudent=buildCompetitions(modalities,[{modality_id:'futsal',class_name:'3º A'},{modality_id:'futsal',class_name:'3º A'}]);
 assert.equal(competitionSignature(first),competitionSignature(withAnotherStudent));
 const draw=createTournamentDraw(first,()=>0.5);
 assert.equal(Object.keys(draw.brackets).length,first.length);
 assert.equal(draw.signature,competitionSignature(first));
});
