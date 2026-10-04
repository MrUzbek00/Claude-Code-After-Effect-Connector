// Adds a centered white text layer to the active composition (one undo step).
(function () {
    var comp = app.project ? app.project.activeItem : null;
    if (!(comp instanceof CompItem)) return {changed: false, message: 'Select a composition first.'};
    var layer;
    app.beginUndoGroup('Claude: add title');
    try {
        layer = comp.layers.addText('Hello from Claude');
        var sourceText = layer.property('ADBE Text Properties').property('ADBE Text Document');
        var doc = sourceText.value;
        doc.fontSize = 96;
        doc.fillColor = [1, 1, 1];
        doc.justification = ParagraphJustification.CENTER_JUSTIFY;
        sourceText.setValue(doc);
        layer.property('ADBE Transform Group').property('ADBE Position').setValue([comp.width / 2, comp.height / 2]);
    } finally {
        app.endUndoGroup();
    }
    return {changed: true, layer: layer.name, index: layer.index};
}());
