import { isSchoolClass } from "./school-classes.js";

export const modalities = [
 {id:'futebol',image:'/mascote-futebol.jpeg',name:'Futsal masculino',category:'Coletivos',leader:'Thiago',class:'3º B',limit:10,icon:'⚽'},
 {id:'futsal',image:'/mascote-futsal.jpeg',name:'Futsal misto',category:'Coletivos',leader:'Melli',class:'3º B',limit:10,icon:'⚽'},
 {id:'volei',image:'/mascote-volei.jpeg',name:'Voleibol',category:'Coletivos',leader:'Fleury',class:'3º B',limit:10,icon:'🏐'},
 {id:'basquete',image:'/mascote-basquete.jpeg',name:'Basquete',category:'Coletivos',leader:'Murilo Gomes',class:'3º C',limit:10,icon:'🏀'},
 {id:'handebol',image:'/mascote-handebol.jpeg',name:'Handebol',category:'Coletivos',leader:'Mello (3º C) e Hugo (3º E)',class:'',limit:10,icon:'🤾'},
 {id:'queimada',image:'/mascote-queimada.jpeg',name:'Queimada',category:'Coletivos',leader:'Pietra',class:'3º A',limit:10,icon:'🎯'},
 {id:'atletismo',image:'/mascote-atletismo.jpeg',name:'Atletismo',category:'Atletismo',leader:'Comissão Geral de Ed. Física',class:'',limit:4,icon:'🏃',description:'100 m rasos, salto em distância, salto em altura e arremesso de peso. Masculino e feminino.',events:['100 m rasos','Salto em distância','Salto em altura','Arremesso de peso']},
 {id:'tenis',image:'/mascote-tenis.jpeg',name:'Tênis de mesa',category:'Jogos de mesa',leader:'Coordenação a definir',class:'',limit:4,icon:'🏓'},
 {id:'volei_mesa',image:'/mascote-volei-mesa.jpeg',name:'Vôlei de mesa',category:'Jogos de mesa',leader:'João Vitor',class:'3º D',limit:6,icon:'🏐'},
 {id:'domino',image:'/mascote-domino.jpeg',name:'Dominó',category:'Jogos de mesa',leader:'Thiago Medeiros (3º D) / Lucas (3º A)',class:'',limit:4,icon:'🁣'},
 {id:'truco',image:'/mascote-truco.jpeg',name:'Truco',category:'Jogos de mesa',leader:'Thiago Medeiros (3º D) / Lucas (3º A)',class:'',limit:4,icon:'♠'},
 {id:'xadrez',image:'/mascote-xadrez.jpeg',name:'Xadrez',category:'Jogos de mesa',leader:'Thiago Medeiros (3º D) / Lucas (3º A)',class:'',limit:4,icon:'♞'},
 {id:'damas',image:'/mascote-damas.jpeg',name:'Damas',category:'Jogos de mesa',leader:'Thiago Medeiros (3º D) / Lucas (3º A)',class:'',limit:4,icon:'◉'},
 {id:'fifa',image:'/mascote-fifa.jpeg',name:'Futebol FIFA',category:'E-sports',leader:'João Pereira',class:'3º A',limit:2,icon:'🎮'},
 {id:'jenga',image:'/mascote-jenga.jpeg',name:'Torre Jenga',category:'Conhecimentos e inclusão',leader:'Luana',class:'3º D',limit:2,icon:'▥',description:'Inclusão, concentração e trabalho em equipe.'},
 {id:'repassa',image:'/mascote-repassa.jpeg',name:'Passa ou repassa',category:'Conhecimentos e inclusão',leader:'Luana',class:'3º D',limit:4,icon:'💡',description:'Conhecimentos gerais para representar sua turma.'}
];
export function normalizeClass(value){ return value.trim().toUpperCase().replace(/^([123])\s*[°ºo]?\s*([A-Z])$/i,'$1º $2'); }
export function validateRegistration(name,room){if(name.trim().length<3||name.trim().length>100)return 'Digite um nome entre 3 e 100 caracteres.';if(!isSchoolClass(normalizeClass(room)))return 'Selecione uma turma existente.';return null;}
