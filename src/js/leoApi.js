/* globals fetch */

const emptyFilter = () => true

export default class LeoApi {
  constructor (token) {
    this.token = token
  }

  _request (api, requestData, method = 'POST') {
    return fetch(`https://mobile-api.lingualeo.com/${api}`,
      {
        method,
        headers: {
          'Content-Type': 'text/plain'
        },
        mode: 'cors',
        body: JSON.stringify({
          apiVersion: '1.0.1',
          token: this.token,
          api_call: api,
          ...requestData
        })
      })
      .then(response => response.text())
      .then(rsp => {
        return JSON.parse(rsp).data
      })
  }

  getWordSets () {
    return this._request('GetWordSets', { request: [{ type: 'user', perPage: 500 }] })
  }

  getWordCount (groupId) {
    return this.getWordSets().then(wordSets => {
      const wordSet = wordSets[0].items.filter(g => g.id === groupId)[0]
      return wordSet.cw || wordSet.countWords
    })
  }

  _requestWords (wordSetId, leoFilter, totalWords, filter, progressHandler, page, result) {
    return this._request('GetWords', {
      ...leoFilter,
      attrList: {
        id: 'id',
        wordValue: 'wd',
        wordSets: 'ws',
        translations: 'trs',
        learningStatus: 'ls',
        progress: 'pi',
        transcription: 'scr',
        pronunciation: 'pron'
      },
      mode: "basic",
      training: null,
      wordSetId: wordSetId,
      perPage: 300,
      dateGroup: page.dataGroup,
      offset: page.wordId ? { wordId: page.wordId } : undefined,
    }).then((data) => {
      if (data.length === 0) return result
      const groupsWithWords = data.filter(g => g.words)
      
      let currentGroup = groupsWithWords.length 
        ? groupsWithWords[groupsWithWords.length - 1].groupName
        : page.dataGroup

      const words = groupsWithWords.map(g => g.words).flat().filter(filter || emptyFilter)

      console.log(page.dataGroup, page.wordId, words.length, currentGroup);
      if (words.length) console.log(
        words[0].wordValue, 
        words[words.length - 1].wordValue
      );
      result = result.concat(words)
      progressHandler && progressHandler(result.length)
      
      const currentGroupIndex = data.findIndex(e => e.groupName === currentGroup)

      if (
        (currentGroupIndex === data.length - 1 && !words.length)
        || result.length >= totalWords
      ) {
        return result
      }

      const nextGroupIndex = currentGroupIndex === data.length - 1 || words.length
        ? currentGroupIndex
        : currentGroupIndex + 1

      page = { 
        dataGroup: data[nextGroupIndex].groupName, 
        wordId: words.length ? words[words.length - 1].id : undefined
      }
      return this._requestWords(wordSetId, leoFilter, totalWords, filter, progressHandler, page, result)
    })
  }

  getWords (wordSetId, leoFilter, totalWords, filter, progressHandler) {
    const page = {
        dataGroup: 'start'
    }
    return this._requestWords(wordSetId, leoFilter, totalWords, filter, progressHandler, page, [])
  }
}
