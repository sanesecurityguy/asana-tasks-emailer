//// CHANGE THE recipient VARIABLE IN THE Parameters.gs FILE BEFORE TESTING !!!
//// This is the main script file that pulls Asana task data and sends it in an email. If you don't intend on changing how the script works, then please leave this Code.gs file be and don't change anything here.



// Get all the tags' and sections' names from the Parameters.gs file in easy-to-use ordered arrays
// Note that the Object.values() and Object.entries() methods are not supported on Google Apps Script, so we'll make due with just Object.keys()
var tagNames = Object.keys (tags);
var sectionNames = Object.keys (sections);

// Function for parsing the data in a URL into a usable form
function getData (URL) {
  var response = UrlFetchApp.fetch (URL, auth);
  var data = JSON.parse(response);
  var dataArray = data.data;
  return dataArray;
}

// Function for parsing a task's data into a string
function getTask (taskData) {
  var task = taskData.name;
  if (addAssigneeNameToTask) {task += assignedTo (taskData.assignee)} // Add assignee names to the ends of tasks or don't, according to the Parameters.gs file
  return task;
}

// Function for finding out who a task is assigned to so we can add that user's name to the end of the task name
function assignedTo (assigneeObject) {
  if (assigneeObject !== null) {
    for (var index = 0; index <= users.length; index++) {
      if (index === users.length) {
        return ' - new team member';
      } else {
        var user = users [index];
      }
      if (user.GID === assigneeObject.gid) {
        return ' - ' + user.name;
      } else {
        continue;
      }
    }
  } else {
    return stringForUnassignedTasks;
  }
}

// Function for creating an array of all the tasks in a given tag URL
function getTagTasks (tagURL) {
  var tagData = getData (tagURL);
  var tagArray = tagData.map (getTask);
  return tagArray;
}

/* We extract each tag's tasks into an array of arrays called allTags which will have the below structure:

    [
      [tag1, tag1task1],
      [tag2, tag2task1, tag2task2, tag2task3],
      [tag4, tag4task1],
      [tag5, tag5task1, tag5task2]
    ]
    // In this example, tag 3 has no tasks, so we don't include it

*/
var allTags = [];
for (var index = 0; index < tagNames.length; index++) {
  var tagName = tagNames [index];
  var tagURL = tags [tagName];
  var tagArray = getTagTasks (tagURL);
  if (tagArray.length > 0) {
    tagArray.unshift (tagName);
    allTags.push (tagArray);
  }
}

// Function for searching through the comments of a task for the keyword, returning any comments with the keyword in an array
// Also edits the keyword out of the comment or notifies the errorRecipient that it could not do so
function getComments (taskGID) {
  var taskURL = 'https://app.asana.com/api/1.0/tasks/{}/stories'.replace ("{}", taskGID);
  var taskStories = getData (taskURL);
  var commentArray = [];
  for (var index = 0; index < taskStories.length; index++) {
    var story = taskStories [index];
    if (story ['type'] === 'comment') {
      var startOfComment = story['text'].slice (0, keyword.length + 1).toLowerCase(); // Note that Google Apps Script doesn't support the string.startsWith() method
      if (startOfComment === keyword.toLowerCase() + ' ') {
        var comment = story ['text'].slice (keyword.length + 1);
      // Take into account the commenter may have forgotten to add a space after the keyword
      } else if (startOfComment.slice (0, -1) === keyword.toLowerCase()) {
        var comment = story ['text'].slice (keyword.length);
      } else {
        continue;
      }
      commentArray.push (comment);
      // And then we attempt edit the keyword out so that the comment won't be extracted again in future emails
      var commentGID = story ['gid'];
      var commentURL = 'https://app.asana.com/api/1.0/stories/{}'.replace ("{}", commentGID);
      var params = {'headers': '',
                    'method': 'put',
                    'payload': {"text": "[Already emailed] " + comment}};
      // Only the original commenter can edit a comment, so we find out who it is first
      var commentAuthor = getCommentAuthor (commentURL);
      // We look for them in the users variable of the Parameters.gs file. If we find them, we use their PAT in the PUT request. If not, we send an email to the errorRecipient notifying them of the problem.
      for (var index = 0; index <= users.length; index++) {
        if (index === users.length) {
          var taskURLinUI = 'https://app.asana.com/0/900394093299303/{}'.replace ("{}", taskGID);
          var originalComment = story ['text'];
          var errorBody = 'The script could not edit the keyword ' + keyword + ' into [Already emailed].' + '\n';
          errorBody += 'The task is: "{}"'.replace ("{}", task) + '\n';
          errorBody += 'The comment is: "{}"'.replace ("{}", originalComment) + '\n';
          errorBody += "Here is a link to the task:" + '\n';
          errorBody += taskURLinUI + '\n' + '\n';
          errorBody += "The error is most likely because the comment author is a new team member who hasn't been included yet in the users variable of the script's Parameters.gs file.";
          MailApp.sendEmail({to: errorRecipient, subject: 'Comment error in Tasks Update - ' + date, body: errorBody});
        } else {
          var user = users [index];
          if (commentAuthor === user.GID) {
            params ['headers'] = user.PAT;
            UrlFetchApp.fetch (commentURL, params);
            break;
          }
        }
      }
    }
  }
  return commentArray;
}

// Function for finding out who the author of a comment is and returns that user's GID
function getCommentAuthor (commentURL) {
  var comment = getData (commentURL);
  var commentAuthor = comment.created_by;
  var commentAuthorGID = commentAuthor.gid;
  return commentAuthorGID;
}

// Function for creating an object for a section wherein the section's tasks are the keys and an array of the task's comments (that have the keyword) are their corresponding values
/* To be clear, it will have the below structure:

    {
      task1 : [task1comment1, task1comment2],
      task2 : [] // If a none of a task's comments have the keyword or the task has no comments at all, use an empty array
    }

*/
function getSectionTasksAndComments (sectionURL) {
  var sectionObject = {};
  var sectionData = getData (sectionURL);
  for (var index = 0; index < sectionData.length; index++) {
    var taskData = sectionData [index];
    var task = getTask (taskData);
    var taskGID = taskData.gid;
    var commentArray = [];
    if (attachCommentsWithKeyword) {commentArray = getComments (taskGID)}; // Attach each tasks' comments (with the keyword) to them or don't, according to the Parameters.gs file
    sectionObject [task] = commentArray;
  }
  return sectionObject;
}

/* We extract each section's tasks and task comments into objects, then put those objects into an array called allSections which will have the below structure:

    [
      {
        name          : section1,
        section1task1 : [section1task1comment1, section1task1comment2],
        section1task2 : []
      },
      {
        name          : section2,
        section2task1 : [section2task1comment1]
      },
      {
        name          : section3,
        section3task1 : [section3task1comment1],
        section3task2 : [],
        section3task3 : [section3task3comment1]
      },
      {
        name          : section5,
        section5task1 : [section5task1comment1, section5task1comment2, section5task1comment3]
      }
    ]
    // In this example, section 4 has no tasks, so we don't include it

*/
var allSections = [];
for (var index = 0; index < sectionNames.length; index++) {
  var sectionName = sectionNames [index];
  var sectionURL = sections [sectionName];
  var sectionObject = getSectionTasksAndComments (sectionURL);
  if (Object.keys (sectionObject).length > 0) {
    sectionObject ['name'] = sectionName;
    allSections.push (sectionObject);
  }
}

// Here we make one single array wherein each element represents a line in the email body
/* To be clear, it will have the below structure:

    [
      section1,
      section1tag1,
      section1tag1task1,
      section1tag1task1comment1,
      section1tag1task1comment2,
      section1tag1task2,
      section1tag1task3,
      section1tag2,
      section1tag2task1,
      section1tag2task1comment1,
      section2,
      section2tag1,
      section2tag1task1,
      section2tag1task2,
      ...
    ]
    
*/
var emailLines = [];
for (var sectionIndex = 0; sectionIndex < allSections.length; sectionIndex++) {
  var sectionObject = allSections [sectionIndex];
  var sectionLines = [];
  for (var tagIndex = 0; tagIndex < allTags.length; tagIndex++) {
    var tagArray = allTags [tagIndex];
    var tagName = tagArray [0];
    var tagLines = [];
    for (var taskIndex = 1; taskIndex < tagArray.length; taskIndex++) {
      var task = tagArray [taskIndex];
      if (Object.keys (sectionObject).indexOf (task) > -1) { // We use .indexOf() instead of .includes() because Google Apps Script doesn't support .includes() for both arrays and strings
        tagLines.push ('Task: ' + task);
        var comments = sectionObject [task];
        for (var commentIndex = 0; commentIndex < comments.length; commentIndex++) {
          tagLines.push ('Comment: ' + comments [commentIndex]);
        }
      }
    }
    if (tagLines.length > 0) {
      tagLines.unshift (tagName);
      sectionLines = sectionLines.concat (tagLines);
    }
  }
  if (sectionLines.length > 0) {
    sectionLines.unshift (sectionObject.name);
    emailLines = emailLines.concat (sectionLines);
  }
}

// Here we build a formatted string body for the email
// Note that Google Apps Script supports neither the array.includes() nor the string.startsWith() methods
var stringBody = '';
for (var index = 0; index < emailLines.length; index++) {
  var currentLine = emailLines [index];
  if (sectionNames.indexOf (currentLine) > -1) {
    stringBody += '\n' + '--------------------------------------------------------------------------------------------------------' + '\n' + '\n' + currentLine + '\n' + '\n';
  } else if (tagNames.indexOf (currentLine) > -1) {
    stringBody += '---------------------------------------------------' + '\n' + currentLine + '\n' + '---------------------------------------------------' + '\n';
  } else if (currentLine.slice (0, 6) === 'Task: ') {
    stringBody += ' - ' + currentLine.slice (6) + '\n';
  } else if (currentLine.slice (0, 9) === 'Comment: ') {
    stringBody += '      >>> ' + currentLine.slice (9) + '\n';
  }
}
if (stringIntro === undefined) {var stringIntro = ''}
if (stringOutro === undefined) {var stringOutro = ''}
stringBody = stringIntro + '\n' + stringBody + '\n';
stringBody += '--------------------------------------------------------------------------------------------------------' + '\n' + '\n';
stringBody += stringOutro;

// Here we build a formatted HTML body for the email
// Note that Google Apps Script supports neither the array.includes() nor the string.startsWith() methods
var HTMLbody = '';
for (var index = 0; index < emailLines.length; index++) {
  var currentLine = emailLines [index];
  var nextLine = emailLines [index + 1];
  switch (nextLine === undefined) {
    case true: // If it's the last line in emailLines
      if (currentLine.slice (0, 6) === 'Task: ') {
        HTMLbody += '<li>' + currentLine.slice (6) + '</li></ul>';
      } else if (currentLine.slice (0, 9) === 'Comment: ') {
        HTMLbody += '<font color="red"><li>' + currentLine.slice (9) + '</li></font></ul></li></ul>';
      }
      break;
    default:
      // If it's a section
      if (sectionNames.indexOf (currentLine) > -1) {
        HTMLbody += "<br><p><b>" + currentLine + "</b></p>";
      // If it's a tag
      } else if (tagNames.indexOf (currentLine) > -1) {
        HTMLbody += '<p style="text-indent: 28px"><b><u>' + currentLine + "</u></b></p><ul style='list-style-type: disc'>";
      // If it's a task
      } else if (currentLine.slice (0, 6) === 'Task: ') {
        HTMLbody += '<li>' + currentLine.slice (6);
        // Followed by a task
        if (nextLine.slice (0, 6) === 'Task: ') {
          HTMLbody += '</li>';
        // Followed by a comment
        } else if (nextLine.slice (0, 9) === 'Comment: ') {
          HTMLbody += "<ul style='list-style-type: disc'>";
        // Followed by a tag or section
        } else {
          HTMLbody += '</li></ul>';
        }
      // If it's a comment
      } else if (currentLine.slice (0, 9) === 'Comment: ') {
        HTMLbody += '<font color="red"><li>' + currentLine.slice (9) + '</li></font>';
        // Followed by a comment
        if (nextLine.slice (0, 9) === 'Comment: ') {
          continue;
        // Followed by a task
        } else if (nextLine.slice (0, 6) === 'Task: ') {
          HTMLbody += '</ul></li>';
        // Followed by a tag or section
        } else {
          HTMLbody += '</ul></li></ul>';
        }
      }
  }
}
if (HTMLintro === undefined) {var HTMLintro = ''}
if (HTMLoutro === undefined) {var HTMLoutro = ''}
HTMLbody = '<html><body>' + HTMLintro + '<br>' + HTMLbody + '<br>' + HTMLoutro + '</body></html>';

// Here we embolden text patterns in the email's HTML body or don't, according to the Parameters.gs file
if (emboldenTextPatterns) {
  for (var index = 0; index < textPatterns.length; index++) {
    var textPattern = textPatterns [index];
    HTMLbody = HTMLbody.replace (textPattern, '<b>\$1</b>');
  }
}

// This function sends a string email without any HTML body
// This is just for testing the string body
function stringEmail () {
  if (emailLines.length > 0) {
    MailApp.sendEmail ({to: recipient, subject: 'Tasks Update - ' + date, body: stringBody});
  }
}

// This function finally sends the email if it's not devoid of tasks
function sendEmail () {
  if (emailLines.length > 0) {
    MailApp.sendEmail ({to: recipient, subject: 'Tasks Update - ' + date, body: stringBody, htmlBody: HTMLbody});
  }
}
