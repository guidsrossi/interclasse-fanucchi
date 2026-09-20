import {test} from 'node:test';
import assert from 'node:assert/strict';
import {modalities,normalizeClass,validateRegistration} from '../src/modalities.js';
test('limites finais prevalecem sobre a tabela inicial',()=>{assert.equal(modalities.length,16);assert.ok(modalities.filter(m=>m.category==='Coletivos').every(m=>m.limit===10));assert.equal(modalities.find(m=>m.id==='volei_mesa').limit,6);assert.equal(modalities.find(m=>m.id==='domino').limit,4);assert.equal(modalities.find(m=>m.id==='jenga').limit,2);assert.equal(modalities.find(m=>m.id==='repassa').limit,4);assert.equal(modalities.find(m=>m.id==='fifa').limit,2);});
test('todas as modalidades possuem arte de mascote',()=>{assert.ok(modalities.every(m=>m.image?.startsWith('/mascote-')));});
test('turmas aceitam formatos usuais sem aceitar entradas inválidas',()=>{for(const room of ['3b','3 B','3° b','3º B'])assert.equal(normalizeClass(room),'3º B');assert.equal(validateRegistration('Maria Silva','2c'),null);for(const room of ['4 A','3º AB','<script>',''])assert.ok(validateRegistration('Maria Silva',room));assert.ok(validateRegistration('  ','3a'));});
