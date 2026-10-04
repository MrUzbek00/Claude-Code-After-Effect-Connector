// Keyframes a 0.5 second opacity fade-in at the in-point of each selected layer (one undo step).
(function () {
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem)) return {changed: false, message: 'Select a composition first.'};
    var layers = comp.selectedLayers;
    if (!layers.length) return {changed: false, message: 'Select one or more layers first.'};
    var seconds = 0.5, faded = [];
    app.beginUndoGroup('Claude: fade in');
    try {
        for (var i = 0; i < layers.length; i++) {
            var opacity = layers[i].property('ADBE Transform Group').property('ADBE Opacity');
            opacity.setValueAtTime(layers[i].inPoint, 0);
            opacity.setValueAtTime(layers[i].inPoint + seconds, 100);
            faded.push(layers[i].name);
        }
    } finally {
        app.endUndoGroup();
    }
    return {changed: true, fadedIn: faded, seconds: seconds};
}());
