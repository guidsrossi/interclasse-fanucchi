import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {classLogos,logoForClass} from '../src/class-logos.js';

test('logos cadastradas apontam para arquivos públicos existentes',()=>{
 for(const [className,publicPath] of Object.entries(classLogos)){
  const file=fileURLToPath(new URL(`../public${publicPath}`,import.meta.url));
  assert.equal(existsSync(file),true,`Logo ausente para ${className}`);
 }
});

test('turmas sem logo continuam sem substituição visual',()=>{
 assert.equal(logoForClass('3º A'),null);
 assert.match(logoForClass('2º A'),/2a-segundao\.png$/);
 assert.match(logoForClass('3º C'),/3c-zeus\.png$/);
 assert.match(logoForClass('3º D'),/3d-dragao\.png$/);
});
