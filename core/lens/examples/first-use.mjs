const emit = value => console.log(JSON.stringify(value, null, 2));
import { LensRender, LensHealth } from '../src/tools.ts';
const input = {
  source: { id: 'build-note', kind: 'text', content: 'Build passes. Deployment requires approval.' },
  purpose: 'inspect build status', mode: 'SOURCE',
};
emit(JSON.parse((await LensHealth().execute({}, undefined)).content));
emit(JSON.parse((await LensRender().execute(input, undefined)).content));
