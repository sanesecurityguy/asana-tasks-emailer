//// These are the script's parameters. Please carefully read everything and make it all suit your needs and preferences.



// CHANGE THIS FIRST BEFORE TESTING !!!
// This is/are the email address/es the email will be sent to
var recipient = 'client@clientcompany.com,projectmanager@yourcompany.com'; // There can be more than one email address separated by commas (no spaces). DO NOT SEND TO THESE WHEN TESTING!!!
//var recipient = 'projectmanager@yourcompany.com'; // Your project manager's email address in case they want to review or edit the email first before forwarding it to the client
//var recipient = 'you@yourcompany.com'; // Your email address for testing
var errorRecipient = 'you@yourcompany.com,projectmanager@yourcompany.com'; // Email address/es to send notifications of errors to

var client = "[client]"; // The client's name to be used in the email
var sender = "[sender]"; // The sender's name to be used in the email. Take note that the sender's email address is always the Gmail address associated with the Google account that owns the Google Apps Script project.

// You can disable some of the unique features of the script here by changing these variables to false
var addAssigneeNameToTask = true;
var attachCommentsWithKeyword = true;
var emboldenTextPatterns = true;

// This is the personal access token (PAT) we will use to authenticate GET requests to the Asana API. The PAT of any user with access to the Asana project will do for this.
// To make a new PAT associated with your Asana account, you must log into your Asana account, click on your profile icon, then go to My Profile Settings > Apps > Manage Developer Apps > New access token
var auth = {'headers' : {'Authorization': 'Bearer 0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}};

// These are the names, global ID's (GID's), and personal access tokens (PAT's) of the various users of the Asana project
// Each user must either make a new PAT or use an existing one belonging to them
// If addAssigneeNameToTask is false, then the name property is unnecessary and can be ignored or deleted
// If attachCommentsWithKeyword is false, then the PAT property is unnecessary and can be ignored or deleted
// If both of the above are false, you can ignore or delete this variable entirely. However, you will still need one user's PAT to be used in the auth variable.
// To find your Asana project's user GID's, log in to your Asana account and then navigate to https://app.asana.com/api/1.0/users/
var users = [
              {name : "Andy",
               GID  : "xxxxxxxxxxxxxxx",
               PAT  : {'Authorization': 'Bearer 0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              },
            
              {name : "Billy",
               GID  : "xxxxxxxxxxxxxxx",
               PAT  : {'Authorization': 'Bearer 0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              },
            
              {name : "Casey",
               GID  : "xxxxxxxxxxxxxxx",
               PAT  : {'Authorization': 'Bearer 0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              },
            
              {name : "Danny",
               GID  : "xxxxxxxxxxxxxxx",
               PAT  : {'Authorization': 'Bearer 0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              },
            
              {name : "Eddy",
               GID  : "xxxxxxxxxxxxxxx",
               PAT  : {'Authorization': 'Bearer 0/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'}
              }
            ];

// All the names and URL's of the tags on the Asana project that you want included in the email. Keep in mind that these property names are what the tags will be called in the email.
// To find your Asana project's tag GID's, log in to your Asana account and then navigate to https://app.asana.com/api/1.0/tags/
var tags = {"Mobile App" : 'https://app.asana.com/api/1.0/tags/[insert tag GID here]/tasks?opt_fields=name,assignee',
            "Chat Bot"   : 'https://app.asana.com/api/1.0/tags/[insert tag GID here]/tasks?opt_fields=name,assignee',
            "Website"    : 'https://app.asana.com/api/1.0/tags/[insert tag GID here]/tasks?opt_fields=name,assignee',
            "CRM"        : 'https://app.asana.com/api/1.0/tags/[insert tag GID here]/tasks?opt_fields=name,assignee',
            "API"        : 'https://app.asana.com/api/1.0/tags/[insert tag GID here]/tasks?opt_fields=name,assignee'};

// All the names and URL's of the sections of the Asana project that you want included in the email. Keep in mind that these property names are what the sections will be called in the email.
// Note that your Asana project's "lists" and "columns" are actually called "sections" in the Asana API, so I refer to them as "sections" here and in the Code.gs file
// To find your Asana project's section GID's, log in to your Asana account and navigate to https://app.asana.com/api/1.0/projects/, get the project's GID and paste it into the URL https://app.asana.com/api/1.0/projects/[insert project GID here]/sections/
var sections = {"DONE:"     : 'https://app.asana.com/api/1.0/sections/[insert section GID here]/tasks?opt_fields=name,assignee',
                "DOING:"    : 'https://app.asana.com/api/1.0/sections/[insert section GID here]/tasks?opt_fields=name,assignee',
                "PRIORITY:" : 'https://app.asana.com/api/1.0/sections/[insert section GID here]/tasks?opt_fields=name,assignee',
                "TO DO:"    : 'https://app.asana.com/api/1.0/sections/[insert section GID here]/tasks?opt_fields=name,assignee',
                "ICEBOX:"   : 'https://app.asana.com/api/1.0/sections/[insert section GID here]/tasks?opt_fields=name,assignee'};

// The string to be added to the ends of unassigned tasks (You can use an empty string to leave tasks unaltered)
// If addAssigneeNameToTask is false, you can ignore or delete this variable
var stringForUnassignedTasks = ' - unassigned'; // Just my default. You can change this into whatever you like. Starting with space-dash-space is recommended for uniformity with assigned tasks when addAssigneeNameToTask is true.

// The keyword to be added to the beginning of task comments to mark them for inclusion in the email. (The keyword itself will not be included in the email.)
// A comment with the keyword is included in the email only once, after which the keyword is edited out and replaced with "[Already emailed]" to notify Asana users that the comment has already been sent in an email at least once. Editing the comment back to include the keyword at the beginning again will make the script include the comment in the email again once more.
// If attachCommentsWithKeyword is false, you can ignore or delete this variable
var keyword = "[Extract]"; // Just my default. You can change this into whatever you like. (Case-insensitive)

// This/These is/are the regular expression/s to be used to decide what text patterns to embolden in the email's HTML body
// If emboldenTextPatterns is false, you can ignore or delete this variable
var textPatterns = [
                     /(\[(?:recurring|blocked|block|request)\])/ig, // Find text patterns such as "[Recurring]", "[BLOCKED]", and "[request]"
                     /(\(\d{1,2}(?:\.\d{1})? {0,2}(?:hrs?|hours?|days?)\))/ig // Find text patterns such as "(3hrs)", "(6.5 hours)", "(1 hr)", and "(99days)", even with an accidental double-space like "(99  days)"
                   ];

// You can customize the email's subject line here
var date = Utilities.formatDate (new Date(), "GMT+8", "EEEE, MMMM d, yyyy"); // This is my default date format of [Day of the Week], [Full Month Name] [Day of the Month], [Year]
var subject = 'Tasks Update - ' + date;

/* You can customize the email's introduction and outroduction here. If you don't want an introduction or outroduction, you can delete any or all of these variables or leave them as empty strings. */
// The string intro and outro to be used in the string email body, which is the email body that recipient/s will see in case the HTML email body cannot be sent or read
var stringIntro = "Hi " + client + "," + '\n' + '\n' +
                  "Here are the latest updates on our tasks.";
var stringOutro = "Regards," + '\n' +
                  sender;
// The HTML intro and outro to be used in the HTML email body, which is the email body recipient/s is/are supposed to see by default
var HTMLintro = 'Hi ' + client + ',' + '<br>' + '<br>' +
                'Here are the latest updates on our tasks.';
var HTMLoutro = 'Regards,' + '<br>' +
                sender;
