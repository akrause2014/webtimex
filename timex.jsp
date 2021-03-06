<!DOCTYPE html>
<html>
<head>
    <title>Timex</title>

    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="jquery.mobile-1.4.5/jquery.mobile-1.4.5.min.css" />
    <style>
    #listview li.active a {
        background: lightyellow !important;
    }
    .controlgroup-textinput{
        padding-top:.22em;
        padding-bottom:.22em;
    }
    .project-table thead th,
    .project-table tbody tr:last-child {
        border-bottom: 1px solid #d6d6d6; /* non-RGBA fallback */
        border-bottom: 1px solid rgba(0,0,0,.1);
    }
    .project-table tbody th,
    .project-table tbody td {
        border-bottom: 1px solid #e6e6e6; /* non-RGBA fallback  */
        border-bottom: 1px solid rgba(0,0,0,.05);
    }
    .project-table tbody tr:last-child th,
    .project-table tbody tr:last-child td {
        border-bottom: 0;
    }
    .project-table tbody tr:nth-child(odd) td,
    .project-table tbody tr:nth-child(odd) th {
        background-color: #eeeeee; /* non-RGBA fallback  */
        background-color: rgba(0,0,0,.04);
    }
    pre {
        padding: 1em 1em 1em 1em;
        border: 1px solid #ccc;
        background-color: #e6e6e6;
        margin: 2em;
        overflow: auto;
        width: 93%;
    }
    </style>
    <script src="js/jquery-1.11.2.min.js"></script>
    <script src="jquery.mobile-1.4.5/jquery.mobile-1.4.5.min.js"></script>
    <script src="js/jquery.ui.datepicker.js"></script>
    
    <script>
    /*
     * jQuery Mobile: jQuery UI Datepicker Monkey Patch
     * http://salman-w.blogspot.com/2014/03/jquery-ui-datepicker-for-jquery-mobile.html
     */
    (function() {
        // use a jQuery Mobile icon on trigger button
        $.datepicker._triggerClass += " ui-btn ui-btn-right ui-icon-carat-d ui-btn-icon-notext ui-corner-all";
        // replace jQuery UI CSS classes with jQuery Mobile CSS classes in the generated HTML
        $.datepicker._generateHTML_old = $.datepicker._generateHTML;
        $.datepicker._generateHTML = function(inst) {
            return $("<div></div>").html(this._generateHTML_old(inst))
                .find(".ui-datepicker-header").removeClass("ui-widget-header ui-helper-clearfix").addClass("ui-bar-inherit").end()
                .find(".ui-datepicker-prev").addClass("ui-btn ui-btn-left ui-icon-carat-l ui-btn-icon-notext").end()
                .find(".ui-datepicker-next").addClass("ui-btn ui-btn-right ui-icon-carat-r ui-btn-icon-notext").end()
                .find(".ui-icon.ui-icon-circle-triangle-e, .ui-icon.ui-icon-circle-triangle-w").replaceWith(function() { return this.childNodes; }).end()
                .find("span.ui-state-default").removeClass("ui-state-default").addClass("ui-btn").end()
                .find("a.ui-state-default.ui-state-active").removeClass("ui-state-default ui-state-highlight ui-priority-secondary ui-state-active").addClass("ui-btn ui-btn-active").end()
                .find("a.ui-state-default").removeClass("ui-state-default ui-state-highlight ui-priority-secondary").addClass("ui-btn").end()
                .find(".ui-datepicker-buttonpane").removeClass("ui-widget-content").end()
                .find(".ui-datepicker-current").removeClass("ui-state-default ui-priority-secondary").addClass("ui-btn ui-btn-inline ui-mini").end()
                .find(".ui-datepicker-close").removeClass("ui-state-default ui-priority-primary").addClass("ui-btn ui-btn-inline ui-mini").end()
                .html();
        };
        // replace jQuery UI CSS classes with jQuery Mobile CSS classes on the datepicker div, unbind mouseover and mouseout events on the datepicker div
        $.datepicker._newInst_old = $.datepicker._newInst;
        $.datepicker._newInst = function(target, inline) {
            var inst = this._newInst_old(target, inline);
            if (inst.dpDiv.hasClass("ui-widget")) {
                inst.dpDiv.removeClass("ui-widget ui-widget-content ui-helper-clearfix").addClass(inline ? "ui-content" : "ui-content ui-overlay-shadow ui-body-a").unbind("mouseover mouseout");
            }
            return inst;
        };
    })();
    </script>
    <style>
    .demo-info { margin: 0.8em 0 0; font-size: 1em; }
    .ui-datepicker { display: none; }
    /* set height and left/right margin to accomodate prev/next icons */
    .ui-datepicker-header { position: relative; padding: 0.3125em 2.0625em; line-height: 1.75em; text-align: center; }
    .ui-datepicker-header .ui-btn { margin: -1px 0 0 0; }
    /* fixed width layout for calendar; cells are fixed width */
    .ui-datepicker-calendar { border-collapse: collapse; line-height: 2; }
    .ui-datepicker-calendar .ui-btn { margin: 0; padding: 0; width: 2em; line-height: inherit; }
    .ui-datepicker-today .ui-btn { text-decoration: underline !important; }
    .ui-datepicker-days-cell-over .ui-btn { border-color: inherit !important; }
    .ui-datepicker-buttonpane .ui-btn { float: left; margin: 0.5em 0 0; padding: 0.5em 1em; }
    .ui-datepicker-buttonpane .ui-btn:last-child { float: right; }
    /* class that can be added to datepicker <input> element's wrapper; makes room for trigger button */
    .dp-input-button-wrap { position: relative; padding-right: 2.5em; }
    .dp-input-button-wrap .ui-btn { top: 0.1875em; margin: 0; }
    /* jQM framework wraps popup content inside a div with the ID <div-id>-popup */
    #dp-fullsize-popup { width: 80%; }
    /* fluid width layout for calendar; table is 100% wide; cells size automatically */
    .ui-datepicker-inline .ui-datepicker-calendar { width: 100%; }
    .ui-datepicker-inline .ui-datepicker-calendar .ui-btn { width: auto; }
    </style>
    
    <script>var webapp = "<%=request.getContextPath()%>"</script>
    <script src="js/timex.js"></script>

<body>

<div data-role="page" id="tracker" data-title="Timex">

    <div data-role="header" id="trackerHeader">
        <a href="#documentation" class="ui-btn ui-icon-info ui-btn-icon-notext ui-btn-left ui-corner-all" data-transition="slide" data-direction="reverse"></a>
        <h2><div id="tracker_date"></div></h2>
        <a href="#menu" class="ui-btn ui-icon-bars ui-btn-icon-notext ui-btn-right ui-corner-all"></a>
    </div><!-- /header -->
  
    <div data-role="panel" id="menu" data-display="overlay" data-position="right" >
        <div class="ui-corner-all custom-corners">
          <div class="ui-bar ui-bar-a">
            <h3>Projects</h3>
          </div>
          <div class="ui-body ui-body-a" >
             <a href="#editProjects" class="ui-btn ui-shadow">Edit Data</a>
             <a href="#addProject" data-rel="popup" class="ui-btn ui-shadow">Add Project</a>
             <button id="deleteProjectButton" class="ui-btn ui-shadow" data-rel="close">Delete Selected</button>
             <a href="#schedule" id="fetchScheduleButton" class="ui-btn ui-shadow">View Schedule</a>
          </div>
        </div>
        <div class="ui-corner-all custom-corners">
          <div class="ui-bar ui-bar-a">
            <h3>Report</h3>
          </div>
          <div class="ui-body ui-body-a" >
             <a href="#report" class="ui-btn ui-shadow" data-transition="slide">Create Report</a>
             <a href="#update515" class="ui-btn ui-shadow" data-transition="slide">Report 515</a>
          </div>
        </div>
        <div class="ui-corner-all custom-corners">
          <div class="ui-bar ui-bar-a">
            <h3>Data Store</h3>
          </div>
          <div class="ui-body ui-body-a" >
              <a href="#database" class="ui-btn ui-shadow" data-transition="slide">Synchronise</a>
          </div>
        </div>
    </div>
    <div data-role="panel" id="addProject" data-display="overlay" data-position="right">
        <div>
            <label for="projectName">Project Name:</label>
            <input id="projectName" value="" data-theme="a" type="text">
        </div>
        <!--
        <label for="selectAddAsSubproject" class="select">As sub project of:</label>
        <select id="selectAddAsSubproject">
            <option value="None">None</option>
        </select>
        -->
        <div>
            <button id="addProjectButton" class="ui-btn ui-corner-all ui-btn-inline" data-rel="close">Add</button>
            <button id="addProjectButtonCancel" class="ui-btn ui-corner-all ui-btn-inline" data-rel="close">Cancel</button>
        </div>
    </div>

    <div role="main" class="ui-content">
        
        <ul data-role="listview" data-inset="true" data-icon="false" id="listview">
            <li>
                <div class="ui-grid-a">
                    <div class="ui-block-a" style="width:60%">
                        <div class="ui-bar"><h3>Project</h3></div>
                    </div>
                    <div class="ui-block-b" style="width:40%">
                        <div class="ui-bar"><h3>Time</h3></div>
                    </div>
                </div>
            </li>
        </ul>
        <ul data-role="listview" data-inset="true" data-icon="false" id="totalTimeListview">
        </ul>
        <input id="stopTrackerButton" value="Pause" type="button"></input> 
        
        
    </div>

</div><!-- /page -->


<div data-role="page" id="schedule" data-title="Timex">

    <div data-role="header">
        <a href="#tracker" class="ui-btn ui-btn-icon-left ui-icon-carat-l" data-transition="slide" data-direction="reverse">Tracker</a>
        <h1>Schedule</h1>
    </div><!-- /header -->

    <div role="main" class="ui-content">
        <div><h2 id="scheduleMonthHeader" style="text-align:center;"></h2></div>
        <table data-role="table" id="scheduleTable" data-mode="reflow" data-inset class="ui-responsive project-table">
            <thead>
            </thead>
            <tbody>
            </tbody>
        </table>

        <input id="importProjectsButton" value="Add Projects To Tracker" type="button"></input>

    </div>

</div>

<div data-role="page" id="update515" data-title="Timex">

    <div data-role="header">
        <a href="#tracker" class="ui-btn ui-btn-icon-left ui-icon-carat-l" data-transition="slide" data-direction="reverse">Tracker</a>
        <h1>Report Hours</h1>
    </div><!-- /header -->

    <div role="main" class="ui-content">
        <div><h2 id="update515MonthHeader" style="text-align:center;"></h2></div>
        
        <div class="ui-grid-a">
            <div class="ui-block-a"><a id="update515PrevMonthButton" class="ui-btn ui-icon-carat-l ui-btn-icon-left ui-corner-all" type="button">Previous</a></div>
            <div class="ui-block-b"><a id="update515NextMonthButton" class="ui-btn ui-icon-carat-r ui-btn-icon-right ui-corner-all" type="button">Next</a></div>
        </div>
        
        <h2>Reported Hours</h2>
        
        <table data-role="table" id="update515Table" data-mode="reflow" data-inset class="ui-responsive project-table">
            <thead>
                <tr>
                    <th>Task</th>
                    <th>Actual</th>
                    <th>Minimum</th>
                    <th>Suggested</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>

        <table data-role="table" id="update515Table" data-mode="reflow" data-inset class="ui-responsive project-table">
            
            <h2>Comments</h2>
            <p>
                Comments for tasks are optional unless shown in bold and marked with *. Mandatory comments usually indicate an external reporting requirement so make sure text you enter is suitable for external consumption.
            </p>
        <table data-role="table" id="update515Comments" data-mode="reflow" data-inset class="ui-responsive project-table">
            <thead>
                <tr>
                    <th>Task name</th>
                    <th>Comment</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        </table>

        <input id="post515Update" value="Submit 515" type="button"></input>

    </div>
        

</div>


<div data-role="page" id="report" data-title="Timex">

    <div data-role="header">
        <a href="#tracker" class="ui-btn ui-btn-icon-left ui-icon-carat-l" data-transition="slide" data-direction="reverse">Tracker</a>
        <h1>Create Report</h1>
    </div><!-- /header -->

    <div role="main" class="ui-content">
        
        <div>
            <input type="checkbox" name="checkbox-fetchSchedule" id="checkbox-fetchSchedule" class="ui-btn-icon-left">
            <label for="checkbox-fetchSchedule">Show Schedule</label>
        </div>

        <h3>Select a date range:</h3>
        <div>
            <input type="text" data-role="date" id="startDate">
            <input type="text" data-role="date" id="endDate">
        </div>
        <a href="#reportResult" id="reportSubmitButton" class="ui-btn" data-transition="slide">Submit</a>

        <h3>Or select one of the following:</h3>
        <div>
            <a href="#reportResult" class="ui-btn" id="reportThisWeekButton" data-transition="slide">This Week</a>
            <a href="#reportResult" class="ui-btn" id="reportLastWeekButton" data-transition="slide">Last Week</a>
            <a href="#reportResult" class="ui-btn" id="reportThisMonthButton" data-transition="slide">This Month</a>
            <a href="#reportResult" class="ui-btn" id="reportLastMonthButton" data-transition="slide">Last Month</a>
        </div>
        
    </div>

</div><!-- /page -->

<div data-role="page" id="reportResult" data-title="Timex">

    <div data-role="header">
        <a href="#report" class="ui-btn ui-btn-icon-left ui-icon-carat-l" data-transition="slide" data-direction="reverse">Report</a>
        <h1 id="report_date_range">Report</h1>
    </div><!-- /header -->

    <div role="main" class="ui-content">

        <div data-role="tabs" id="reportFormat">
            
            <input id="reportDurations" type="hidden">
            <div data-role="navbar">
                <ul>
                    <li><a href="#tabReportHTML" class="ui-btn-active">HTML</a></li>
                    <li><a href="#tabReportJSON">JSON</a></li>
                    <li><a href="#tabReportText">Text</a></li>
                </ul>
            </div>
            
            <div id="tabReportHTML" class="ui-body-d ui-content">
                <ul data-role="listview" data-inset="true" data-icon="false" id="reportListView"></ul>
                <ul data-role="listview" data-inset="true" data-icon="false" id="reportTotalListView"></ul>
            </div>
            <div id="tabReportJSON">
                <pre id="reportJSON">
                </pre>
                <a id="downloadReportAsJSON" class="ui-btn ui-shadow">Download as JSON</a>
            </div>
            <div id="tabReportText">
                <pre id="reportText">
                </pre>
                <a id="downloadReportAsText" class="ui-btn ui-shadow">Download as Text</a>
            </div>
        </div>
        
        <form>
            <fieldset data-role="controlgroup" data-type="horizontal" id="reportDisplayStyle">
                <legend>Display style:</legend>
                <input type="radio" name="reportDisplayStyle" id="reportDisplayStyleMinutes" value="minutes" checked="checked">
                <label for="reportDisplayStyleMinutes">HH:mm</label>
                <input type="radio" name="reportDisplayStyle" id="reportDisplayStyleFractions" value="fractions">
                <label for="reportDisplayStyleFractions">HH.f</label>
            </fieldset>
        </form>
    </div>

</div>

<div data-role="page" id="editProjects" data-title="Timex">

    <div data-role="header">
        <a href="#tracker" id="editReturnToTracker" class="ui-btn ui-btn-icon-left ui-icon-carat-l" data-transition="slide" data-direction="reverse">Tracker</a>
        <h1>Edit</h1>
    </div><!-- /header -->

    <div role="main" class="ui-content">
        <div>
            <div>Enter a date (format YYYY-MM-DD).</div>
            
            <!--<div><input type="text" type="date" id="editDate"></div>-->
            <div class="ui-grid-b">
                <div class="ui-block-a" style="width:20%">
                    <span style="float:right;">
                        <a href="" id="editLoadPrevDateButton" class="ui-btn ui-icon-carat-l ui-btn-icon-notext ui-corner-all" type="button"></a>
                    </span>
                </div>
                <div class="ui-block-b" style="width:40%">
                    <input type="text" type="date" id="editDate">
                </div>
                <div class="ui-block-c" style="width:20%">
                     <a href="" id="editLoadNextDateButton" class="ui-btn ui-icon-carat-r ui-btn-icon-notext ui-corner-all" type="button"></a>
                </div>
            </div>
                
            <!--<input id="editLoadButton" data-inline="true" value="Load" type="button"></input>-->
            <input id="editSaveButton" data-inline="true" value="Save" type="button" disabled=""></input>
            <input id="editCancelButton" data-inline="true" value="Cancel" type="button"></input>
        </div>
        <ul data-role="listview" data-inset="true" data-icon="false" id="editMessage">
        </ul>
        
        <ul data-role="listview" data-inset="true" data-icon="false" id="editListView">
        </ul>
        <form>
            <label for="editAddProjectText">Add a project:</label>
            <div data-role="controlgroup" data-type="horizontal">
                <input type="text" disabled="" id="editAddProjectText" data-wrapper-class="controlgroup-textinput ui-btn"></input>
                <input id="editAddProjectButton" data-inline="true" value="Add Project" type="button" disabled=""></input>
            </div>
            <input id="editAddCurrentButton" value="Add Scheduled Projects" type="button"></input>
            <input id="editDeleteAllButton" value="Clear All" type="button"></input>
        </form>
    </div>

</div>

<div data-role="page" id="allRecords" data-title="Timex">
    <div data-role="header">
        <a href="#database" class="ui-btn ui-btn-icon-left ui-icon-carat-l" data-transition="slide" data-direction="reverse">Timex Database</a>
        <h1>Export as JSON</h1>
    </div>
    <div data-role="main" class="ui-content">
        <div>
            <a id="downloadDatabaseAsJSON" class="ui-btn ui-shadow">Download</a>
        </div>
        <div>
            <pre id="databaseContents"></pre>
        </div>
    </div>
</div>

<div data-role="page" id="database" data-title="Timex">
    <div data-role="header">
        <a href="#tracker" class="ui-btn ui-btn-icon-left ui-icon-carat-l" data-transition="slide" data-direction="reverse">Tracker</a>
        <h1>Timex Database</h1>
    </div>

    <div data-role="main" class="ui-content">
        
        <h2>Synchronise</h1>
        <p>
            Back up the current contents of the browser database in the planning system.
            Note that backup overwrites any previously stored data.
            Retrieve updates the database of this browser and may replace existing dates.
        </p>
        <div class="ui-bar ui-bar-a ui-corner-all" id="latestBackupTimestamp">
            Latest backup: Unknown
        </div>
        <a id="postPlanningStashButton" class="ui-btn ui-shadow" data-transition="slide">Store backup</a>
        <a id="getPlanningStashButton" class="ui-btn ui-shadow" data-transition="slide">Retrieve backup</a>
        

        <h2>Export</h1>
        <p>
            Download the current content of the database as a JSON file.
        </p>
        <a href="#allRecords" id="exportDataButton" class="ui-btn ui-shadow" data-transition="slide">Export as JSON</a>
        
        <h2>Import</h2>
        <p>
            Inserts new dates and updates existing dates. Note that this may replace existing records.
        </p>
        <div>
            <input type="file" id="importDataFile"></a>
            <a id="importDataButton" class="ui-btn ui-shadow">Import from JSON</a>
        </div>
        
        <h2>Delete</h2>
        <p>
            Clear the database. 
        </p>
        <a id="clearDataButton" class="ui-btn ui-shadow">Clear Database</a>
        

    </div>
</div>

<!--
<div data-role="page" data-dialog="true" id="login">
  <div data-role="header">
    <h1>Login</h1>
  </div>

  <div data-role="main" class="ui-content">
      <label for="usernameInput">Username:</label>
      <input type="text" id="usernameInput"></input>
      <label for="passwordInput">Password:</label>
      <input type="password" id="passwordInput"></input>
      <label for="personidInput">User ID:</label>
      <input type="text" id="personidInput"></input>
      <a href="#schedule" class="ui-btn ui-shadow" id="loginButton">Login</a>
  </div>

</div>
-->

<div data-role="page" id="documentation" data-title="Timex">
    <div data-role="header">
        <h1>Documentation</h1>
        <a href="#tracker" class="ui-btn ui-btn-right ui-icon-home ui-btn-icon-notext" data-transition="slide">Tracker</a>
    </div><!-- /header -->
    <div role="main" class="ui-content">
        <h3>Tracker</h3>
        <p>
            When the tracker is opened the first time the project list is empty. 
            To add a project, click on the menu button at the top right  and select "Add Project".
        </p>
        <p>
            To activate a project select it in the list. 
            To pause the active project use the "Pause" button.
            An active project is restored when the browser window is closed and reopened or the page is reloaded.
            <i>The project keeps tracking the time even when the window is closed.</i>
        </p>
        <p>
            To delete a project click on the project in the list and select "Delete Selected" from the menu.
            This deletes the data of the selected project for today.
            It does not remove the project records from any other days in the database. 
        </p>
        <p>
            At the end of the day it is important to stop the activity by pressing the "Pause" button.
            This completes the day and stores the record. 
            Otherwise the selected project remains active - 
            <i>closing the window does not stop the tracker.</i>
        </p>
        <p>
            The timex data is stored locally in the browser. 
            You cannot see the data from another browser, nor can anyone else access your data.
            If accessing the page from another browser a new empty data store is created.
            See <i>Data Store</i> below for synchronising the contents of the data store with another instance.
            <b>The contents of the data store may be deleted if you wipe the browser's cache.</b>
        </p>
        <p>
            To view the current schedule in the planning system select "View Schedule" from the menu.
            The tasks from the schedule can be imported into the current project list.
        </p>
        <h3>Editing</h3>
        <p>
            It is possible to edit the existing records, including today's times. 
            Select "Edit data" from the menu.
            Select the date or use the buttons next to the text input to move to the next or previous day of the current date.
            Click "Save" to update the record, or "Cancel" to reset the times to the previous snapshot.
        </p>
        <p>
            If a date has no record in the database the displayed list is empty. 
            Tasks can be added manually or select "Add Current Projects" to add all tasks from today's tracker.
            Click "Clear All" to remove all projects from the list.
            Make sure to click "Save" to store the updated record, or "Cancel" to undo all changes.
        </p>
        <p>
            A project can be deleted from the day record by inserting "--:--" as the time value. Most browsers support this with the clear (x) button in the input field.
        <h3>Report</h3>
        <p>
            To create a report select "Create Report" in the menu and select a start date and end date. 
            Or select one of the date ranges below, for last week or last month for example.
            The report can be displayed and saved in a text format and as JSON.
        </p>
        <p>
            To report actual hours worked on projects to the planning system, select "Report 515" from the menu.
            Accept or edit the recorded time for each project against the suggested times and click "Submit 515" to update the planning database. 
            The reported hours are displayed in the column "Reported" of the 515 table.
            If a project is not named in the assigned schedule the reporting for this project will fail.
        </p>
        <h3>Data Store</h3>
        <p>
            The contents of the browser data store can be backed up to the planning database. Select "Synchronise" from the menu and click on "Store backup" to save a copy in the planning database and "Retrieve backup" to import the backup data back into your browser.
        <p>
            The contents of the data store may also be dumped to a JSON file.
            When importing this JSON file into another browser instance the import data is inserted into the data store day by day.
        </p>
        <p>
            Note that importing backup data overwrites existing days in the data store if the dates match.
        </p>
    </div>
    <div data-role="footer">
        <a href="#tracker" class="ui-btn ui-btn-right ui-icon-home ui-btn-icon-notext" data-transition="slide">Tracker</a>
    </div>
</div> 

</body>
</html>