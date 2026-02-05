/**
 * Scans recent emails for GitHub Pull Request headers and body content to apply labels.
 * Designed to run on a time-based trigger (e.g., every 5-10 minutes).
 * 
 * Source & Bug Reports: https://github.com/varvashenya/gas-github-labels/issues
 */
function markGitHubPullRequests() {
  // Look back 1 hour to ensure no messages are missed.
  const threads = GmailApp.search('newer_than:1h');
  
  // Define label paths using forward slashes for nesting (folder/label)
  const LABELS = {
    CLOSED: "GitHub/Closed",
    CLOSED_BY_ME: "GitHub/Closed by me",
    MERGED: "GitHub/Merged",
    MERGED_BY_ME: "GitHub/Merged by me",
    APPROVED: "GitHub/Approved by me",
    CHANGES: "GitHub/Requested changes by me"
  };

  // Pre-compile Regex for headers (X-GitHub-...)
  const RE_STATUS_CLOSED = /X-GitHub-PullRequestStatus:\s*closed/i;
  const RE_STATUS_MERGED = /X-GitHub-PullRequestStatus:\s*merged/i;
  const RE_REASON_ACTIVITY = /X-GitHub-Reason:\s*your_activity/i;
  
  // Pre-compile Regex for specific text inside the email body
  const RE_BODY_APPROVED = /approved this pull request/i;
  const RE_BODY_CHANGES = /requested changes on this pull request/i;

  // Initialize label objects (creates them if they don't exist)
  const labelObjects = {};
  for (let key in LABELS) {
    labelObjects[key] = GmailApp.getUserLabelByName(LABELS[key]) || GmailApp.createLabel(LABELS[key]);
  }

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const currentLabelNames = thread.getLabels().map(l => l.getName());
    
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];
    
    const rawContent = lastMessage.getRawContent();
    const bodyContent = lastMessage.getPlainBody();

    // 1. Process Status: CLOSED
    if (RE_STATUS_CLOSED.test(rawContent)) {
      if (!currentLabelNames.includes(LABELS.CLOSED)) {
        thread.addLabel(labelObjects.CLOSED);
      }
      if (RE_REASON_ACTIVITY.test(rawContent) && !currentLabelNames.includes(LABELS.CLOSED_BY_ME)) {
        thread.addLabel(labelObjects.CLOSED_BY_ME);
        console.log("Labeled CLOSED BY ME: " + lastMessage.getSubject());
      }
    }
    
    // 2. Process Status: MERGED
    if (RE_STATUS_MERGED.test(rawContent)) {
      if (!currentLabelNames.includes(LABELS.MERGED)) {
        thread.addLabel(labelObjects.MERGED);
      }
      if (RE_REASON_ACTIVITY.test(rawContent) && !currentLabelNames.includes(LABELS.MERGED_BY_ME)) {
        thread.addLabel(labelObjects.MERGED_BY_ME);
        console.log("Labeled MERGED BY ME: " + lastMessage.getSubject());
      }
    }

    // 3. Process Activity-based labels (Approved / Changes Requested)
    if (RE_REASON_ACTIVITY.test(rawContent)) {
      if (!currentLabelNames.includes(LABELS.APPROVED) && RE_BODY_APPROVED.test(bodyContent)) {
        thread.addLabel(labelObjects.APPROVED);
        console.log("Labeled APPROVED: " + lastMessage.getSubject());
      }
      
      if (!currentLabelNames.includes(LABELS.CHANGES) && RE_BODY_CHANGES.test(bodyContent)) {
        thread.addLabel(labelObjects.CHANGES);
        console.log("Labeled CHANGES: " + lastMessage.getSubject());
      }
    }
  }
}
