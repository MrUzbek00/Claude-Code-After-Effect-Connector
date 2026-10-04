(function () {
    var item = app.project ? app.project.activeItem : null;
    if (!(item instanceof CompItem)) return {composition: null, message: 'Select a composition first.'};
    var layers = [];
    for (var i = 1; i <= item.numLayers; i++) {
        var layer = item.layer(i);
        layers.push({index: layer.index, name: layer.name, enabled: layer.enabled});
    }
    return {id: item.id, name: item.name, width: item.width, height: item.height,
        duration: item.duration, frameRate: item.frameRate, layers: layers};
}());
