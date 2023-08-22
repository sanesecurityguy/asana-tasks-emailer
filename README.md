# Asana Tasks Emailer

![](Sample%20screenshots/(1)%20Board%20View.png)
![](Sample%20screenshots/(3)%20Email%201.png)

A Google Apps Script deployment to pull task data from Asana and email that data to a client.

This script categorizes tasks by section, then sub-categorizes them according to tag, and puts them in both a string and an HTML email body which are sent off to the receiving email address/es.

This script has the following unique features, which can all be turned off:
*  The task's assignee is added to the end of the task in the email
*  Task comments with a specific keyword at the beginning are included in the email in red text once, after which the keyword is edited out of the comment to prevent inclusion in future emails and replaced with the string "[Already emailed]" to notify Asana board users that it has already been sent in an email at least once
*  Specific text patterns in the email are emboldened

To deploy this script, do the following (note that Google Apps Script uses .gs files, but I've used .js files in this repo for better syntax highlighting):
1. Copy and paste both the Code.gs and Parameters.gs files into a Google Apps Script project
2. Inspect and edit the Parameters.gs file as needed
3. Create a trigger for the sendEmail() function
