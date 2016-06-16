var activeProject = null;
var projects = {};
var db;

var editedProjects = {}
var editedDate = null;

var schedule = {};
var report515 = {}

var monthNames = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ];

//var webapp = '/PLANNING';

function pretty_time_string(num) 
{
    return ( num < 10 ? "0" : "" ) + num;
}

function formatDate(date)
{
    return date.getFullYear() + '-' + pretty_time_string(date.getMonth()+1) + '-' + pretty_time_string(date.getDate())
}

function durationToSeconds(s)
{
    var parts = s.split(":");
    var hours = parseInt(parts[0]);
    if (parts[0] == '--') hours = 0;
    var minutes = parseInt(parts[1]);
    if (parts[1] == '--') minutes = 0;
    var seconds = 0;
    if (parts.length >= 3)
    {
        seconds = parseInt(parts[2]);
    }   
    totalSeconds = hours*3600 + minutes*60 + seconds;
    return totalSeconds;
}

function secondsToHours(total_seconds)
{
    var hours = total_seconds/3600;
    return hours.toFixed(1);
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

function parseDate(input) 
{
  var parts = input.split('-');
  return new Date(parts[0], parts[1]-1, parts[2]);
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
        // if a new day started we create a new record
        if (date != lastDate)
        {
            // set all durations to zero
            for (var projectName in projects)
            {
                projects[projectName]['duration'] = 0;
            }
            activeProject = null;
            storeTimex(new Date)
        }
        var total_duration = 0
        // now set up the listview
        var index = 0;
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
            projects[projectName]['index'] = index;
            $('#listview').append(createProjectListItem(projectName, index, duration));
            if(typeof $('#listview').listview() !== "undefined")
                $('#listview').listview('refresh');
            index += 1;
        }

        if (date == lastDate)
        {
            var startTime = lastDateRecord['startTime'];
            var actProj = lastDateRecord['activeProject'];
            if (startTime !== undefined && actProj !== undefined)
            {
                activeProject = actProj;
                console.log("Active project is " + actProj + " with start time: " + startTime);
                projects[activeProject]['startTime'] = startTime;
                var activeProjectId = projects[activeProject]['index'];
                var total_seconds = (new Date - startTime) / 1000;
                total_duration += total_seconds;
                currentTimeString = secondsToDuration(total_seconds + projects[activeProject]['duration']);
                $('#duration-' + activeProjectId).text(currentTimeString);
                if(typeof $('#stopTrackerButton').button() !== "undefined")
                    $('#stopTrackerButton').button('enable');
                
                var listItems = $('#listview li');
                $('#listview').find('li[data-name=\"' + activeProject + '\"]').attr("data-theme", "a").attr("data-theme", "a").addClass('active');
            }
        }
        
        $('#totalTimeListview').empty().append(createProjectListItem("Total", "total", total_duration, false));
        if(typeof $('#totalTimeListview').listview() !== "undefined")
            $('#totalTimeListview').listview('refresh');
        
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

function createProjectListItem(projectName, index, durationInSeconds, showSeconds)
{
    var duration = secondsToDuration(durationInSeconds, showSeconds);
    msg =  "<li data-name=\"" + projectName + "\">"
    msg += "<a href=\"#\"><div class=\"ui-grid-a\">"
    msg += "<div class=\"ui-block-a\" style=\"width:60%\">"
    msg += "<div class=\"ui-bar\">" + projectName + "</div>"
    msg += "</div>"
    msg += "<div class=\"ui-block-b\" style=\"width:40%\">"
    msg += "<div class=\"ui-bar\""
    if (index != null && index !== undefined)
    {
        msg += "id=\"duration-" + index + "\"";
    }
    msg += ">" + duration + "</div>"
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

function editAddRow(projectName, index, durationInSeconds)
{
    var duration = secondsToDuration(durationInSeconds, false);
    msg =  "<li data-name=\"" + projectName + "\">"
    msg += "<div class=\"ui-grid-a\">"
    msg += "<div class=\"ui-block-a\" style=\"width:60%\">"
    msg += "<div class=\"ui-bar\">"
    msg += "<div class=\"ui-input-text ui-body-inherit ui-corner-all ui-shadow-inset\">"
    msg += "<input type=\"text\" value=\"" + projectName + "\" id=\"editProjectName-" + index + "\">"
    msg += "</div>"
    msg += "</div></div>"
    msg += "<div class=\"ui-block-b\" style=\"width:40%\">"
    msg += "<div class=\"ui-bar\">"
    msg += "<div class=\"ui-input-text ui-body-inherit ui-corner-all ui-shadow-inset\">"
    msg += "<input type=\"time\" value=\"" + duration + "\" id=\"editProjectDuration-" + index + "\">"
    msg += "</div></div>"
    msg += "</div></li>"
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
    var listIndex = 0;
    index.openCursor(range).onsuccess = function(evt) {
        var cursor = evt.target.result;
        if (cursor) {
            actProj = cursor.value['activeProject'];
            editedProjects = cursor.value['projects'];
            for (var projectName in editedProjects)
            {
                editedProjects[projectName]['index'] = listIndex;
                var durationInSeconds = editedProjects[projectName]['duration']
                if (isNaN(durationInSeconds)) durationInSeconds = 0;
                if (projectName == actProj)
                {
                    st = cursor.value['startTime']
                    durationInSeconds += getDurationOfActiveProject(new Date(date), st)
                }
                msg = editAddRow(projectName, listIndex, durationInSeconds);
                $('#editListView').append(msg);
                $('#editListView').listview('refresh');
                listIndex += 1;
            }
            cursor.continue();
        }
        $('#editAddProjectButton').button('enable');
        $('#editSaveButton').button('enable');
        $('#editCancelButton').button('enable');
        $('#editAddProjectText').textinput('enable');
    };  
}

function parseSchedule(data)
{
    var result = {}
    if (!data['success'] || !data['valid']) return;
    var jsonSchedule = data['data']
    var totalRow = '';
    var columns;
    var total;
    $.each( jsonSchedule, function( key, projSched ) {
        if (key == "Task")
        {
            columns = projSched;
        }
    });
    $.each( jsonSchedule, function( key, projSched ) {
        var projectName = key;
        var isHeader = (key == "Task");
        var isFooter = (key == "Total");
        if (isHeader)
        {
            // columns = projSched;
        }
        else if (isFooter)
        {
            
        }
        else 
        {
            projSchedule = {};
            result[projectName] = projSchedule;
            $.each(projSched, function(index, val) {
                projSchedule[columns[index]] = val;
            });
        }
    });
    return result;
}

function fetchScheduleForReport(startDate, endDate, calendarField, block)
{    
    var start = parseDate(startDate);
    $.getJSON(webapp + "/RestServlet/Balance/:::Person-" + start.getTime() + "-" + calendarField + "-" + block + "-1")
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.log( "Error fetching schedule : " + textStatus + " " + errorThrown );
            createReport(startDate, endDate, false);
          })
        .done(function(data){
            schedule = parseSchedule(data);
            createReport(startDate, endDate, true);
    });
}

function update515Table(report, schedule)
{
    report515 = {};
    var total_duration = 0;
    var reportWithDurations = {};
    var msg = '<tr><th>Project</th>';
    msg += '<th style="text-align:right;">Minimum</th>';
    msg += '<th style="text-align:right;">Suggested</th>';
    msg += '<th style="text-align:right;">Reported</th>';
    msg += '<th style="text-align:right;">Time</th></tr>';
    $('#update515Table thead').empty().append(msg);
    if(typeof $('#update515Table').table() !== "undefined")
        $('#update515Table').table('refresh');
    $('#update515Table tbody').empty();
    var suggestedTotal = 0;
    var reportedTotal = 0;
    var i = 0;
    for (projectName in schedule)
    {
        if (!(projectName in report))
        {
            report[projectName] = '--';
        }
    }
    for (projectName in report)
    {
        var durationInSeconds = report[projectName];
        if (!(isNaN(durationInSeconds)))
        {
            reportWithDurations[projectName] = secondsToDuration(durationInSeconds, false);
            total_duration += durationInSeconds;
        }
        msg = "<tr><td>" + projectName + '</td>';
        var minimum = '--';
        var suggested = '--';
        var reported = '--';
        if (projectName in schedule)
        {
            var projSched = schedule[projectName];
            var minimum = parseInt(projSched['Minimum']);
            if (isNaN(minimum)) minimum = 0;
            var suggested = parseInt(projSched['Suggested']);
            if (isNaN(suggested)) suggested = 0;
            suggestedTotal += suggested;
            if ('Reported' in projSched)
            {
                reported = projSched['Reported'];
                reportedTotal += reported;
                reported = reported.toFixed(1);
            }
        }
        msg += '<td style="text-align:right;">' + minimum + '</td>';
        msg += '<td style="text-align:right;">' + suggested + '</td>';
        msg += '<td style="text-align:right;">' + reported + '</td>';
        msg += '<td style="text-align:right;">';
        msg += '<input class="task515input" style="text-align:right;" type="text" id="update515Project' + i + '" value="';
        if (isNaN(durationInSeconds)) {
            msg += 'None';
        }
        else {
            msg += secondsToHours(durationInSeconds);
        }
        msg += '"></input></td>';
        msg += '</tr>';
        if (projectName != "Leave") report515[projectName] = i;
        i++;
        $('#update515Table tbody').append(msg);
        $('#update515Table').table('refresh');
    }
    msg = '<tr><th>Total</th><td></td>';
    msg += '<td style="text-align:right;">' + suggestedTotal + '</td>';
    msg += '<td style="text-align:right;">' + reportedTotal.toFixed(1) + '</td>';
    msg += '<th id="task515total" style="text-align:right;">' + secondsToHours(total_duration) + '</th>';
    msg += '</tr>';
    $('#update515Table tbody').append(msg);
    $('#update515Table').table('refresh');
    
}

function fetchScheduleFor515()
{
    var date = $('#update515MonthHeader').attr('data-value');
    var startOfMonth;
    if (date !== undefined)
    {
         startOfMonth = parseDate(date);
    }
    else
    {
        date = new Date;
        startOfMonth = new Date(date.getFullYear(), date.getMonth()-1, 1);
        $('#update515MonthHeader').text(monthNames[startOfMonth.getMonth()] + ' ' + startOfMonth.getFullYear());
        $('#update515MonthHeader').attr('data-value', formatDate(startOfMonth));
    }
    console.log('Fetching schedule for ' + $('#update515MonthHeader').text());
    $.getJSON(webapp + "/Report515Servlet/" + startOfMonth.getTime())
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.log( "Error fetching schedule : " + textStatus + " " + errorThrown );
          })
        .done(function(data){
            // console.log("Schedule: " + data);
            var sched515 = parseSchedule(data);
            var startDate = formatDate(startOfMonth);
            var endOfMonth = new Date(startOfMonth.getFullYear(), startOfMonth.getMonth()+1, 0);
            var endDate = formatDate(endOfMonth);
            retrieveReport(startDate, endDate, update515Table, sched515);   
     });
}

function viewSchedule()
{
    var date = new Date;
    var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
    $('#scheduleTable tbody').empty();
    $('#scheduleMonthHeader').text(monthNames[firstDay.getMonth()] + ' ' + firstDay.getFullYear());
    schedule = {}
    $.getJSON(webapp + "/RestServlet/Balance/:::Person-" + firstDay.getTime() + "-2-1-1", 
        function( data ) {
            if (!data['success'] || !data['valid']) return;
            var jsonSchedule = data['data']
            var totalRow = '';
            $('#scheduleTable thead').empty();
            $('#scheduleTable tbody').empty();
            $('#importProjectsButton').button('enable');
            var columns;
            $.each( jsonSchedule, function( key, projSched ) {
                var isHeader = (key == "Task");
                var rowMsg;
                if (isHeader)
                {
                    columns = projSched;
                    rowMsg = "<tr data-priority=\"index\"><th>Task</th>";
                    $.each(projSched, function(index, val) {
                        rowMsg += '<th>' + val + '</th>'
                    });
                    rowMsg += '</tr>'
                    $('#scheduleTable thead').append(rowMsg);
                    $('#scheduleTable').table('refresh');
                }
            });
            $.each( jsonSchedule, function( key, projSched ) {
                var projectName = key;
                var isHeader = (key == "Task");
                var isFooter = (key == "Total");
                var rowMsg;
                if (isHeader)
                {
                    // already done
                }
                else if (isFooter)
                {
                    rowMsg = '<tr><th>' + projectName + '</th>'
                    $.each(projSched, function(index, val) {
                        rowMsg += '<th>' + val + '</th>'
                    });
                    rowMsg += '</tr>'
                    totalRow = rowMsg;
                }
                else
                {
                    projSchedule = {};
                    schedule[projectName] = projSchedule;
                    rowMsg = '<tr><td>' + projectName + '</td>'
                    $.each(projSched, function(index, val) {
                        projSchedule[columns[index]] = val;
                        rowMsg += '<td>' + val + '</td>'
                    });
                    rowMsg += '</tr>'
                    $('#scheduleTable tbody').append(rowMsg);
                    $('#scheduleTable').table('refresh');
                }
            });
            $('#scheduleTable tbody').append(totalRow);
            $('#scheduleTable').table('refresh');
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
            console.log( "Error fetching schedule : " + textStatus + " " + errorThrown );
            $('#scheduleTable tbody').empty();
            $('#scheduleTable thead').empty();
            $('#scheduleTable thead').append('<tr><th>Failed to load schedule.</th></tr>');
            $('#importProjectsButton').button('disable');
          });
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
            var toRemove = [];
            for (var projectName in editedProjects)
            {
                var projectId = editedProjects[projectName]['index'];
                var durationStr = $("#editProjectDuration-" + projectId).val();
                if (!durationStr) {
                    toRemove.push(projectName);
                    continue;
                }
                var duration = durationToSeconds(durationStr);
                if (isNaN(duration))
                {
                    alert('Could not parse time ' + durationStr + ' for project ' + projectName
                          + '.\nPlease use the format "hh:mm".');
                    return;
                }
                editedProjects[projectName]['duration'] = duration;
            }
            toRemove.map(function(projectName) {
                delete editedProjects[projectName];
            });
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
        newproject['index'] = Object.keys(editedProjects).length
        editedProjects[projectName] = newproject
        msg = editAddRow(projectName, newproject['index'], 0);
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
    $(document).off('click', '#editAddCurrentButton').on('click', '#editAddCurrentButton', function(){
        var start = new Date($('#editDate').val());
        // get the schedule for today
        $.getJSON(webapp + "/RestServlet/Balance/:::Person-" + start.getTime() + "-5-1-1")
            .fail(function(jqXHR, textStatus, errorThrown) {
                console.log( "Error fetching schedule: " + textStatus + " " + errorThrown );
                // if we can't fetch the schedule we add the current projects
                addProjectsToEdited(projects);
            })
            .done(function(data){
                var scheduledProjects = parseSchedule(data);
                addProjectsToEdited(scheduledProjects);
            });
        
    });
    $(document).off('click', '#editDeleteAllButton').on('click', '#editDeleteAllButton', function(){
        $('#editListView').empty().append(createProjectListHeader());
        $('#editListView').listview('refresh');
        $('#editMessage').empty().append("<li data-role=\"list-divider\"><h2>Cleared project list. To undo press cancel.<h2></li>");
        $('#editMessage').listview('refresh');
        editedProjects = {}
    });
});

function addProjectsToEdited(projs)
{
    for (var projectName in projs)
    {
        if (!(projectName in editedProjects))
        {
            // console.log('adding ' + projectName);
            var newproject = {};
            newproject['name'] = projectName;
            newproject['duration'] = 0;
            newproject['index'] = Object.keys(editedProjects).length;
            editedProjects[projectName] = newproject;
            var msg = editAddRow(projectName, newproject['index'], 0);
            $('#editListView').append(msg)
            $('#editListView').listview('refresh');
        }
    }
}

$(document).off('pagebeforeshow', '#update515').on('pagebeforeshow', '#update515', function(){
    
    $(document).off('input', '.task515input').on('input', '.task515input', function() {
        var newvalue = $(this).val();
        var total = 0;
        $('.task515input').each(function(){
            var hours = parseFloat($(this).val());
            if (!(isNaN(hours))) total += hours;
        });
        $('#task515total').text(total.toFixed(1));
    });
    $(document).off('click', '#update515PrevMonthButton').on('click', '#update515PrevMonthButton', function(){
        var date = $('#update515MonthHeader').attr('data-value');
        var startOfMonth = parseDate(date);
        startOfMonth.setMonth(startOfMonth.getMonth()-1)
        $('#update515MonthHeader').text(monthNames[startOfMonth.getMonth()] + ' ' + startOfMonth.getFullYear());
        $('#update515MonthHeader').attr('data-value', formatDate(startOfMonth));
        fetchScheduleFor515();
    });
    $(document).off('click', '#update515NextMonthButton').on('click', '#update515NextMonthButton', function(){
        var date = $('#update515MonthHeader').attr('data-value');
        var startOfMonth = parseDate(date);
        startOfMonth.setMonth(startOfMonth.getMonth()+1)
        $('#update515MonthHeader').text(monthNames[startOfMonth.getMonth()] + ' ' + startOfMonth.getFullYear());
        $('#update515MonthHeader').attr('data-value', formatDate(startOfMonth));
        fetchScheduleFor515();
    });
    $(document).off('click', '#post515Update').on('click', '#post515Update', function(){
        var date = $('#update515MonthHeader').attr('data-value');
        var startOfMonth = parseDate(date);
        var data = {};
        var tasks = {};
        data['tasks'] = tasks;
        for (projectName in report515)
        {
            var hours = parseFloat($('#update515Project' + report515[projectName]).val());
            if (!(isNaN(hours))) {
                tasks[projectName] = hours.toFixed(1);
            }
        }
        console.log('Updating 515 for ' + date);
        var msg = '';
        for (var projectName in tasks)
        {
            msg += projectName + ': ' + tasks[projectName] + '\n';
        }
        var r = confirm("Update 515?\n\n" + msg);
        if (r == true) 
        {
            $.ajax({
                type: 'POST',
                url: webapp + "/Report515Servlet/" + startOfMonth.getTime(),
                data: JSON.stringify(data),
                success: function(data) { 
                    var schedule = data['Reported'];
                    var failed = data['Failed'];
                    if (!$.isEmptyObject(failed))
                    {
                        var msg = '';
                        for (var projectName in failed)
                        {
                            msg += '- ' + projectName + '\n';
                        }
                        alert("Updates failed for tasks:\n" + msg);
                    }
                    fetchScheduleFor515();
                },
                contentType: "application/json",
                dataType: 'json'
            });
        }
    });
    
    fetchScheduleFor515();
});

$(document).off('pagebeforeshow', '#editProjects').on('pagebeforeshow', '#editProjects', function(){
    if (db !== undefined) loadEditDate();
});
$(document).off('pagecreate', '#editProjects').on('pagecreate', '#editProjects', function(){
    createDatePicker('#editDate');
});

$(document).bind('pagecreate', '#report', function(evt) {
    createDatePicker('#startDate');
    createDatePicker('#endDate')
});

$(document).off('pagebeforeshow', '#schedule').on('pagebeforeshow', '#schedule', function(){
    viewSchedule();
});

$(document).off('pagebeforeshow', '#database').on('pagebeforeshow', '#database', function(){
    $.get(webapp + "/StashServlet/timestamp", function(timestamp){
        console.log("Latest backup: " + timestamp);
        $('#latestBackupTimestamp').text('Latest Backup: ' + timestamp);
    })
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log( "Error retrieving backup timestamp: " + textStatus + " " + errorThrown );
    });
});


// $(document).off('panelbeforeopen', '#addProject').on('panelbeforeopen', '#addProject', function(){
//     $('#selectAddAsSubproject').empty();
//     $('#selectAddAsSubproject').append("<option value=\"None\">None</option>");
//     for (projectName in projects)
//     {
//         var option = "<option value=\"" + projects[projectName]['index'] + "\">" + projectName + "</option>";
//         $('#selectAddAsSubproject').append(option);
//     }
//     $('#selectAddAsSubproject').selectmenu('refresh');
// });

$(document).bind('pagecreate', '#tracker', function(evt) 
{
    var today = new Date   
    var weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]; 
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
        if ($(this).attr('data-name') === undefined)
        {
            // list header or some other undefined line in the project list
            // we're ignoring this
            return;
        }
        prev = activeProject;
        if (prev != null)
        {
            if (!(prev in projects))
            {
                // something is very wrong
                console.log('Cannot find active project ' + prev + ' for deactivation!');
                return;
            }
            var duration = (new Date - projects[prev]['startTime']) / 1000;
            // if startTime wasn't set for some reason ...
            if (isNaN(duration)) duration = 0;
            projects[prev]['duration'] = duration + projects[prev]['duration'];
            delete projects[prev]['startTime'];
            console.log('Deactivated ' + prev + ' with duration ' + duration);
        }
        activeProject = $(this).attr('data-name');
        if (!(activeProject in projects))
        {
            // something is very wrong...
            console.log('Cannot find active project ' + activeProject + ' in project list!');
            return;
        }
        projects[activeProject]['startTime'] = new Date;
        storeTimex(new Date);
        var activeProjectId = projects[activeProject]['index'];
        currentTimeString = secondsToDuration(projects[activeProject]['duration']);
        $('#duration-' + activeProjectId).text(currentTimeString);
        $('#listview li').attr("data-theme", "a").removeClass("ui-btn-up-b").removeClass('ui-btn-hover-b').removeClass('active').addClass("ui-btn-up-c").addClass('ui-btn-hover-c');
        $(this).attr("data-theme", "b").removeClass("ui-btn-up-c").removeClass('ui-btn-hover-c').addClass("ui-btn-up-b").addClass('ui-btn-hover-b').addClass('active');
        console.log("Activated " + activeProject + " with start time " + projects[activeProject]['startTime']);
        $('#stopTrackerButton').button('enable');
        startTimer();
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
    
    $(document).off('click', '#importProjectsButton').on('click', '#importProjectsButton', function(){
        var importedProjects = [];
        $.each(schedule, function(projectName, projectSchedule){
            if (!(projectName in projects)) {
                importedProjects.push(projectName);
            }
        });
        if (!$.isEmptyObject(importedProjects)) {
            addProjects(importedProjects);
        }
        $.mobile.pageContainer.pagecontainer("change", "#tracker", { 'transition' : 'slide', 'reverse' : true });
    });    
    
    $(document).off('click', '#addProjectButton').on('click', '#addProjectButton', function(){
        var projectName = $('#projectName').val()
        if (projectName == '') return;
        if (projectName in projects)
        {
            alert('Project "' + projectName + '" already exists.');
            return;
        }
        if (projectName.indexOf('"') >= 0)
        {
            alert('Project name contains invalid characters: "');
            return;
        }
        // var superproject = $('#selectAddAsSubproject').val();
        // var msg = "Adding project: " + projectName;
        // if (superproject != "None")
        // {
        //     var sup = "None";
        //     for (p in projects)
        //     {
        //         if (projects[p]['index'] == superproject)
        //         {
        //             sup = p;
        //             break;
        //         }
        //     }
        //     msg += " as subproject of " + sup;
        // }
        // console.log(msg);
        addProject(projectName);
        $('#projectName').val('');
        // msg = createProjectListItem(projectName, projects[projectName]['index'], 0);
        // $('#listview').append(msg);
        // $('#listview').listview('refresh');
        // $('#selectAddAsSubproject').val('None').selectmenu('refresh');
    });
    
    $(document).off('click', '#stopTrackerButton').on('click', '#stopTrackerButton', function(){
        if (activeProject != null)
        {
            var duration = (new Date - projects[activeProject]['startTime']) / 1000;
            projects[activeProject]['duration'] = duration + projects[activeProject]['duration'];
            delete projects[activeProject]['startTime'];
            console.log('Deactivated ' + activeProject + ' with duration ' + duration);
            $('#listview').find('li[data-name=\"' + activeProject + '\"]').attr("data-theme", "a").attr("data-theme", "a").removeClass('active');
            activeProject = null;
            storeTimex(new Date);
            $('#stopTrackerButton').button('disable');
            stopTimer()
        }
    });
    
    function createReportWithSchedule(startDate, endDate, calendarField, block)
    {
        if (!startDate || !endDate) return;
        if ($('#checkbox-fetchSchedule').is(':checked'))
        {
            console.log('Getting schedule from server');
            fetchScheduleForReport(startDate, endDate, calendarField, block);
            // $.mobile.changePage("#reportResult");
        }
        else
        {
            createReport(startDate, endDate, false);
            // $.mobile.changePage("#reportResult");
        }
    }
    $(document).off('click', '#reportSubmitButton').on('click', '#reportSubmitButton', function(){
        var startDate = $('#startDate').val();
        var endDate = $('#endDate').val();
        var start = parseDate(startDate);
        var end = parseDate(endDate);
        var diffDays = Math.round((end - start) / (24 * 60 * 60 * 1000)) 
        createReportWithSchedule(startDate, endDate, 5, diffDays);
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
        createReportWithSchedule(startDate, endDate, 5, 7);
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
        createReportWithSchedule(startDate, endDate, 5, 7);
    });
    $(document).off('click', '#reportThisMonthButton').on('click', '#reportThisMonthButton', function(){
        date = new Date;
        firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
        startDate = formatDate(firstDay);
        lastDay = new Date(date.getFullYear(), date.getMonth()+1, 0);
        endDate = formatDate(lastDay);
        createReportWithSchedule(startDate, endDate, 2, 1);
    });
    $(document).off('click', '#reportLastMonthButton').on('click', '#reportLastMonthButton', function(){
        date = new Date;
        firstDay = new Date(date.getFullYear(), date.getMonth()-1, 1);
        startDate = formatDate(firstDay);
        lastDay = new Date(date.getFullYear(), date.getMonth(), 0);
        endDate = formatDate(lastDay);
        createReportWithSchedule(startDate, endDate, 2, 1);
    });    
    
});

$(document).on('pagebeforeshow', '#tracker', function(){
    startTimer();
});

$(document).on('pagebeforehide', '#tracker', function(){       
    stopTimer();
});


$(document).on('change', "#reportDisplayStyle :radio", function() {
    var report = JSON.parse($('#reportDurations').val());
    updateReportTable(
        report['report'], 
        report['showSchedule']);
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

function getTotalDuration()
{
    var total_duration = 0;
    for (projectName in projects)
    {
        total_duration += projects[projectName]['duration'];
    }
    return total_duration;
}

function setActiveDuration()
{
    if (activeProject == null) return;
    var start = projects[activeProject]['startTime']
    if (formatDate(start) != formatDate(new Date))
    {
        // if a new day then set the start to midnight
        start = new Date;
        start.setHours(0,0,0,0);
    }
    var duration = projects[activeProject]['duration']
    var total_seconds = (new Date - start) / 1000;  
    if (isNaN(total_seconds) || isNaN(duration)) return; 
    var currentTimeString = secondsToDuration(total_seconds + duration)
    var activeProjectId = projects[activeProject]['index'];
    $('#duration-' + activeProjectId).text(currentTimeString);
    var totalTimeString = secondsToDuration(getTotalDuration() + total_seconds, false);
    $('#duration-total').text(totalTimeString);
}

function addProjects(projectNames) 
{
    for (var i=0; i<projectNames.length; i++)
    {
        var projectName = projectNames[i];
        project = {}
        project['name'] = projectName;
        project['duration'] = 0;
        project['index'] = Object.keys(projects).length;
        projects[projectName] = project;
        console.log("Added project " + projectName);
        if (i == projectNames.length-1)
        {
            storeTimex(new Date, readProjects);
        }
        else
        {
            storeTimex(new Date);
        }
    }
}


function addProject(projectName) 
{
    // store in memory list
    project = {}
    project['name'] = projectName;
    project['duration'] = 0;
    project['index'] = Object.keys(projects).length;
    projects[projectName] = project;
    console.log("Added project " + name);
    storeTimex(new Date, readProjects)
}

function deleteProject(projectName) 
{
    delete projects[projectName]
    activeProject = null    
    console.log("Deleted project " + projectName);
    storeTimex(new Date, readProjects); 
}

function createReport(startDate, endDate, showSchedule)
{
    if (showSchedule === undefined) showSchedule = false;
    console.log('Creating report for ' + startDate + " to " + endDate);
    retrieveReport(startDate, endDate, updateReportTable, showSchedule);
}

function updateReportTable(report, showSchedule)
{
    // console.log('Creating report for ' + startDate + " to " + endDate);
    $('#report_date_range').text(startDate + ' to ' + endDate)

    // Store project durations for later use if the display style changes
    $('#reportDurations').val(
        JSON.stringify({'report': report, 'showSchedule': showSchedule}))

    var displayMinutes = ($("#reportDisplayStyle :radio:checked").val() == 'minutes');

    var total_duration = 0;
    var reportWithDurations = {}
    
    if (showSchedule)
    {
        widtha = "40%";
        widthb = "20%";
        widthc = "20%";
        widthd = "20%";
    }
    else
    {
        widtha = "70%";
        widthb = "30%";
    }
    msg = "<li class=\"ui-li-static ui-body-inherit ui-first-child\">";
    if (showSchedule)
    {
        msg += "<div class=\"ui-grid-c\">"
    }
    else
    {
        msg += "<div class=\"ui-grid-a\">"
    }
    msg += "<div class=\"ui-block-a\" style=\"width:" + widtha + "\">"
        + "<div class=\"ui-bar\"><h3>Project</h3></div>"
        + "</div>"
        + "<div class=\"ui-block-b\" style=\"width:" + widthb + "\">"
        + "<div class=\"ui-bar\"><h3>Time</h3></div></div>"
    if (showSchedule)
    {
        msg += "<div class=\"ui-block-b\" style=\"width:" + widthc + "\">"
            + "<div class=\"ui-bar\"><h3>Minimum</h3></div></div>";
        msg += "<div class=\"ui-block-b\" style=\"width:" + widthd + "\">"
            + "<div class=\"ui-bar\"><h3>Suggested</h3></div></div>";
    }
    msg += "</div></li>";
    $('#reportListView').empty().append(msg);
    var suggestedTotal = 0;
    for (var projectName in report)
    {
        var durationInSeconds = report[projectName];
        if (isNaN(durationInSeconds)) durationInSeconds = 0;
        var projectDuration;
        if (displayMinutes) {
            projectDuration = secondsToDuration(durationInSeconds, false);
        }
        else {
            projectDuration = secondsToHours(durationInSeconds).toString();
        }
        reportWithDurations[projectName] = projectDuration;
        total_duration += durationInSeconds;

        msg =  "<li>"
        if (showSchedule)
        {
            msg += "<a href=\"#\"><div class=\"ui-grid-c\">";
        }
        else
        {
            msg += "<a href=\"#\"><div class=\"ui-grid-a\">";
        }
        msg += "<div class=\"ui-block-a\" style=\"width:" + widtha + "\">"
        msg += "<div class=\"ui-bar\">" + projectName + "</div>"
        msg += "</div>"
        msg += "<div class=\"ui-block-b\" style=\"width:" + widthb + "\">"
        msg += "<div class=\"ui-bar\""
        msg += ">" + projectDuration + "</div></div>"
        if (showSchedule)
        {
            var minimum = '--:--';
            var suggested = '--:--';
            if (!displayMinutes) {
                minimum = '---';
                suggested = '---';
            }
            if (projectName in schedule)
            {
                projSched = schedule[projectName];
                if (('Minimum') in projSched) 
                {
                    var mintime = parseInt(schedule[projectName]['Minimum']);
                    if (isNaN(mintime)) mintime = 0;
                    if (displayMinutes) {
                        minimum = pretty_time_string(mintime) + ':00';
                    }
                    else {
                        minimum = mintime + '.0';
                    }
                }
                if (('Suggested') in projSched) 
                {
                    var sugtime = parseInt(schedule[projectName]['Suggested']);
                    if (isNaN(sugtime)) sugtime = 0;
                    suggestedTotal += sugtime;
                    if (displayMinutes) {
                        suggested = pretty_time_string(sugtime) + ':00';
                    }
                    else {
                        suggested = sugtime + '.0';
                    }
                }
            }
            msg += "<div class=\"ui-block-c\" style=\"width:" + widthc + "\">"
            msg += "<div class=\"ui-bar\""
            msg += ">" + minimum + "</div></div>"
            msg += "<div class=\"ui-block-d\" style=\"width:" + widthd + "\">"
            msg += "<div class=\"ui-bar\""
            msg += ">" + suggested + "</div></div>"
        }
        
        msg += "</div></a></li>";
        $('#reportListView').append(msg);
        $('#reportListView').listview('refresh');
    }
    
    var durationStr;
    if (displayMinutes) {
        durationStr = secondsToDuration(total_duration, false);
    }
    else {
        durationStr = secondsToHours(total_duration).toString();
    }
    msg =  "<li>"
    if (showSchedule)
    {
        msg += "<a href=\"#\"><div class=\"ui-grid-c\">";
    }
    else
    {
        msg += "<a href=\"#\"><div class=\"ui-grid-a\">";
    }
    msg += "<div class=\"ui-block-a\" style=\"width:" + widtha + "\">"
    msg += "<div class=\"ui-bar\">Total</div>"
    msg += "</div>"
    msg += "<div class=\"ui-block-b\" style=\"width:" + widthb + "\">"
    msg += "<div class=\"ui-bar\""
    msg += ">" + durationStr + "</div></div>"
    if (showSchedule)
    {
        msg += "<div class=\"ui-block-c\" style=\"width:" + widthc + "\">"
        msg += "<div class=\"ui-bar\""
        msg += "></div></div>"
        msg += "<div class=\"ui-block-d\" style=\"width:" + widthd + "\">"
        msg += "<div class=\"ui-bar\""
        if (displayMinutes) {
            msg += ">" + pretty_time_string(suggestedTotal) + ":00</div></div>"
        }
        else {
            msg += ">" + suggestedTotal + ".0</div></div>"
        }
    }
    $('#reportTotalListView').empty().append(msg);
    $('#reportTotalListView').listview('refresh');
    
    // write JSON 
    var reportWithTotal = {'Tasks': reportWithDurations, 'Total': durationStr}
    var json = JSON.stringify(reportWithTotal, null, 4);
    $('#reportJSON').text(json);
    var blob = new Blob([json], {type: "application/json"});
    var url  = URL.createObjectURL(blob);
    document.getElementById('downloadReportAsJSON').href=url
    document.getElementById('downloadReportAsJSON').download = 'Timex_' + startDate + "_" + endDate + ".jsn";
    
    // write formatted text
    reportAsText(reportWithDurations, durationStr);
}

function reportAsText(reportWithDurations, total_duration)
{
    var maxPN = "Total".length;
    var maxD = total_duration.length;
    for (var projectName in reportWithDurations)
    {
        maxPN = Math.max(maxPN, projectName.length);
        maxD = Math.max(maxD, reportWithDurations[projectName].length)
    }
    var textLength = maxPN + maxD + 10;
    var text = padString('Task', 'Hours', textLength) + '\n';
    var hline = '';
    for (var i=0; i<textLength; i++) hline += '-';
    hline += '\n';
    text += hline;
    for (var projectName in reportWithDurations)
    {
        text += padString(projectName, reportWithDurations[projectName], textLength) + '\n';
    }
    text += hline
    text += padString('Total', total_duration, textLength) + '\n';
    $('#reportText').text(text);
    var blob = new Blob([text], {type: "text/plain"});
    var url  = URL.createObjectURL(blob);
    document.getElementById('downloadReportAsText').href=url
    document.getElementById('downloadReportAsText').download = 'Timex_' + startDate + "_" + endDate + ".txt";
}

function padString(start, end, totalLength)
{
    var msg = start;
    var padding = totalLength - start.length - end.length;
    for (var i=0; i<padding; i++)
    {
        msg += ' ';
    }
    msg += end;
    return msg;
}

function retrieveReport(startDate, endDate, oncomplete)
{
    // lookup record
    var indexTransaction = db.transaction(["timex"], "readonly");
    var store = indexTransaction.objectStore("timex");
    var index = store.index("date");
    var range = IDBKeyRange.bound(startDate, endDate);
    report = {}
    index.openCursor(range).onsuccess = function(evt) {
         var cursor = evt.target.result;
         if (cursor) {
             // console.log('Report: Found timex data for ' + cursor.value['date']);
             storedProjects = cursor.value['projects']
             for (var projectName in storedProjects)
             {
                 var duration = storedProjects[projectName]['duration'];
                 if (isNaN(duration)) duration = 0;
                 // console.log('Project ' + projectName + ': ' + duration);
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
                 // console.log('Active project ' + projectName + ': ' + report[ap]);
             }
             cursor.continue();
         }
     };
     var arg = arguments[3];
     indexTransaction.oncomplete = function(evt)
     {
         oncomplete(report, arg);
     } 
}

function storeTimex(forDate, oncomplete)
{     
    var date = formatDate(forDate);
    
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
    

    //lookup record
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
        'projects' : {}
    }
    
    for (var projectName in editedProjects )
    {
        var duration = editedProjects[projectName]['duration'];
        if (isNaN(duration)) duration = 0;
        var project = {
        'name' : projectName,
        'duration' : duration
        }
        timexRecord['projects'][projectName] = project;
    }
    

    if (formatDate(new Date) == date)
    {
        if (activeProject in editedProjects)
        {
            console.log('Setting active project ' + activeProject)
            timexRecord['activeProject'] = activeProject;
            timexRecord['startTime'] = new Date
        }
    }

    //lookup record
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
                activeProject = null;
                readProjects();
            }
        }
    }
}

function readAllData(oncomplete_fn)
{
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
        oncomplete_fn(data);
    };
    
}

function writeToBackup(data)
{
    var timestamp = new Date;
    data['Timestamp'] = timestamp.toISOString();
    $.post(webapp + "/StashServlet?timestamp=" + timestamp.getTime(), JSON.stringify(data))
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log( "Error storing backup: " + textStatus + " " + errorThrown );
        $('#latestBackupTimestamp').text('Failed to store backup. Please check with the service provider.');
    })
    .done(function(response){
        console.log('Successfully stored backup with timestamp ' + response);
        $('#latestBackupTimestamp').text('Latest Backup: ' + response)
    });
}

function importFromBackup()
{
    $.getJSON(webapp + "/StashServlet")
    .fail(function(jqXHR, textStatus, errorThrown) {
        console.log( "Error retrieving backup: " + textStatus + " " + errorThrown );
        alert('Failed to retrieve backup. Please check with the service provider.');
      })
    .done(function(data){
        var timestamp = data['Timestamp'];
        console.log("Retrieved backup with timestamp " + timestamp);
        delete data['Timestamp'];
        var numRecords = importData(data);
        console.log('Imported ' + numRecords + " records into the database.");
        $('#latestBackupTimestamp').text('Imported ' + numRecords + " day(s) into the database. Latest Backup: " + timestamp);
    });
}

function importData(data)
{
    var numRecords = 0;
    for (var key in data) {
        date = new Date(key)
        if (!date || formatDate(date) != key) 
        {
            continue;
        }
        var imported = {}
        for (var p in data[key])
        {
            imported[p] = {}
            var value = data[key][p]
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
            numRecords++;
        }
    }
    return numRecords;
}

function createJSONExport(data)
{
    var json = JSON.stringify(data, null, 4);
    // console.log(json);
    $('#databaseContents').text(json);
    document.getElementById('downloadDatabaseAsJSON').href="data:text/json," + JSON.stringify(data);
    document.getElementById('downloadDatabaseAsJSON').download = 'timex_db.jsn';
}

$(document).off('click', '#postPlanningStashButton').on('click', '#postPlanningStashButton', function(){
    readAllData(writeToBackup);
});
$(document).off('click', '#getPlanningStashButton').on('click', '#getPlanningStashButton', function(){
    var r = confirm("Import backup? (This may replace current records.)");
    if (r == true) 
    {    
        importFromBackup();
    }
});

$(document).off('click', '#exportDataButton').on('click', '#exportDataButton', function(){
    readAllData(createJSONExport);
});

$(document).off('click', '#importDataButton').on('click', '#importDataButton', function(){
    var files = document.getElementById('importDataFile').files;
    if (!files[0]) return;
    var reader = new FileReader();
    file = files[0];
    reader.onload = function(e)
    {
        jsonString = reader.result;
        try {
            json = JSON.parse(jsonString)
        }
        catch (e) {
            console.log('Could not parse input data as JSON: ' + e)
            alert('Import failed. Error when parsing JSON input data:\n' + e);
            return;
        }
        console.log('Parsed JSON successfully')
        
        var numRecords = importData(json);
        console.log('Imported ' + numRecords + ' records into the database.');
        alert('Imported ' + numRecords + " day(s) into the database.");
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
