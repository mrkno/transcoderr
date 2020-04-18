const EventEmitter = require('events');
const JobRecord = require('../model/job-record');
const JobState = require('../model/job-state');
const JobPluginState = require('../model/job-plugin-state');

class JobsService extends EventEmitter {
    constructor(databaseService) {
        super();
        this._databaseService = databaseService;
    }

    async updatePluginExecutionState(job, pluginId, jobState, state, context) {
        const result = await this._databaseService.run(`
            INSERT INTO JobExecutions (jobId, pluginId, jobState, state, context)
            VALUES (:jobId, :pluginId, :jobState, :state, :context)
            ON CONFLICT (jobId, pluginId) DO UPDATE SET
            state = :state,
            context = :context
            WHERE jobId = :jobId AND pluginId = :pluginId
        `, {
            ':jobId': job.getJobId(),
            ':pluginId': pluginId,
            ':jobState': jobState,
            ':state': state,
            ':context': context || null
        });

        LOG.warn(result);

        job.__applyUpdatedState({}, {
            [pluginId]: {
                state,
                context
            }
        });

        if (state === JobPluginState.FAILED || state === JobPluginState.UNKNOWN) {
            LOG.error(`Job ${job.getJobId()} - ${pluginId}:${jobState} changed state to '${state}'${context ? ' - ' + context.stack || context : ''}`);
        }
        else {
            LOG.info(`Job ${job.getJobId()} - ${pluginId}:${jobState} changed state to '${state}'`);
        }

        this.emit('job-updated', {
            job,
            changeType: 'job-plugin-state',
            changeDiff: {
                pluginId,
                jobState,
                state,
                context
            }
        });

        return job;
    }

    async updateJobState(job, newState) {
        if (job.getState() === newState || (job.getState().isFinalState() && newState.isFinalState())) {
            return;
        }

        const changes = {
            state: newState
        };
        if (job.getState().isFinalState() && !changes.state.isFinalState()) {
            changes.runCount = job.getRunCount() + 1;
            changes.lastRun = new Date();
        } else if (!job.getState().isFinalState() && changes.state.isFinalState()) {
            if (changes.state.isFailureState()) {
                changes.lastFailure = job.getLastRun();
            } else {
                changes.lastSuccess = job.getLastRun();
            }
        }

        const setKeys = Object.keys(changes)
            .map(key => `${key} = :${key}`)
            .join(', ');
        const setValues = Object.keys(changes)
            .reduce((acc, curr) => (acc[':' + curr] = changes[curr], acc), {});
        setValues[':jobId'] = job.getJobId();

        await this._databaseService.run(`
                UPDATE Job
                SET ${setKeys}
                WHERE id = :jobId
            `, setValues);

        if (newState === JobState.ABORT) {
            LOG.info(`Job ${job.getJobId()} was aborted.`);
        }
        else {
            LOG.info(`Job ${job.getJobId()} changed to state ${newState}.`);
        }

        this.emit('job-updated', {
            job,
            changeType: 'job-state',
            changeDiff: changes
        });

        job.__applyUpdatedState(changes, {});

        return job;
    }

    async getJobs(files) {
        const existingJobs = await this._getExistingJobs(files);

        const existingJobsMap = existingJobs.reduce((acc, curr) => (acc[curr.getFile()] = curr, acc), {});
        const newJobs = await this._createNewJobs(files.filter(file => !existingJobsMap[file]));

        return existingJobs.concat(newJobs);;
    }

    async _getExistingJobs(files) {
        const jobs = await (!!files ? this._databaseService.all(`SELECT * FROM Job WHERE file IN (:files)`, {
                ':files': files
            }) : this._databaseService.all(`SELECT * FROM Job`));
        return jobs.map(job => this._toJobRecord(job));
    }

    async _createNewJobs(files) {
        return await Promise.all(files.map(file => this._createNewJob(file)));
    }

    async _createNewJob(file) {
        const result = await this._databaseService.run(`INSERT INTO Job
            (state, file, runCount)
            VALUES (?, ?, ?)`, [
                'new',
                file,
                0
            ]);
        
        const job = this._toJobRecord({
            id: result.lastID,
            state: 'new',
            file,
            runCount: 0,
            lastRun: null,
            lastSuccess: null,
            lastFailure: null
        });

        LOG.info(`New job ${job} created`);
        this.emit('new-job', job);

        return job;
    }

    _toJobRecord(record) {
        record.state = JobState.from(record.state);
        record.lastRun = !!record.lastRun ? new Date(record.lastRun) : null;
        record.lastSuccess = !!record.lastSuccess ? new Date(record.lastSuccess) : null;
        record.lastFailure = !!record.lastFailure ? new Date(record.lastFailure) : null;
        return new JobRecord(record);
    }
}

module.exports = JobsService;
