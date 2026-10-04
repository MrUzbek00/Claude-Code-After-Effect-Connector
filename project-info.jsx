(function () {
    var project = app.project;
    var compositions = [];
    if (project) {
        for (var i = 1; i <= project.numItems; i++) {
            var item = project.item(i);
            if (item instanceof CompItem) {
                compositions.push({id: item.id, name: item.name, width: item.width,
                    height: item.height, duration: item.duration, frameRate: item.frameRate,
                    layers: item.numLayers});
            }
        }
    }
    return {application: "Adobe After Effects", version: app.version,
        projectPath: project && project.file ? project.file.fsName : null,
        itemCount: project ? project.numItems : 0,
        activeItem: project && project.activeItem ? project.activeItem.name : null,
        compositions: compositions};
}());
