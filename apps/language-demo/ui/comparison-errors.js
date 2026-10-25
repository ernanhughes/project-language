export function protocolFailure(code){
 if(code==='UNKNOWN_IS_NOT_PERMISSION')return 'The interpreter labelled an unknown meaning as SOURCE_STATED instead of UNKNOWN. Its response was saved but no reviewable proposal was created. No request is running. Start Comparison begins a new attempt; it will call the models again. This is a protocol-format failure, not a finding that permission was granted.';
 if(code==='SOURCE_SPAN')return 'A model supplied quotation positions that do not match the original source. Its response is saved, but source validation failed. No request is running and no automatic retry occurred. Start Comparison begins a new attempt with new model calls.';
 if(code==='COMPARISON_ALREADY_ACTIVE')return 'A comparison is already awaiting review. Use Approve & Finish, Request a correction, or Reject and stop. Starting again would repeat model calls.';
 return null;
}
