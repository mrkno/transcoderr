const Script = require('./base');

class FileScript extends Script {
    constructor(fileLocation, fileName) {
        super();
        this._fileLocation = fileLocation;
        this._fileName = fileName;
        this._checksum = null;
    }

    async getScriptInfo() {
        const script = await this.getScript();
        const descriptor = Object.assign({
            name: this._fileName,
            description: '',
            version: -1,
            types: []
        }, script.describe());
        descriptor.types = this.__convertToScriptType(descriptor.types);

        return descriptor;
    }

    async getScript() {
        return await this.__getScript(this._fileLocation, this._fileName);
    }

    async __shouldInvalidate() {
        const checksum = await this.__checksumFile(this._fileLocation);
        if (checksum !== this._checksum) {
            this._checksum = checksum;
            return true;
        }
        return false;
    }
}

module.exports = FileScript;
