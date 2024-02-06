import { Process, Processor } from "@nestjs/bull";


@Processor('logs-queue')
export class LogsProcessor {

    @Process('namedjob')
    async processNamedJob(job: any): Promise<any> {
        // do something with job and job.data
    }
}