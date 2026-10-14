const emit = value => console.log(JSON.stringify(value, null, 2));
import { RelatePair, RelateRank, RelateHealth } from '../src/tools.ts';
const pair = {
  left_text: 'The event writer appends immutable records.',
  right_text: 'Focus mode batches everything into the morning digest.',
  left: { id: 'event-note', kind: 'text' }, right: { id: 'focus-note', kind: 'text' },
};
const rank = {
  subject_text: 'The database query fails because column account_status is missing. The schema needs migration.',
  subject: { id: 'database-state', kind: 'state' },
  subject_kind: 'state', candidate_kind: 'action', relation: 'appropriate_remediation',
  candidates: [
    { id: 'migrate', kind: 'action', text: 'Apply a schema migration to add the missing column account_status.' },
    { id: 'retry', kind: 'action', text: 'Retry the same database query without changing the schema.' },
  ],
};
for (const [tool, input] of [[RelateHealth(), {}], [RelatePair(), pair], [RelateRank(), rank]]) {
  emit(JSON.parse((await tool.execute(input, undefined)).content));
}
