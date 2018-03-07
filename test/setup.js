import log from 'loglevel';

// NOTE: Mocha discourages use of ES6 arrow functions
// See https://mochajs.org/#arrow-functions
// and https://github.com/mochajs/mocha/issues/2018

before(function() {
  log.setLevel('info');
})
