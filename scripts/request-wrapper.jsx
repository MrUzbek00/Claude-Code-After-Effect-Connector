// Template populated by Invoke-AfterEffects.ps1. Do not run this file directly.
(function () {
    function quote(s) {
        return '"' + String(s).replace(/[\\"\x00-\x1f]/g, function (c) {
            if (c === '"') return '\\"';
            if (c === '\\') return '\\\\';
            return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4);
        }) + '"';
    }
    function encode(v, stack) {
        if (v === null || typeof v === 'undefined') return 'null';
        if (typeof v === 'string') return quote(v);
        if (typeof v === 'boolean') return String(v);
        if (typeof v === 'number') return isFinite(v) ? String(v) : 'null';
        if (typeof v !== 'object') throw new Error('Return plain JSON-compatible data.');
        if (stack.length > 50) throw new Error('Result nesting is too deep.');
        var parts = [], k;
        for (k = 0; k < stack.length; k++) if (stack[k] === v) throw new Error('Result contains a circular reference.');
        stack.push(v);
        if (v instanceof Array) {
            for (k = 0; k < v.length; k++) parts.push(encode(v[k], stack));
            stack.pop();
            return '[' + parts.join(',') + ']';
        }
        for (k in v) if (Object.prototype.hasOwnProperty.call(v, k)) parts.push(quote(k) + ':' + encode(v[k], stack));
        stack.pop();
        return '{' + parts.join(',') + '}';
    }
    var result, serialized;
    try {
        if (app.preferences.getPrefAsLong('Main Pref Section', 'Pref_SCRIPTING_FILE_NETWORK_SECURITY') !== 1) throw new Error('Enable Allow Scripts to Write Files and Access Network.');
        result = {ok: true, requestId: __REQUEST_ID__, data: $.evalFile(new File(__SOURCE__))};
        serialized = encode(result, []);
    } catch (e) {
        serialized = encode({ok: false, requestId: __REQUEST_ID__, error: String(e), line: e.line || null}, []);
    }
    var output = new File(__RESPONSE__ + '.tmp');
    output.encoding = 'UTF-8';
    if (!output.open('w')) throw new Error('Cannot open response: ' + output.error);
    output.write(serialized);
    output.close();
    var target = new File(__RESPONSE__);
    if (!output.rename(target.name)) throw new Error('Cannot publish response: ' + output.error);
}());
