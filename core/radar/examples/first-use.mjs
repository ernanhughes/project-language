const emit = value => console.log(JSON.stringify(value, null, 2));
import { RadarDecide, RadarHealth } from '../src/tools.ts';
const input = { id: 'build-note', task_relevance: 'high', novelty: 'NEW',
  evidential_validity: 'confirmed', urgency: 'routine', cost: 'low' };
emit(JSON.parse((await RadarHealth().execute({}, undefined)).content));
emit(JSON.parse((await RadarDecide().execute(input, undefined)).content));
