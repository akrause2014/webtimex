var activeProject = null;
var projects = {};
var db;

var editedProjects = {}
var editedDate = null;

function pretty_time_string(num) 
{
    return ( num < 10 ? "0" : "" ) + num;
}

function formatDate(date)
{
    return date.getFullYear() + '-' + pretty_time_string(date.getMonth()+1) + '-' + pretty_time_string(date.getDate())
}

function formatProjectName(projectName)
{
    // replaces all invalid characters by an underscore (_) 
    // might be an issue if using project names that differ only in a special character
    // TODO use seperate IDs for projects rather than some escaped name
    return projectName.replace(/[!\"#$%&'()*+,./:;<=>?@[\]^`{|}~ £]/g, '_');
}

function durationToSeconds(s)
{
    var parts = s.split(":");
    var hours = parseInt(parts[0]);
    var minutes = parseInt(parts[1]);
    var seconds = 0;
    if (parts.length >= 3)
    {
        seconds = parseInt(parts[2]);
    }   
    totalSeconds = hours*3600 + minutes*60 + seconds;
    return totalSeconds;
}

function secondsToDuration(total_seconds, showSeconds)
{
    if (showSeconds == undefined)
    {
        showSeconds = true;
    }
    
    var hours = Math.floor(total_seconds / 3600);
    total_seconds = total_seconds % 3600;

    var minutes = Math.floor(total_seconds / 60);
    total_seconds = total_seconds % 60;

    var seconds = Math.floor(total_seconds);

    hours = pretty_time_string(hours);
    minutes = pretty_time_string(minutes);
    seconds = pretty_time_string(seconds);

    var currentTimeString = hours + ":" + minutes;
    if (showSeconds) currentTimeString += ":" + seconds;
    return currentTimeString;
}

function getDurationOfActiveProject(date, startTime)
{
    var today = new Date
    if (today.toDateString() == date.toDateString())
    {
        date = today
    }
    else
    {
        // a timex record wasn't closed
        date.setHours(24, 0, 0, 0)
    }
    return (date - startTime) / 1000;
}

function readProjects()
{
    today = new Date
    date = formatDate(today)
    
    console.log('Loading projects for date ' + date)
    // document.querySelector("#listview").innerHTML = s;
    $('#listview').empty().append(createProjectListHeader());
    try {
        $('#listview').listview('refresh');
        $('#stopTrackerButton').button('disable');
    } catch (ex) {}
    projects = {}

    var lastDateRecord = null;
    var transaction = db.transaction(["timex"], "readonly");
    var store = transaction.objectStore("timex");
    var index = store.index("date");
    var request = index.openCursor(null, 'prev'); 
    request.onsuccess = function (event) {
        if (event.target.result) {
            lastDateRecord = event.target.result.value; //the object with max revision
        }
    };
    transaction.oncomplete = function (event) 
    {
        if (lastDateRecord == null)
        {
            // no projects
            console.log('No projects found.')
            return;
        }
        lastDate = lastDateRecord['date']
        console.log('Last date record was ' + lastDate)
        projects = lastDateRecord['projects'];
        if (date != lastDate)
        {
            // set all durations to zero if it's a new day
            for (var projectName in projects)
            {
                projects[projectName]['duration'] = 0
            }
            activeProject = null;
            storeTimex(new Date)
        }
        var total_duration = 0
        for (var projectName in projects)
        {
            var duration = projects[projectName]['duration']
            // catch any malformatted database entries
            if (isNaN(duration)) 
            {
                duration = 0;
                projects[projectName]['duration'] = 0;
            }
            total_duration += duration
            console.log('Setting ' + projectName + " with duration " + secondsToDuration(duration))
            $('#listview').append(createProjectListItem(projectName, duration));
            if(typeof $('#listview').listview() !== "undefined")
                $('#listview').listview('refresh');
        }
        // $('#listview').append("<li data-role=\"list-divider\"></li>")
        // $('#listview').append(createProjectListItem("Total", total_duration));
        // if(typeof $('#listview').listview() !== "undefined")
        //     $('#listview').listview('refresh');
        if (date == lastDate)
        {
            var startTime = lastDateRecord['startTime'];
            var actProj = lastDateRecord['activeProject'];
            if (startTime !== undefined && actProj !== undefined)
            {
                activeProject = actProj;
                console.log("Active project is " + actProj + " with start time: " + startTime);
                projects[activeProject]['startTime'] = startTime;
                var activeProjectId = formatProjectName(activeProject)
                var total_seconds = (new Date - startTime) / 1000;
                currentTimeString = secondsToDuration(total_seconds + projects[activeProject]['duration']);
                $('#' + activeProjectId + '-duration').text(currentTimeString);
                if(typeof $('#stopTrackerButton').button() !== "undefined")
                    $('#stopTrackerButton').button('enable');
                
                var listItems = $('#listview li');
                $('#listview').find('li[data-name=\"' + activeProject + '\"]').attr("data-theme", "a").attr("data-theme", "a").addClass('active');
            }
        }
    };
}

function createDatePicker(dpname)
{
    $(dpname).datepicker({
        'dateFormat' : 'yy-mm-dd',
        'firstDay' : 1,
        'showButtonPanel' : true
    });
    $(dpname).datepicker("setDate", new Date())
}

function createProjectListItem(projectName, durationInSeconds, showSeconds)
{
    var projectId = formatProjectName(projectName)
    var duration = secondsToDuration(durationInSeconds, showSeconds);
    msg =  "<li data-name=\"" + projectName + "\">"
    msg += "<a href=\"#\"><div class=\"ui-grid-a\">"
    msg += "<div class=\"ui-block-a\" style=\"width:60%\">"
    msg += "<div class=\"ui-bar\">" + projectName + "</div>"
    msg += "</div>"
    msg += "<div class=\"ui-block-b\" style=\"width:40%\">"
    msg += "<div id=\"" + projectId + "-duration\" class=\"ui-bar\">" + duration + "</div>"
    msg += "</div></div></a></li>"
    return msg
} 

function createProjectListHeader()
{    
    var s = "<li class=\"ui-li-static ui-body-inherit ui-first-child\">"
            + "<div class=\"ui-grid-a\">"
            + "<div class=\"ui-block-a\" style=\"width:60%\">"
            + "<div class=\"ui-bar\"><h3>Project</h3></div>"
            + "</div>"
            + "<div class=\"ui-block-b\" style=\"width:40%\">"
            + "<div class=\"ui-bar\"><h3>Time</h3></div>"
            + "</div></div></li>";
    return s;
}

function indexedDBOk() {
    return "indexedDB" in window;
}

function editReset(msg)
{
    $('#editMessage').empty().append("<li data-role=\"list-divider\"><h2>" + msg + "<h2></li>");
    if(typeof $('#editMessage').listview() !== "undefined")
        $('#editMessage').listview('refresh');
    $('#editAddProjectText').val('');
}

function editAddRow(projectName, durationInSeconds)
{
    var projectId = formatProjectName(projectName)
    var duration = secondsToDuration(durationInSeconds, false);
    msg =  "<li>"
    msg += "<div class=\"ui-grid-a\">"
    msg += "<div class=\"ui-block-a\" style=\"width:60%\">"
    msg += "<div class=\"ui-bar\">"
    msg += "<div class=\"ui-input-text ui-body-inherit ui-corner-all ui-shadow-inset\">"
    msg += "<input type=\"text\" value=\"" + projectName + "\" id=\"editProjectName-" + projectId + "\">"
    msg += "</div>"
    msg += "</div></div>"
    msg += "<div class=\"ui-block-b\" style=\"width:40%\">"
    msg += "<div class=\"ui-bar\">"
    msg += "<div class=\"ui-input-text ui-body-inherit ui-corner-all ui-shadow-inset\">"
    msg += "<input type=\"time\" value=\"" + duration + "\" id=\"editProjectDuration-" + projectId + "\">"
    msg += "</div></div></div></div></li>"
    return msg;
}

function loadEditDate()
{   
    $('#editListView').empty().append(createProjectListHeader());
    $('#editListView').listview('refresh');
    
    var date = $('#editDate').val()
    var dateFormat = new RegExp("^\\d\\d\\d\\d-\\d\\d-\\d\\d$")
    if (!dateFormat.test(date) || isNaN(Date.parse(date)) || formatDate(new Date(date)) != date)
    {
        // not a valid date - ignore
        $('#editMessage').empty().append("<li data-role=\"list-divider\"><h2>Invalid date.<h2></li>");
        $('#editMessage').listview('refresh');
        
        $('#editAddProjectButton').button('disable');
        $('#editSaveButton').button('disable');
        $('#editCancelButton').button('disable');
        $('#editAddProjectText').textinput('disable');
        return;
    }
    else
    {
        $('#editMessage').empty();
        $('#editMessage').listview('refresh');
    }
    
    editedDate = date
    console.log("Selected date: " + editedDate);
    editedProjects = {}
    var indexTransaction = db.transaction(["timex"], "readonly");
    var store = indexTransaction.objectStore("timex");
    var index = store.index("date");
    var range = IDBKeyRange.only(date);
    index.openCursor(range).onsuccess = function(evt) {
        var cursor = evt.target.result;
        if (cursor) {
            actProj = cursor.value['activeProject'];
            editedProjects = cursor.value['projects'];
            for (var projectName in editedProjects)
            {
                var durationInSeconds = editedProjects[projectName]['duration']
                if (isNaN(durationInSeconds)) durationInSeconds = 0;
                if (projectName == actProj)
                {
                    st = cursor.value['startTime']
                    durationInSeconds += getDurationOfActiveProject(new Date(date), st)
                }
                msg = editAddRow(projectName, durationInSeconds)
                $('#editListView').append(msg)
                $('#editListView').listview('refresh');
            }
            cursor.continue();
        }
        $('#editAddProjectButton').button('enable');
        $('#editSaveButton').button('enable');
        $('#editCancelButton').button('enable');
        $('#editAddProjectText').textinput('enable');
    };  
}
  
$(document).bind('pagecreate', '#editProjects', function(evt) 
{
    // set edit template to today
    $('#editDate').val(formatDate(new Date));
    
    $(document).off('click', '#editSaveButton').on('click', '#editSaveButton', function(){
        console.log('Store new record for ' + editedDate)
        if (editedDate)
        {
            var msg = '';
            for (projectName in editedProjects)
            {
                var projectId = formatProjectName(projectName)
                var durationStr = $("#editProjectDuration-" + projectId).val()
                var duration = durationToSeconds(durationStr);
                if (isNaN(duration))
                {
                    alert('Could not parse time for project ' + projectName
                          + '.\nPlease use the format "hh:mm".');
                    return;
                }
                editedProjects[projectName]['duration'] = duration;
            }
            storeEditedTimex(editedDate, editedProjects)
            editedProjects = {}
            editedDate = null;
        }
    });    
    $(document).off('click', '#editCancelButton').on('click', '#editCancelButton', function(){
        loadEditDate();
        editReset('Reloaded data for ' + $('#editDate').val());
    });
    $(document).off('click', '#editAddProjectButton').on('click', '#editAddProjectButton', function(e) {
        var projectName = $('#editAddProjectText').val();
        if (!projectName)
        {
            alert("Please enter a project name.");
            return;
        }
        if (projectName in editedProjects)
        {
            alert('Project "' + projectName + '" already exists.');
            return;
        }
        newproject = {}
        newproject['name'] = projectName
        newproject['duration'] = 0
        editedProjects[projectName] = newproject
        msg = editAddRow(projectName, 0);
        $('#editListView').append(msg)
        $('#editListView').listview('refresh');
        $('#editAddProjectText').val('');
    });    
    $(document).off('click', '#editLoadPrevDateButton').on('click', '#editLoadPrevDateButton', function(){
        // console.log('load previous date')
        if (!$('#editDate').val()) return;
        var date = new Date($('#editDate').val())
        if (date.toString() === "Invalid Date") return;
        date.setDate(date.getDate()-1);
        $('#editDate').val(formatDate(date));
        loadEditDate();
    });
    $(document).off('click', '#editLoadNextDateButton').on('click', '#editLoadNextDateButton', function(){
        if (!$('#editDate').val()) return;
        var date = new Date($('#editDate').val())
        if (date.toString() === "Invalid Date") return;
        date.setDate(date.getDate()+1);
        $('#editDate').val(formatDate(date));
        loadEditDate();
    });
    $(document).off('click', '#editLoadButton').on('click', '#editLoadButton', function(){
        loadEditDate();
    });
    $(document).off('change', '#editDate').on('change', '#editDate', function(){
        loadEditDate();
    });
    
    // not sure below should be on ... a lot of loading all the time
    // $(document).off('input', '#editDate').on('input', '#editDate', function(){
    //     loadEditDate();
    // });
});

$(document).on('pagebeforeshow', '#editProjects', function(){
    if (db !== undefined) loadEditDate();
});
$(document).off('pagecreate', '#editProjects').on('pagecreate', '#editProjects', function(){
    createDatePicker('#editDate');
});

$(document).bind('pagecreate', '#report', function(evt) {
    createDatePicker('#startDate');
    createDatePicker('#endDate')
});

$(document).bind('pagecreate', '#tracker', function(evt) 
{
    var today = new Date   
    var weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; 
    var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];
    $('#tracker_date').text(today.getDate() + ' ' + monthNames[today.getMonth()] + ' ' + today.getFullYear())
    
    //No support? Go in the corner and pout.
    if(!indexedDBOk) return;
 
    var openRequest = indexedDB.open("timex_db", 4);
 
    openRequest.onupgradeneeded = function(e) 
    {
        var thisDB = e.target.result;
        
        if(thisDB.objectStoreNames.contains("projects")) {
            thisDB.deleteObjectStore("projects");
        }
        // if(thisDB.objectStoreNames.contains("timex")) {
        //     thisDB.deleteObjectStore("timex");
        // }
 
        if(!thisDB.objectStoreNames.contains("timex")) {
            var objectStore = thisDB.createObjectStore("timex", {keyPath: "date"});
            objectStore.createIndex("date","date", {unique:true});
        }
    }
 
    openRequest.onsuccess = function(e) 
    {
        db = e.target.result;
        
        // populate listview
        readProjects();
    }
 
    openRequest.onerror = function(e) {
        //Do something for the error
    }
    
    $(document).off('click', '#listview li').on('click', '#listview li', function(){
        prev = activeProject;
        if (prev != null)
        {
            // var prevId = formatProjectName(prev)
            // var duration = $('#' + prevId + '-duration').text();
            var duration = (new Date - projects[prev]['startTime']) / 1000;
            // if startTime wasn't set for some reason ...
            if (isNaN(duration)) duration = 0;
            projects[prev]['duration'] = duration + projects[prev]['duration'];
            delete projects[prev]['startTime'];
            console.log('Deactivated ' + prev + ' with duration ' + duration);
        }
        activeProject = $(this).attr('data-name');
        var activeProjectId = formatProjectName(activeProject)
        projects[activeProject]['startTime'] = new Date
        currentTimeString = secondsToDuration(projects[activeProject]['duration']);
        $('#' + activeProjectId + '-duration').text(currentTimeString);
        $('#listview li').attr("data-theme", "a").removeClass("ui-btn-up-b").removeClass('ui-btn-hover-b').removeClass('active').addClass("ui-btn-up-c").addClass('ui-btn-hover-c');
        $(this).attr("data-theme", "b").removeClass("ui-btn-up-c").removeClass('ui-btn-hover-c').addClass("ui-btn-up-b").addClass('ui-btn-hover-b').addClass('active');
        console.log("Activated " + activeProject + " with start time " + projects[activeProject]['startTime']);
        $('#stopTrackerButton').button('enable');
        startTimer();
        storeTimex(new Date);
    }); 
    
    $(document).off('click', '#deleteProjectButton').on('click', '#deleteProjectButton', function(){
        if (activeProject == null) return;
        todelete = activeProject;
        var r = confirm("Delete project " + todelete + "?");
        if (r == true) 
        {
            console.log("Deleting project: " + todelete);
            deleteProject(todelete);
            stopTimer();
        }
    });
    
    $(document).off('click', '#addProjectButton').on('click', '#addProjectButton', function(){
        var projectName = $('#projectName').val()
        if (projectName == '') return;
        if (projectName in projects)
        {
            alert('Project "' + projectName + '" already exists.');
            return;
        }
        msg = createProjectListItem(projectName, 0);
        console.log("Adding project: " + projectName);
        $('#listview').append(msg);
        $('#listview').listview('refresh');
        addProject(projectName);
        $('#projectName').val('');
    });
    
    $(document).off('click', '#stopTrackerButton').on('click', '#stopTrackerButton', function(){
        if (activeProject != null)
        {
            var duration = (new Date - projects[activeProject]['startTime']) / 1000;
            projects[activeProject]['duration'] = duration + projects[activeProject]['duration'];
            delete projects[activeProject]['startTime'];
            console.log('Deactivated ' + activeProject + ' with duration ' + duration);
            // var duration = $('#' + activeProject + '-duration').text();
            // projects[activeProject]['duration'] = durationToSeconds(duration);
            // delete projects[activeProject]['startTime'];
            // console.log('Deactivated ' + activeProject + ' with duration ' + duration);
            $('#listview').find('li[data-name=\"' + activeProject + '\"]').attr("data-theme", "a").attr("data-theme", "a").removeClass('active');
            activeProject = null;
            storeTimex(new Date);
            $('#stopTrackerButton').button('disable');
            stopTimer()
        }
    });
    $(document).off('click', '#reportSubmitButton').on('click', '#reportSubmitButton', function(){
        var startDate = $('#startDate').val();
        var endDate = $('#endDate').val();
        if (startDate && endDate)
        {
            createReport(startDate, endDate);
        }
    });
    $(document).off('click', '#reportThisWeekButton').on('click', '#reportThisWeekButton', function(){
        date = new Date;
        var day = date.getDay();
        var diff = date.getDate() - day + (day == 0 ? -6:1); 
        firstDay = new Date(date.setDate(diff));
        startDate = formatDate(firstDay);
        diff = firstDay.getDate() + 6;
        lastDay = new Date(firstDay.setDate(diff));
        endDate = formatDate(lastDay);
        createReport(startDate, endDate);
    });
    $(document).off('click', '#reportLastWeekButton').on('click', '#reportLastWeekButton', function(){
        today = new Date;
        var date = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
        var day = date.getDay();
        var diff = date.getDate() - day + (day == 0 ? -6:1); 
        firstDay = new Date(date.setDate(diff));
        startDate = formatDate(firstDay);
        diff = firstDay.getDate() + 6;
        lastDay = new Date(firstDay.setDate(diff));
        endDate = formatDate(lastDay);
        createReport(startDate, endDate);
    });
    $(document).off('click', '#reportThisMonthButton').on('click', '#reportThisMonthButton', function(){
        date = new Date;
        firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        startDate = formatDate(firstDay);
        lastDay = new Date(date.getFullYear(), date.getMonth()+1, 0);
        endDate = formatDate(lastDay);
        createReport(startDate, endDate);
    });
    $(document).off('click', '#reportLastMonthButton').on('click', '#reportLastMonthButton', function(){
        date = new Date;
        firstDay = new Date(date.getFullYear(), date.getMonth()-1, 1);
        startDate = formatDate(firstDay);
        lastDay = new Date(date.getFullYear(), date.getMonth(), 0);
        endDate = formatDate(lastDay);
        createReport(startDate, endDate);
    });    
    
});

$(document).on('pagebeforeshow', '#tracker', function(){
    startTimer();
});

$(document).on('pagebeforehide', '#tracker', function(){       
    stopTimer();
});

var timerHandler = {
    timer1 : null
}

function startTimer()
{
    if (timerHandler.timer1 != null) return;
    setActiveDuration();
    // console.log('Start timer')
    timerHandler.timer1 = setInterval(function () {
        setActiveDuration()
    }, 1000);
}

function stopTimer()
{
    // console.log('Stop timer')
    clearInterval(timerHandler.timer1);
    timerHandler.timer1 = null;
}

function setActiveDuration()
{
    if (activeProject == null) return;
    var start = projects[activeProject]['startTime']
    var duration = projects[activeProject]['duration']
    var total_seconds = (new Date - start) / 1000;  
    if (isNaN(total_seconds) || isNaN(duration)) return; 
    var currentTimeString = secondsToDuration(total_seconds + duration)
    var activeProjectId = formatProjectName(activeProject)
    $('#' + activeProjectId + '-duration').text(currentTimeString);
}

function addProject(projectName) 
{
    // store in memory list
    project = {}
    project['name'] = projectName;
    project['duration'] = 0;
    projects[projectName] = project;
    console.log("Added project " + name);
    storeTimex(new Date)
}

function deleteProject(projectName) 
{
    delete projects[projectName]
    activeProject = null    
    console.log("Deleted project " + projectName);
    storeTimex(new Date, readProjects); 
}

function createReport(startDate, endDate)
{
    console.log('Creating report for ' + startDate + " to " + endDate);
    // lookup record
    var indexTransaction = db.transaction(["timex"], "readonly");
    var store = indexTransaction.objectStore("timex");
    var index = store.index("date");
    var range = IDBKeyRange.bound(startDate, endDate);
    report = {}
    index.openCursor(range).onsuccess = function(evt) {
         var cursor = evt.target.result;
         if (cursor) {
             console.log('Report: Found timex data for ' + cursor.value['date']);
             storedProjects = cursor.value['projects']
             for (var projectName in storedProjects)
             {
                 var duration = storedProjects[projectName]['duration'];
                 if (isNaN(duration)) duration = 0;
                 console.log('Project ' + projectName + ': ' + duration);
                 if (projectName in report)
                 {
                     report[projectName] += duration;
                 }
                 else
                 {
                     report[projectName] = duration;
                 }
             }
             if ('activeProject' in cursor.value)
             {
                 var date = new Date(cursor.value['date'])
                 var ap = cursor.value['activeProject']
                 var st = cursor.value['startTime']
                 report[ap] += getDurationOfActiveProject(date, st)
                 console.log('Active project ' + projectName + ': ' + report[ap]);
             }
             cursor.continue();
         }
     };  
     indexTransaction.oncomplete = function(evt)
     {
         $('#report_date_range').text(startDate + " to " + endDate);
         $('#reportListView').empty().append(createProjectListHeader());
         var total_duration = 0;
         var reportWithDurations = {}
         for (projectName in report)
         {
             var durationInSeconds = report[projectName]
             reportWithDurations[projectName] = secondsToDuration(durationInSeconds, false);
             total_duration += durationInSeconds;
             msg = createProjectListItem(projectName, durationInSeconds, false);
             $('#reportListView').append(msg);
             $('#reportListView').listview('refresh');
         }
         msg = createProjectListItem("Total", total_duration, false);
         $('#reportListView').append("<li data-role=\"list-divider\"></li>")
         $('#reportListView').append(msg);
         $('#reportListView').listview('refresh');
         
         var json = JSON.stringify(reportWithDurations);
         var blob = new Blob([json], {type: "application/json"});
         var url  = URL.createObjectURL(blob);
         document.getElementById('downloadReportAsJSON').href=url
         document.getElementById('downloadReportAsJSON').download = 'Timex_' + startDate + "_" + endDate + ".jsn";
     } 
}

function storeTimex(forDate, oncomplete)
{ 
    date = formatDate(forDate);

    // lookup record
    var indexTransaction = db.transaction(["timex"], "readonly");
    var store = indexTransaction.objectStore("timex");
    var index = store.index("date");
    var timexKey = null;
    var range = IDBKeyRange.only(date);
    var request = index.get(date);
    index.openCursor(range).onsuccess = function(evt) {
        var cursor = evt.target.result;
        if (cursor) {
            timexKey = cursor.primaryKey;
            cursor.continue();
        }
    };

    var timexRecord = {
        'date' : date,
        'projects' : {}
    }
    
    if (activeProject != null)
    {
        timexRecord['activeProject'] = activeProject;
        timexRecord['startTime'] = projects[activeProject]['startTime'];
    }
    for (var projectName in projects )
    {
        var project = {
        'name' : projectName,
        'duration' : projects[projectName]['duration']
        }
        timexRecord['projects'][projectName] = project;
    }

    indexTransaction.oncomplete = function(e){
    
        var transaction = db.transaction(["timex"], "readwrite");
        var store = transaction.objectStore("timex");

        var request;
        if (timexKey == null)
        {
            request = store.put(timexRecord);
        }
        else
        {
            try
            {
                // this works for iOS Safari but not for Chrome...
                // Safari creates a primary key in addition to the inline key
                request = store.put(timexRecord, timexKey);
            }
            catch(e)
            {
                // try again the proper way
                request = store.put(timexRecord);
            }
        }

        request.onerror = function(e) {
            console.log("Error writing timex data for " + date, e.target.error.name);
        }

        request.onsuccess = function(e) {
            console.log('Wrote timex data for ' + date)
        }
    
        if (oncomplete === undefined)
        {}
        else
        {
            transaction.oncomplete = function(evt) { oncomplete() };
        }
    }
}

function storeEditedTimex(date, editedProjects)
{ 
    var timexRecord = {
        'date' : date,
        'projects' : editedProjects
    }

    if (activeProject != null && formatDate(new Date) == date)
    {
        console.log('Setting active project ' + activeProject)
        timexRecord['activeProject'] = activeProject;
        timexRecord['startTime'] = new Date
    }
    
    for (var projectName in editedProjects )
    {
        var duration = timexRecord['projects'][projectName]['duration']
        if (isNaN(duration))
        {
            timexRecord['projects'][projectName]['duration'] = 0
        }
    }

    var transaction = db.transaction(["timex"], "readwrite");
    var store = transaction.objectStore("timex");
 
    var request = store.put(timexRecord);

    request.onerror = function(e) {
        console.log("Error: Failed to update timex for " + date, e.target.error.name);
        editReset('Failed to update record for ' + date + '.');
    }

    request.onsuccess = function(e) {
        editReset('Updated record for ' + date + '.');
        console.log('Wrote timex data for ' + date);
    }
    
    transaction.oncomplete = function(e) {
        if (date == formatDate(new Date))
        {
            // console.log('Data for today was edited - reloading timex table');
            readProjects();
        }
    }
        
}


$(document).off('click', '#exportDataButton').on('click', '#exportDataButton', function(){
    var transaction = db.transaction(["timex"], "readonly");
    var objectStore = transaction.objectStore("timex");

    var cursor = objectStore.openCursor();
    var data = {}
    
    cursor.onsuccess = function(e) {
        var res = e.target.result;
        if(res) {
            var projs = res.value['projects']
            var actproj = res.value['activeProject']
            var st = res.value['startTime']
            var date = res.value['date']
            var export_project = {}
            data[date] = export_project
            for (var p in projs)
            {
                var duration = projs[p]['duration'];
                if (isNaN(duration)) duration = 0;
                if (actproj == p)
                {
                    duration += getDurationOfActiveProject(new Date(date), st);
                }
                export_project[p] = secondsToDuration(duration);
            }
            res.continue();
        }
    }
    transaction.oncomplete = function(e)
    {
        var json = JSON.stringify(data, null, 4);
        // console.log(json);
        $('#databaseContents').text(json);
        document.getElementById('downloadDatabaseAsJSON').href="data:text/json," + JSON.stringify(data);
        document.getElementById('downloadDatabaseAsJSON').download = 'timex_db.jsn';
    };
});
$(document).off('click', '#importDataButton').on('click', '#importDataButton', function(){
    var files = document.getElementById('importDataFile').files;
    if (!files[0]) return;
    var reader = new FileReader();
    file = files[0];
    reader.onload = function(e)
    {
        jsonString = reader.result;
        console.log('Importing data')
        try {
            json = JSON.parse(jsonString)
        }
        catch (e) {
            console.log('Could not parse input data as JSON')
        }
        console.log('Parsed JSON successfully')
            
        for (var key in json) {
            date = new Date(key)
            if (!date || formatDate(date) != key) 
            {
                continue;
            }
            var imported = {}
            for (var p in json[key])
            {
                imported[p] = {}
                var value = json[key][p]
                if($.type(value) === "string")
                {
                    var dur = durationToSeconds(value);
                    if (isNaN(dur)) dur = 0;
                    imported[p]['duration'] = dur;
                    imported[p]['name'] = p;
                }
            }
            if (!$.isEmptyObject(imported))
            {
                storeEditedTimex(key, imported)
            }
        }
            
    }
    reader.readAsText(file);
});
$(document).off('click', '#clearDataButton').on('click', '#clearDataButton', function(){
    var r = confirm("Clear timex database?");
    if (r == true) 
    {    
        var transaction = db.transaction(["timex"], "readwrite");
        var objectStore = transaction.objectStore("timex");
        var request = objectStore.clear();
        request.onsuccess = function () {
            console.log("Cleared timex data successfully");
        };
        request.onerror = function () {
            alert('Failed to clear database.');
            console.log("Couldn't clear timex data");
        };
    }
});
