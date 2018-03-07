import { expect } from 'chai';
import log from 'loglevel';

import IndexStore from '../../src/IndexStore';

describe('IndexStore', function() {
  describe('static methods', function() {
    describe('IndexStore._select3', function() {
      it('returns values', function() {
        const helloResult = IndexStore._select3('hello', Infinity, [], {});
        const expectedHelloResult = ['hel', 'heo', 'hll', 'hlo', 'ell', 'elo', 'llo'];
        expect(helloResult).to.eql(expectedHelloResult);
        //log.info(helloResult);

        const hillsResult = IndexStore._select3('hills', Infinity, [], {});
        const expectedHillsResult = ['hil', 'his', 'hll', 'hls', 'ill', 'ils', 'lls'];
        expect(hillsResult).to.eql(expectedHillsResult);
        //log.info(hillsResult);

        const jelloResult = IndexStore._select3('jello', Infinity, [], {});
        const expectedJelloResult = ['jel', 'jeo', 'jll', 'jlo', 'ell', 'elo', 'llo'];
        expect(jelloResult).to.eql(expectedJelloResult);
        //log.info(jelloResult);
      });
    });
  });

  context('with items indexed', function() {
    let store;

    beforeEach(function() {
      store = new IndexStore();
      store.add("hello");
      store.add("cello");
      store.add("shall");
      store.add("shill");
      store.add("chill");
      store.add("hills");
      store.add("hells");
    });

    it('adds items to indiciesForKey correctly', function() {
      //log.info(store.indicesForKey);

      expect(store.indicesForKey.hil).to.eql([3, 4, 5]);
      expect(store.indicesForKey.chi).to.eql([4]);
      expect(store.indicesForKey.lls).to.eql([5, 6]);
    });

    it('allow searching', function() {
      expect(store.search('shill')).to.eql(['shill']);

      expect(store.search('shell')).to.eql(['shall', 'shill', 'hello', 'hells']);

      expect(store.search('jello')).to.eql(['hello', 'cello', 'hells']);

      expect(store.search('holy')).to.eql(['hello', 'hills', 'hells']);

      expect(store.search('hi')).to.eql(['hills']);

      expect(store.search('hil')).to.eql(['hills', 'shill', 'chill']);

      expect(store.search('hll')).to.eql(['hello', 'hills', 'hells']);

      expect(store.search('hill')).to.eql(['hills', 'shill', 'chill']);
    });
  });
});
