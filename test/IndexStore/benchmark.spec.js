import { expect } from 'chai';
import log from 'loglevel';
import Benchmark from 'benchmark';
import faker from 'faker';

import IndexStore from '../../src/IndexStore';

describe('Benchmarking IndexStore', function() {
  // 5 minutes
  this.timeout(300 * 1000);

  it('is fast?', function() {
    let t0;
    let t1;

    // Generate records of "firstName lastName"

    t0 = Date.now();
    const recordCount = 100000;
    let records = [];
    for(let i = 0; i < recordCount; i++) {
      records.push(faker.fake('{{name.firstName}} {{name.lastName}}'));
    }
    t1 = Date.now();
    log.info(`${records.length} records created in ${t1-t0}ms`);

    // Index the records

    t0 = Date.now();
    const store = new IndexStore();
    records.forEach((record) => {
      store.add(record);
    });
    t1 = Date.now();
    log.info(`Indexing took ${t1-t0}ms`);

    // Generate 3-6 letter queries based on probable known names

    t0 = Date.now();
    const queries = [];
    const queryCount = 1000;
    for(let i = 0; i < queryCount; i++) {
      const untruncatedQuery = faker.fake('{{name.firstName}} {{name.firstName}}')
      // Random integer between 0-3 (inclusive)
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random
      const querySecondHalfLength = Math.floor(Math.random() * Math.floor(4));
      const queryLength = 3 + querySecondHalfLength;
      const query = untruncatedQuery.substring(0, queryLength);
      //log.info(`queryLength: ${queryLength}, untrunctaedQuery: ${untruncatedQuery}, query: ${query}`);
      queries.push(query);
    }
    t1 = Date.now();
    log.info(`${queries.length} queries created in ${t1-t0}ms`);
    log.info(`Quality check - Displaying 10 queries with top 10 results:`);
    queries.slice(0, 10).forEach((query) => {
      log.info("\t" + `query: ${query}`);
      const results = store.search(query);
      log.info("\t\t" + `${results.length} results`);
      results.slice(0, 10).forEach((result, i) => {
        log.info("\t\t" + `${i + 1}. ${result}`);
      });
    });

    // Run the queries, save the times

    log.info(`Benchmarking - Running ${queries.length} queries`);
    t0 = Date.now();
    const stats = [];
    queries.forEach((query, i) => {
      const queryt0 = Date.now();
      const results = store.search(query);
      const queryt1 = Date.now();
      stats.push({
        query,
        responseTime: queryt1 - queryt0,
        resultsLength: results.length,
      });
      if (i % 100 === 0) {
        log.info(`Completed ${i} queries`);
      }
    });
    t1 = Date.now();
    log.info(`${stats.length} queries executed in ${t1-t0}ms`)

    // Summarize the stats

    let responseTimeSum = 0;
    let resultsLengthSum = 0;
    stats.forEach((stat) => {
      responseTimeSum += stat.responseTime;
      resultsLengthSum += stat.resultsLength;
    });
    const averageResponseTime = responseTimeSum / stats.length;
    const averageResultsLength = resultsLengthSum / stats.length;
    log.info(`Average response time across ${stats.length} queries: ${averageResponseTime}`)
    log.info(`Average results length across ${stats.length} queries: ${averageResultsLength}`)
  });
});
