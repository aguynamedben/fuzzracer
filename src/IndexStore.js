/**
   @jeancroy's development notes
   Original: https://gist.github.com/jeancroy/9187627975a2632a8f8e4aaae17d358e

   ### Equivalence with Indel / transpose
   - query => candidate.

   #### How to deal with insert ?
   - query => querya
   - Match 3o5, 3o6
   - querya => queryab
   - Handled by prefix cut, addition are free after 6th of candidate
   - quer => query
   - Match 2o4, 2o4 (at index time, multiple XoY are computed 3o5,2o4)
   - que => query
   - Match 2o3, 2o4

   #### How to deal with delete ?
   - querA => quer
   - Match 3o5, 3o4 (at index time 4 char get both 2o4 and 3o4)
   - queryA => query
   - Match 3o6, 3o5
   - queryAB => query
   - Match 3o6, 3o5, delete free after 6th of query.
   - quer => que
   - Match 2o4, 2o3
 */

class IdAndCount {
  constructor(id, count) {
    this.id = id;
    this.count = count;
  }
}

export default class IndexStore {
  constructor() {
    // Main structure
    // Format is dict key => array of item indices
    this.indicesForKey = {};

    // List of indexed items.
    this.items = [];

    // Helper to prevent duplicate on items.
    this.itemDict = {};
  }

  // Add an item to the index
  // eg:
  //   store.add( "text" )
  //   store.add( item, x => x.keyToIndex )
  add(item, accessor) {
    // get text value
    var str = (accessor == null) ? item : accessor(item);

    // Already in index
    if (str in this.itemDict)
      return;

    // Nothing to index ?
    var keyList = IndexStore.computeIndexKeys(str);
    if (keyList.length == 0) return;

    // Add to indexed items
    var idx = this.items.length;
    this.items.push(item);
    this.itemDict[str] = true;

    // notify all computed keys that we exist.
    this.registerItem(idx, keyList);
  }

  // This exist to prepare "Hook" variant.
  registerItem(idx, keyList) {
    // register idx on all appropriate key
    for (var i = 0; i < keyList.length; i++) {
      var key = keyList[i];

      if (key in this.indicesForKey) {
        // append to existing array of index
        this.indicesForKey[key].push(idx);
      }
      else {
        // Format is dict key => array of item index
        this.indicesForKey[key] = [idx];
      }
    }
  }

  // Find entries that match using 3 out of 5 strategy. (or appropriate fallback)
  // Entry that match more "subset of 3" keys are returned first.
  search(str) {
    // Compute positive results
    var keys = IndexStore.computeSearchKeys(str);
    var tmp = this._search(keys);
    var items = this.items;

    return tmp.map(function (x) {
      return items[x.id];
      // return items[x.id] + " - " + x.count; // debug output
    });
  }

  // This exist to prepare Hook variant.
  // Input computed keys and output list of IdAndCount.
  _search(keys) {
    // Compute positive results
    var outList = this.retrieveCount(keys);

    // Minimum quality: half as best
    if (outList.length > 1) {
      var tresh = outList[0].count * 0.5;
      outList = outList.filter(function (x) {
        return x.count > tresh
      })
    }

    return outList;
  }

  retrieveCount(keys) {
    // Dictionary idx => count
    var countPerIndex = {};

    if (keys.length == 0)
      return countPerIndex;

    for (var i = 0; i < keys.length; i++) {

      var key = keys[i];

      // Does the key exist in the index ?
      if (key in this.indicesForKey) {

        // If so add every entry of that key into countPerIndex
        // Also for each entry, maintain a count of matched keys.

        var idxList = this.indicesForKey[key];
        for (var j = 0; j < idxList.length; j++) {

          var idx = idxList[j];

          if (idx in countPerIndex) {
            countPerIndex[idx]++;
          } else {
            countPerIndex[idx] = 1;
          }
        }

      }
    }

    // Transform countPerIndex into a sorted list of IdAndCount

    var outList = [];

    for (var id in countPerIndex) {
      if (countPerIndex.hasOwnProperty(id)) {
        outList.push(new IdAndCount(id, countPerIndex[id]));
      }
    }

    // Custom sort decreasing order
    outList = outList.sort(function (a, b) {
      return b.count - a.count
    });

    return outList;
  }

  // Split string in words
  // And get keys for each of them.
  static computeIndexKeys(str) {
    var keysList = [];
    var words = str.split(" ");

    var existingDict = {};
    for (var i = 0; i < words.length; i++) {
      var word = words[i].toLowerCase();
      if (word.length < 3) continue;
      IndexStore._computeIndexKeysFromWord(word, keysList, existingDict)
    }

    return keysList;
  }

  static computeSearchKeys(str) {
    var keysList = [];
    var words = str.split(" ");

    for (var i = 0; i < words.length; i++) {
      var word = words[i].toLowerCase();

      // Either:
      // Use same strategy as index building
      // That is 3oY and 2oY and 1o1
      // (slower, better score quality).
      IndexStore._computeIndexKeysFromWord(word, keysList, {});

      // Or:
      // use a single strategy as character permit.
      // Single XoY (lower search cost)
      // IndexStore._computeSearchKeysFromWord(word, keysList, {})

    }

    return keysList;
  }


  /**
   * Private Helpers
   */


  //
  // Keys during index
  // compute either 3o6, 3o5, 3o4 or 3o3 as available (note that 3o6 include all 3o5 keys)
  // compute either 2o4, 2o3 or 2o2 as available. (note that 2o4 include all 2o3 keys)
  // compute 1o1 (first letter index)
  //
  static _computeIndexKeysFromWord(word, keysList, existingDict) {
    var len = word.length;
    if (len == 0) return;

    if (len >= 3) {
      // 3o6, 3o5, 3o4, 3o3
      IndexStore._select3(word, 6, keysList, existingDict)
    }

    if (len >= 2) {
      // 2o4, 2o3,2o2
      IndexStore._select2(word, 4, keysList, existingDict)
    }

    // 1o1 strategy: This index by first letter
    IndexStore._append(word[0], keysList, existingDict);
  }

  //
  // Keys during search
  // compute a single variation from maximum characters available
  // 3o6, 3o5, 2o4, 2o3, 2o2, 1o1
  //
  // alternatively use same strategy as index.
  // I'm not totally fixed as that.
  //
  // also note that we "cheat" a bit to help transition between key size
  // ie include 3o3 with the 2oY
  static _computeSearchKeysFromWord(word, keysList, existingDict) {
    var len = word.length;
    if (len == 0) return;

    // Include 3oY if we have at least 3 letters.
    if (len >= 3) {
      // 3o6, 3o5, 3o4, 3o3
      IndexStore._select3(word, 6, keysList, existingDict);
    }

    // Include 2oY if we have 4 or less.
    if (len <= 4) {
      // 2o4, 2o3, 2o2
      IndexStore._select2(word, 4, keysList, existingDict);

      // Include 1o1 at 2 or below
      if (len <= 2) {
        IndexStore._append(word[0], keysList, existingDict);
      }
    }
  }

  static _select2(str, maxlen, existingList, existingDict) {
    var len = Math.min(str.length, maxlen);
    for (var i = 0; i < len - 1; i++) {
      for (var j = i + 1; j < len; j++) {
        IndexStore._append(str[i] + str[j], existingList, existingDict)
      }
    }
    return existingList;
  }

  static _select3(str, maxlen, existingList, existingDict) {
    var len = Math.min(str.length, maxlen);
    for (var i = 0; i < len - 2; i++) {
      for (var j = i + 1; j < len - 1; j++) {
        for (var k = j + 1; k < len; k++) {
          IndexStore._append(str[i] + str[j] + str[k], existingList, existingDict)
        }
      }
    }
    return existingList;
  }

  static _append(word, existingList, existingDict) {
    if (!(word in existingDict)) {
      existingDict[word] = true;
      existingList.push(word);
    }
  }
}
