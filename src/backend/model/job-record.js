const JobState = require('./job-state');

class JobRecord {
    constructor(record) {
        this.jobId = record.id;
        this.state = record.state;
        this.file = record.file;
        this.lastRun = record.lastRun;
        this.lastSuccess = record.lastSuccess;
        this.lastFailure = record.lastFailure;
        this.runCount = record.runCount;
        this.plugins = record.plugins || {};
    }

    getJobId() {
        return this.jobId;
    }

    getFile() {
        return this.file;
    }

    getState() {
        return this.state;
    }

    getLastRun() {
        return this.lastRun;
    }

    getLastSuccess() {
        return this.lastSuccess;
    }

    getLastFailure() {
        return this.lastFailure;
    }

    getRunCount() {
        return this.runCount;
    }

    getPluginStatus() {
        return this.plugins;
    }

    isAborted() {
        return this.state === JobState.ABORT;
    }

    async __applyUpdatedState(record, plugins) {
        for (let key in record) {
            this[key] = record[key];
        }

        this.plugins = Object.assign(this.plugins, plugins);
    }

    toString() {
        return this.getJobId();
    }
}

module.exports = JobRecord;
