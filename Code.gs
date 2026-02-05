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
  const ROOT_LABELS = {
    CLOSED: "GitHub/Closed",
    CLOSED_BY_ME: "GitHub/Closed by me",
    MERGED: "GitHub/Merged",
    MERGED_BY_ME: "GitHub/Merged by me",
    APPROVED: "GitHub/Approved by me",
    CHANGES: "GitHub/Requested changes by me"
  };

  // Regex for headers
  const RE_STATUS_CLOSED = /X-GitHub-PullRequestStatus:\s*closed/i;
  const RE_STATUS_MERGED = /X-GitHub-PullRequestStatus:\s*merged/i;
  const RE_REASON_ACTIVITY = /X-GitHub-Reason:\s*your_activity/i;
  const RE_LIST_ARCHIVE = /List-Archive:\s*https:\/\/github\.com\/([^\s>]+)/i;
  
  // Regex for body content
  const RE_BODY_APPROVED = /approved this pull request/i;
  const RE_BODY_CHANGES = /requested changes on this pull request/i;

  // Initialize root label objects
  const rootLabelObjects = {};
  for (let key in ROOT_LABELS) {
    rootLabelObjects[key] = GmailApp.getUserLabelByName(ROOT_LABELS[key]) || GmailApp.createLabel(ROOT_LABELS[key]);
  }

  for (let i = 0; i < threads.length; i++) {
    const thread = threads[i];
    const messages = thread.getMessages();
    const lastMessage = messages[messages.length - 1];
    
    const rawContent = lastMessage.getRawContent();
    const bodyContent = lastMessage.getPlainBody();
    const currentLabels = thread.getLabels().map(l => l.getName());
    const subject = lastMessage.getSubject();

    // 1. Handle dynamic Company/Repo label
    const archiveMatch = rawContent.match(RE_LIST_ARCHIVE);
    if (archiveMatch && archiveMatch[1]) {
      const repoPath = "GitHub/" + archiveMatch[1].replace(/\/$/, "");
      if (!currentLabels.includes(repoPath)) {
        const repoLabel = GmailApp.getUserLabelByName(repoPath) || GmailApp.createLabel(repoPath);
        thread.addLabel(repoLabel);
        console.log(`REPO LABEL: Added [${repoPath}] to "${subject}"`);
      }
    }

    // 2. Process original Status labels (Root folder)
    
    // Status: CLOSED
    if (RE_STATUS_CLOSED.test(rawContent)) {
      if (!currentLabels.includes(ROOT_LABELS.CLOSED)) {
        thread.addLabel(rootLabelObjects.CLOSED);
        console.log(`STATUS: Added [${ROOT_LABELS.CLOSED}] to "${subject}"`);
      }
      if (RE_REASON_ACTIVITY.test(rawContent) && !currentLabels.includes(ROOT_LABELS.CLOSED_BY_ME)) {
        thread.addLabel(rootLabelObjects.CLOSED_BY_ME);
        console.log(`ACTIVITY: Added [${ROOT_LABELS.CLOSED_BY_ME}] to "${subject}"`);
      }
    }
    
    // Status: MERGED
    if (RE_STATUS_MERGED.test(rawContent)) {
      if (!currentLabels.includes(ROOT_LABELS.MERGED)) {
        thread.addLabel(rootLabelObjects.MERGED);
        console.log(`STATUS: Added [${ROOT_LABELS.MERGED}] to "${subject}"`);
      }
      if (RE_REASON_ACTIVITY.test(rawContent) && !currentLabels.includes(ROOT_LABELS.MERGED_BY_ME)) {
        thread.addLabel(rootLabelObjects.MERGED_BY_ME);
        console.log(`ACTIVITY: Added [${ROOT_LABELS.MERGED_BY_ME}] to "${subject}"`);
      }
    }

    // 3. Process original Activity labels (Root folder)
    if (RE_REASON_ACTIVITY.test(rawContent)) {
      if (RE_BODY_APPROVED.test(bodyContent) && !currentLabels.includes(ROOT_LABELS.APPROVED)) {
        thread.addLabel(rootLabelObjects.APPROVED);
        console.log(`REVIEW: Added [${ROOT_LABELS.APPROVED}] to "${subject}"`);
      }
      if (RE_BODY_CHANGES.test(bodyContent) && !currentLabels.includes(ROOT_LABELS.CHANGES)) {
        thread.addLabel(rootLabelObjects.CHANGES);
        console.log(`REVIEW: Added [${ROOT_LABELS.CHANGES}] to "${subject}"`);
      }
    }
  }
}
