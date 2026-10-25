import {writeFileSync,mkdirSync,readFileSync} from 'node:fs';
import {hash} from '../../apps/language-demo/protocol/state.mjs';
import {SOURCE,RECORD,SOURCE_ID,COMPONENTS} from '../../core/browser/fixtures/incident.ts';

const out='experiments/lc-03-p0/fixtures';mkdirSync(out,{recursive:true});
writeFileSync(`${out}/incident-source.txt`,SOURCE+'\n');

const cases=[
 {
  id:'LC03-D01',
  source_id:SOURCE_ID,
  source_type:'technical-incident-report',
  standing:'EXPOSED_DEVELOPMENT_FIXTURE_NOT_HELD_OUT',
  task:'approve_fix',
  purpose:'Prepare a handoff note for the on-call engineer who must decide whether to approve the proposed disk alert.',
  audience:'Fresh on-call engineer',
  questions:[
   'Which hypotheses are supported, contradicted, or uncertain? Cite the source for each.',
   'Is the root cause established? Explain the disagreement.',
   'What fix is proposed, by whom, and on what evidence?',
   'What is the recovery order, and what exception applies?',
   'Which services were affected, and what should a service owner take from the report?'
  ],
  reference:{
   required_atoms:[
    {id:'h2-support',text:'H2 is supported by the migration lock logs.',evidence:'The migration lock logs support H2'},
    {id:'h1-support',text:'H1 is supported by the volume graph.',evidence:'The volume graph supports H1'},
    {id:'h4-contradicted',text:'H4 is contradicted by the partition report because packet loss ended before writes stopped.',evidence:'The partition report contradicts H4 because loss ended before writes stopped'},
    {id:'fix-proposal',text:'Ben proposes a disk alert at 85 percent because the volume reached 98 percent before any migration lock.',evidence:'Ben proposes adding a disk alert at 85 percent, because the volume reached 98 percent before any migration lock was taken'},
    {id:'recovery-order',text:'Run the failover script, confirm the writer is healthy, then re-enable the nightly job.',evidence:'run the failover script. Then confirm the writer is healthy. Then re-enable the nightly job'},
    {id:'services-affected',text:'checkout-api and ledger were degraded throughout.',evidence:'The services checkout-api and ledger were degraded throughout'}
   ],
   conditions:[
    {id:'h3-condition',text:'H3 is ruled out only if replication lag was under one second.',evidence:'H3 is ruled out only if replication lag was under one second'},
    {id:'h3-gap',text:'The lag data has a gap from 09:00 to 09:06.',evidence:'the lag data has a gap from 09:00 to 09:06'},
    {id:'recovery-exception',text:'The nightly job waits if the migration is still running.',evidence:'unless the migration is still running, in which case wait for it to finish'}
   ],
   uncertainty:[
    {id:'disputed-root-cause',text:'The root cause is disputed: Ana holds H2 and Ben holds H1.',evidence:'Ana holds that H2 is the root cause. Ben holds that H1 is the root cause. The conclusion is disputed.'},
    {id:'h3-uncertain',text:'H3 remains uncertain because the lag data is incomplete.',evidence:'H3 is ruled out only if replication lag was under one second, and the lag data has a gap from 09:00 to 09:06'}
   ]
  },
  source_preferable:false,
  representation_preference:['diagram','table','annotated_source']
 },
 {
  id:'LC03-D02',
  source_id:SOURCE_ID,
  source_type:'technical-incident-report',
  standing:'EXPOSED_DEVELOPMENT_FIXTURE_NOT_HELD_OUT',
  task:'look_up_fact',
  purpose:'Quote the exact condition and gap, because the handoff must not paraphrase them.',
  audience:'Fresh on-call engineer',
  questions:['Quote the exact condition that would rule out H3 and the exact interval of missing lag data.'],
  reference:{
   required_atoms:[
    {id:'h3-condition-quote',text:'H3 is ruled out only if replication lag was under one second.',evidence:'H3 is ruled out only if replication lag was under one second'},
    {id:'h3-gap-quote',text:'The lag data has a gap from 09:00 to 09:06.',evidence:'the lag data has a gap from 09:00 to 09:06'}
   ],
   conditions:[],
   uncertainty:[]
  },
  source_preferable:true,
  representation_preference:['source_highlight']
 },
 {
  id:'LC03-D03',
  source_id:SOURCE_ID,
  source_type:'technical-incident-report',
  standing:'EXPOSED_DEVELOPMENT_FIXTURE_NOT_HELD_OUT',
  task:'follow_procedure',
  purpose:'Explain the recovery sequence to an operator who must execute it under time pressure.',
  audience:'Fresh on-call operator',
  questions:['What is the order of recovery steps? When should the nightly job wait?'],
  reference:{
   required_atoms:[
    {id:'step-1',text:'Run the failover script.',evidence:'run the failover script'},
    {id:'step-2',text:'Confirm the writer is healthy.',evidence:'Then confirm the writer is healthy'},
    {id:'step-3',text:'Re-enable the nightly job.',evidence:'Then re-enable the nightly job'}
   ],
   conditions:[
    {id:'wait-exception',text:'Wait for the migration to finish if it is still running.',evidence:'unless the migration is still running, in which case wait for it to finish'}
   ],
   uncertainty:[]
  },
  source_preferable:false,
  representation_preference:['annotated_source']
 },
 {
  id:'LC03-D04',
  source_id:SOURCE_ID,
  source_type:'technical-incident-report',
  standing:'EXPOSED_DEVELOPMENT_FIXTURE_NOT_HELD_OUT',
  task:'decide_to_open',
  purpose:'Decide whether the ledger owner should read the report now.',
  audience:'Ledger service owner',
  questions:['Does this incident affect the ledger service? Should its owner read the report now?'],
  reference:{
   required_atoms:[
    {id:'ledger-affected',text:'The ledger service was degraded throughout the incident.',evidence:'The services checkout-api and ledger were degraded throughout'}
   ],
   conditions:[],
   uncertainty:[]
  },
  source_preferable:false,
  representation_preference:['preview']
 }
];

const evaluationPlan={
 schema:'lc03-evaluation-plan/0.1',
 created:'2026-10-24',
 standing:'DESIGN_ONLY_NOT_EXECUTED_NO_EVALUATION_SOURCES_AUTHORED',
 purpose:'Compare original-source access, AI-mediated task-specific representation, and the same representation with optional advisory constraint inspection for substantial communication tasks.',
 arms:{
  A:'Original source plus competent navigation/retrieval.',
  B:'AI-mediated task-specific representation built from the source, with the same source and navigation available.',
  C:'B plus optional advisory constraint inspection (source-linked obligations and, where applicable, R6 typed constraints). Advisory only; no automatic routing.'
 },
 controls:{
  source_access:'All arms receive the same original source bytes and the same navigation/retrieval capability.',
  recipient:'Same recipient model, same settings, isolated sessions, no expected answers or references.',
  questions:'Same questions, revealed only after the representation is generated.',
  order:'Counterbalance or randomise arm order; record order effects.',
  contamination:'Every source checked against R4/R5/R6/R7, LC-02 batch20 and Studio development cases before freezing.'
 },
 planned_cases:[
  {id:'P01',source_type:'technical-incident-report',task:'handoff and hypothesis evaluation',requires:['distributed evidence','disputed conclusion','unknown condition','procedure exception']},
  {id:'P02',source_type:'technical-incident-report',task:'exact lookup and quotation',requires:['exact condition','exact interval']},
  {id:'P03',source_type:'workflow',task:'conditional procedure',requires:['ordered steps','exception','escalation']},
  {id:'P04',source_type:'workflow',task:'prerequisite and authority',requires:['cross-section dependency','permission boundary']},
  {id:'P05',source_type:'chapter-excerpt',task:'concept explanation and dependency',requires:['several related concepts','definition boundaries']},
  {id:'P06',source_type:'chapter-excerpt',task:'apply a concept to a new example',requires:['distributed definition','counterexample']},
  {id:'P07',source_type:'research-article',task:'evaluate conclusion and limitation',requires:['competing interpretation','limitation','uncertainty']},
  {id:'P08',source_type:'research-article',task:'compare two findings',requires:['cross-section synthesis','scope difference']},
  {id:'P09',source_type:'fictional-scene',task:'infer motivation and indirect communication',requires:['dialogue','implicature','uncertainty']},
  {id:'P10',source_type:'fictional-scene',task:'distinguish what is said from what is implied',requires:['narrator/character boundary','unresolved motive']},
  {id:'P11',source_type:'incident-plus-postmortem',task:'reconcile conflicting documents',requires:['cross-document evidence','scope','contradiction']},
  {id:'P12',source_type:'incident-plus-postmortem',task:'source-preferable exact audit',requires:['exact wording','provenance','no transformation']}
 ],
 measures:[
  'task_correctness',
  'faithful_evidence_use',
  'condition_and_qualification_preservation',
  'unsupported_additions',
  'uncertainty_handling',
  'information_selection',
  'time_and_processing_cost',
  'source_preferable_cases'
 ],
 scoring:{
  reference:'Independent source-grounded reference answer with required atoms, conditions, uncertainty and acceptable alternatives.',
  correctness:'Required atoms and relations present and correctly applied.',
  evidence:'Each asserted atom has an exact source quotation or a traceable source span.',
  conditions:'Conditions, exceptions and qualifiers preserved where the task requires them.',
  unsupported:'Claims, permissions or causal links not supported by the source.',
  uncertainty:'Genuine ambiguity preserved; invented doubt penalised.',
  selection:'Relevant material included; irrelevant material does not crowd out the answer.',
  source_preferable:'Exact quotation or provenance tasks must not be paraphrased away.'
 },
 freeze_gate:[
  'Sources, tasks, references, arm definitions, model identities, order and criteria frozen before execution.',
  'Overlap audit clean against every prior LC-02 corpus; no exact duplicates and no Jaccard >= 0.45.',
  'Independent adjudication of references before any confirmatory claim.',
  'No held-out case reused from LC-02 or from the LC-03 development fixture.'
 ],
 source_overlap_method:'Source-token Jaccard plus exact-match check against R4/R5/R6/R7, LC-02 batch20 and Studio development cases.',
 note:'This is a design plan, not an executed evaluation. No evaluation sources are authored or frozen here.'
};
writeFileSync(`${out}/development-cases.json`,JSON.stringify({schema:'lc03-development-cases/0.1',source_provenance:'core/browser/fixtures/incident.ts',source_id:SOURCE_ID,source_sha256:hash(SOURCE),components:COMPONENTS,cases},null,2)+'\n');
writeFileSync(`${out}/evaluation-plan.json`,JSON.stringify(evaluationPlan,null,2)+'\n');
const freeze={schema:'lc03-development-freeze/0.1',created:'2026-10-24',standing:'DEVELOPMENT_FIXTURE_ONLY_NOT_HELD_OUT',files:{'incident-source.txt':hash(readFileSync(`${out}/incident-source.txt`,'utf8')),'development-cases.json':hash(readFileSync(`${out}/development-cases.json`,'utf8'))},note:'Evaluation sources are not authored or frozen here.'};
writeFileSync(`${out}/DEV-FREEZE.json`,JSON.stringify(freeze,null,2)+'\n');
console.log(JSON.stringify({status:'LC03_FIXTURES_BUILT',cases:cases.length,source_chars:SOURCE.length,freeze},null,2));
