// This // implements find-mode query history as a list of raw queries, most recent first.
// This is under lib/ since it is used by both content scripts and iframes from pages/.

const StorageDevice = (storage = chrome.storage.local, type, key, max = 50, ...fns) => ({
  storage,
  key,
  baseKey: key,
  incogKey: `${key}Incognito`,
  max,
  rawList: null,
  async init() {
    this.isIncognitoMode = chrome.extension.inIncognitoContext;

    if (!this.rawList) {
      if (this.isIncognitoMode) this.key = this.incogKey; 

      let result = await this.storage.get([this.key]);
      if (this.isIncognitoMode) {
        // This is the first incognito tab, so we need to initialize the incognito-mode query
        // history.
        result = await this.storage.get([this.baseKey]);
        this.rawList = result[this.baseKey] || [];
        this.storage.set({ [this.incogKey]: this.rawList });
      } else {
        this.rawList = result[this.key] || [];
      }
      if (type === 'obj') this.rawList = Object.fromEntries(this.rawList);
    }

    chrome.storage.onChanged.addListener((changes, _area) => {
      if (changes[this.key]) {
        this.rawList = type === 'obj' ? Object.fromEntries(changes[this.key].newValue) : changes[this.key].newValue;
      }
    });
  },
  ...Object.fromEntries(fns.map(fn => [fn.name, fn])),
  get(index) { return this.rawList[index] ?? ''; },
  set(index, val) { return this.rawList[index] = val; },
  remove(index) { return delete this.rawList[index]; },
  async save() {
    await this.storage.set({ [this.key]: Object.entries(this.rawList) });
    if (!this.isIncognitoMode) {
      const result = await this.storage.get([this.incogKey]);
      if (result[this.incogKey]) {
        await this.storage.set({ [this.incogKey]: result[this.incogKey] });
      }
    }
  }
});

const HistoryStorageDevice = (key) => StorageDevice(void 0, void 0, key, void 0,
  function getQuery(index) { return this.get(index ?? 0); },
  async function saveQuery(query) {
    if (!query.length) return;
    this.rawList = this.refreshRawQueryList(query, this.rawList);
    await this.storage.set({ [this.key]: this.rawList });
    // If there are any active incognito-mode tabs, then propagate this query to those tabs too.
    if (!this.isIncognitoMode) {
      const result = await this.storage.get([this.incogKey]);
      if (result[this.incogKey]) {
        await this.storage.set({
          [this.incogKey]: this.refreshRawQueryList(query, result[this.incogKey])
        });
      }
    }
  },
  function refreshRawQueryList(query, rawList) {
    return ([query].concat(rawList.filter((q) => q !== query))).slice(0, this.max + 1);
  });

const FindModeHistory = HistoryStorageDevice('findModeRawQueryList');
const CommandModeHistory = HistoryStorageDevice('commandModeRawQueryList'); 
const CommandSet = StorageDevice(chrome.storage.sync, 'obj', 'commandSetRawList', 1000);

window.FindModeHistory = FindModeHistory;
window.CommandModeHistory = CommandModeHistory;
window.CommandSet = CommandSet;
