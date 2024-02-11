import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { ProcessLogsEvent } from './logs.events';
import { join } from 'path';
import { readFile, readdir, unlink, writeFile } from 'fs/promises';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { LOGS_QUEUE } from './logs.token';

@Injectable()
export class LogsListener {
    private readonly logsDirectory: string;
    constructor(@InjectQueue(LOGS_QUEUE) private queue: Queue) {
        this.logsDirectory = join(process.cwd(), 'logs');
    }

    /**
     * Gets filename contains date then returns date in filename
     * @param fileName filename contains date format
     * @returns Date object
     */
    getDateFromFileName(fileName: string) {
        const matches = fileName.match(/\d{4}-\d{2}-\d{2}/); // Match YYYY-MM-DD pattern
        if (!matches) return 0; // Return 0 if date not found or invalid
        const dateString = matches[0];
        return new Date(dateString).getTime(); // Convert date string to milliseconds since epoch
    }

    /**
     * Reads files and sort them ascending then return oldest filename
     */
    async readOldestFile() {
        let files = await readdir(this.logsDirectory);
        if (files.length === 0) return;
        files = files.sort((a, b) => this.getDateFromFileName(a) - this.getDateFromFileName(b)); // sort files ascending
        return files.at(0);
    }




    /**
     * This function gets filename then read this file,
     * after that it writes to file lines that it didnt read
     */
    async spliceLines(file: string, linesCount: number, delimiter: string = '\n') {
        const targetFile = join(this.logsDirectory, file);
        const content = await readFile(targetFile, { encoding: 'utf-8', flag: 'rs+' });
        let lines: string[];
        if (content.length === 0) {
            // delete file
            await unlink(targetFile);
            return;
        }

        // separate lines
        const linesContent = content.split(delimiter);

        // handle if file contains lines less than count passed
        if (linesContent.length < linesCount) linesCount = linesContent.length;

        // replace content with none
        lines = linesContent.splice(0, linesCount);

        // // join lines
        const newContent = linesContent.join(delimiter);

        // // write new content to file
        await writeFile(targetFile, newContent, { encoding: 'utf-8' });

        return { lines };
    }

    @OnEvent(ProcessLogsEvent, { async: true })
    async processLogs() {
        // read oldest log file
        const filename = await this.readOldestFile(); // oldest file name
        if (!filename) return; // circuit breaker for event chaining
        // read first 100 lines of content
        const { lines } = await this.spliceLines(filename, 100);
        if (!lines) return;
        // ship these linses to queue
        this.queue.add('log', { lines });
    }

}