// Run once per After Effects session using File > Scripts > Run Script File.
(function () {
    var root = new File($.fileName).parent.fsName;
    var runtime = new Folder(root + '/local');
    var inbox = new Folder(root + '/local/inbox');
    var requests = new Folder(root + '/local/requests');
    if (app.preferences.getPrefAsLong('Main Pref Section', 'Pref_SCRIPTING_FILE_NETWORK_SECURITY') !== 1) {
        alert('Enable Allow Scripts to Write Files and Access Network in Scripting & Expressions preferences first.');
        return;
    }
    if ((!runtime.exists && !runtime.create()) || (!inbox.exists && !inbox.create()) || (!requests.exists && !requests.create())) {
        alert('Cannot create the Claude bridge local folders. Keep the project in a writable private folder.');
        return;
    }
    if (inbox.getFiles('*.jsx').length || inbox.getFiles('*.running').length) {
        alert('Unresolved bridge requests exist in local/inbox. Inspect project state and saved results before restarting. See docs/TROUBLESHOOTING.md.');
        return;
    }
    var previous = $.global.__claudeAEBridge;
    if (previous && previous.task !== null) app.cancelTask(previous.task);
    if (previous && previous.root) {
        var oldHeartbeat = new File(previous.root + '/local/heartbeat.txt');
        if (oldHeartbeat.exists) oldHeartbeat.remove();
    }
    $.global.__claudeAEBridge = {
        root: root,
        task: null,
        ticks: 0,
        tick: function () {
            var state = $.global.__claudeAEBridge;
            if (!state) return;
            if ((state.ticks++ % 10) === 0) {
                var heartbeat = new File(root + '/local/heartbeat.txt');
                if (heartbeat.open('w')) {
                    heartbeat.write(String(new Date().getTime()));
                    heartbeat.close();
                }
            }
            var files = inbox.getFiles('*.jsx');
            for (var i = 0; i < files.length; i++) {
                var job = files[i];
                if (!job.rename(job.name + '.running')) continue;
                try { $.evalFile(job); }
                catch (error) { $.writeln('Claude bridge: ' + error.toString()); }
                job.rename(job.name + '.done');
            }
        }
    };
    $.global.__claudeAEBridge.tick();
    $.global.__claudeAEBridge.task = app.scheduleTask('$.global.__claudeAEBridge.tick()', 500, true);
}());
