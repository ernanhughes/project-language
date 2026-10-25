import {z} from 'zod';import {readFileSync} from 'node:fs';
import {hash,assert} from '../protocol/state.mjs';import {scenario,question} from './scenario.mjs';
const Task=z.object({schema:z.literal('studio-prospective-task/0.1'),scenario:z.object({id:z.string(),name:z.string(),intent:z.string(),purpose:z.string(),audience:z.string(),source:z.object({id:z.string(),text:z.string(),hash:z.string()}).strict()}).strict(),question:z.object({id:z.string(),text:z.string(),reference:z.enum(['YES','NO','UNKNOWN','SOURCE_CONFLICT'])}).strict()}).strict();
export const defaultTask={schema:'studio-prospective-task/0.1',scenario,question};
export function taskIdentity(task){return {id:task.scenario.id,digest:hash(task),source_hash:task.scenario.source.hash,question_hash:hash(task.question.text),reference_standing:'UNADJUDICATED_REFERENCE'};}
export function loadTask(path){const task=Task.parse(JSON.parse(readFileSync(path,'utf8')));assert(hash(task.scenario.source.text)===task.scenario.source.hash,'TASK_SOURCE_HASH');return task;}
