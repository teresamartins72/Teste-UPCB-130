#!/usr/bin/env node
/* Dev check: node scripts/validate.js */
'use strict';
const path = require('path');
const assert = require('assert');

global.window = {};
require(path.join(__dirname, '..', 'data', 'questions.js'));
const Q = global.window.QUESTIONS;

const EXPECTED_SECTIONS = {
  'Lei 35/2014 (LTFP), Arts. 70.º a 73.º': 18,
  'Manual de Gestão v10, pontos 5.5 e 5.8': 15,
  'Despacho Normativo 58/2008, Estatutos do IPCB': 51,
  'Decreto-Lei 4/2015, Código do Procedimento Administrativo': 10,
  'Regulamento n.º 1078/2023, Tempo de Trabalho': 36,
};
const EXPECTED_LETTERS = { A: 33, B: 33, C: 32, D: 32 };

assert(Array.isArray(Q), 'window.QUESTIONS must be an array');
assert.strictEqual(Q.length, 130, 'QUESTIONS.length must be 130');

const sections = {};
const letters = { A: 0, B: 0, C: 0, D: 0 };
Q.forEach((q, i) => {
  const id = `question #${i + 1}`;
  assert.strictEqual(q.n, i + 1, `${id}: n must be ${i + 1}`);
  for (const k of ['section', 'question', 'explanation', 'correct']) {
    assert(typeof q[k] === 'string' && q[k].trim(), `${id}: missing ${k}`);
  }
  assert(Array.isArray(q.options) && q.options.length === 4, `${id}: must have exactly 4 options`);
  q.options.forEach((o, j) => assert(typeof o === 'string' && o.trim(), `${id}: option ${j} empty`));
  assert(/^[ABCD]$/.test(q.correct), `${id}: correct must be A-D`);
  sections[q.section] = (sections[q.section] || 0) + 1;
  letters[q.correct]++;
});

assert.deepStrictEqual(sections, EXPECTED_SECTIONS, 'section counts differ');
assert.deepStrictEqual(letters, EXPECTED_LETTERS, 'correct-letter counts differ');

console.log('OK: %d questions', Q.length);
console.log('Sections:', sections);
console.log('Correct letters:', letters);
