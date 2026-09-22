export function selectComputerSource(checkpoint,snapshot) {
  // Old cases and other release revisions must not silently receive current code.
  if(!checkpoint.sourceRevision||checkpoint.sourceRevision!==snapshot.commit)return {status:'unavailable',reason:'No matching private source revision is attached to this incident.'};
  const files=Object.hasOwn(snapshot.pages,checkpoint.route)?snapshot.pages[checkpoint.route]:null;
  if(!files)return {status:'unavailable',reason:'Source access for this page is not configured.'};
  return {status:'available',repository:snapshot.repository,commit:snapshot.commit,workerVersion:snapshot.workerVersion,origin:snapshot.origin,verifiedAt:snapshot.verifiedAt,files,limitations:'Read-only page excerpt from a verified release snapshot. This does not prove which frontend version was in the user browser, and does not include server implementation or a live GitHub read during diagnosis.'};
}
