const Collector = require('./base');

class PreCollector extends Collector {
    constructor(metaCollector) {
        super();
        this._metaData = metaCollector.getAllMetaData();
        this._ffmpegOptions = [];
        this._shouldDelete = false;
        this._container = null;
    }

    getMetaData() {
        return this._clone(this._metaData);
    }

    shouldDelete() {
        return this._shouldDelete;
    }

    getFfmpegOptions() {
        return this._clone(this._ffmpegOptions);
    }

    setDelete() {
        this._shouldDelete = true;
    }

    appendFfmpegOptions(options) {
        if (!Array.isArray(options)) {
            options = [options];
        }
        this._ffmpegOptions.push(options);
    }

    setContainer(container) {
        this._container = container;
    }

    getContainer() {
        return this._container;
    }
}

module.exports = PreCollector;
